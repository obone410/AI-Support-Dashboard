import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

const maxRequestBodyBytes = 32_000;
const maxAssistantOutputTokens = 700;

function createServerSupabaseClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });
}

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000)
});

const ticketSchema = z
  .object({
    id: z.string().max(120),
    subject: z.string().max(200),
    customer: z.string().max(120),
    category: z.string().max(80),
    priority: z.string().max(40),
    status: z.string().max(40),
    description: z.string().max(2000),
    sentiment: z.string().max(40)
  })
  .optional();

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
  ticket: ticketSchema
});

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const requestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `req-${requestStartedAt}`;
  const limit = rateLimit(`ai-support:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60_000
  });
  const headers = {
    ...noStoreHeaders,
    ...limit.headers
  };
  const contentLength = Number(request.headers.get("content-length") ?? 0);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many AI support requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(limit.retryAfter)
        }
      }
    );
  }

  if (contentLength > maxRequestBodyBytes) {
    return NextResponse.json(
      { error: "AI support request is too large." },
      { status: 413, headers }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid support assistant request." },
      { status: 400, headers }
    );
  }

  const { messages, ticket } = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY;
  const authHeader = request.headers.get("authorization");
  const requiresAuth = process.env.REQUIRE_AI_AUTH === "true";
  let authenticatedUserId: string | null = null;
  let bearerToken = "";

  if (requiresAuth) {
    bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!bearerToken) {
      return NextResponse.json(
        { error: "Authentication is required for AI support requests." },
        { status: 401, headers }
      );
    }

    const authClient = createServerSupabaseClient();

    if (!authClient) {
      return NextResponse.json(
        { error: "AI authentication is not configured." },
        { status: 503, headers }
      );
    }

    const { data, error } = await authClient.auth.getUser(bearerToken);

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Invalid AI support session." },
        { status: 401, headers }
      );
    }

    authenticatedUserId = data.user.id;
  }

  if (!apiKey) {
    const reply = buildDemoAssistantReply(
      messages[messages.length - 1].content,
      ticket
    );
    const evaluation = buildEvaluation({
      reply,
      messages,
      ticket,
      source: "demo",
      model: "demo",
      latencyMs: Date.now() - requestStartedAt
    });
    await persistEvaluationLog({
      bearerToken,
      userId: authenticatedUserId,
      requestId,
      ticket,
      evaluation
    });

    return NextResponse.json(
      {
        requestId,
        source: "demo",
        reply,
        evaluation
      },
      { headers }
    );
  }

  const systemPrompt = [
    "You are a careful AI support operations assistant.",
    "Help support agents triage customer tickets, draft concise replies, identify risk, and suggest next actions.",
    "Do not invent account data. Ask for missing details when needed.",
    "Keep responses practical and suitable for a SaaS support team."
  ].join(" ");

  const ticketContext = ticket
    ? `Active ticket: ${ticket.subject}. Customer: ${ticket.customer}. Category: ${ticket.category}. Priority: ${ticket.priority}. Status: ${ticket.status}. Sentiment: ${ticket.sentiment}. Description: ${ticket.description}`
    : "No active ticket is selected.";

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.35,
      max_completion_tokens: maxAssistantOutputTokens,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${ticketContext}` },
        ...messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ]
    });

    const reply =
      response.choices[0]?.message?.content ??
      "I could not generate a support recommendation for that request.";
    const evaluation = buildEvaluation({
      reply,
      messages,
      ticket,
      source: "openai",
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      latencyMs: Date.now() - requestStartedAt
    });
    await persistEvaluationLog({
      bearerToken,
      userId: authenticatedUserId,
      requestId,
      ticket,
      evaluation
    });

    return NextResponse.json(
      { requestId, source: "openai", reply, evaluation },
      { headers }
    );
  } catch (error) {
    console.error("AI provider request failed", error);
    return NextResponse.json(
      { error: "AI provider request failed." },
      { status: 502, headers }
    );
  }
}

type EvaluationInput = {
  reply: string;
  messages: z.infer<typeof messageSchema>[];
  ticket?: z.infer<typeof ticketSchema>;
  source: "demo" | "openai";
  model: string;
  latencyMs: number;
};

function buildEvaluation({
  reply,
  messages,
  ticket,
  source,
  model,
  latencyMs
}: EvaluationInput) {
  const normalizedReply = reply.toLowerCase();
  const promptCharCount = messages.reduce(
    (total, message) => total + message.content.length,
    0
  );
  const safetyPassed =
    !/password|secret key|service role|api key|token/i.test(reply) &&
    !/i can access your account|i have changed/i.test(reply);
  const groundedTicketContext = ticket
    ? normalizedReply.includes(ticket.priority.toLowerCase()) ||
      normalizedReply.includes(ticket.category.toLowerCase()) ||
      normalizedReply.includes(ticket.subject.toLowerCase().slice(0, 18))
    : true;
  const containsNextSteps =
    /next step|recommended|investigation|escalate|confirm|verify|collect/.test(
      normalizedReply
    );
  const containsCustomerReply =
    /suggested reply|customer|thanks for|we are reviewing|i am reviewing/.test(
      normalizedReply
    );
  const score =
    40 +
    (safetyPassed ? 20 : 0) +
    (groundedTicketContext ? 15 : 0) +
    (containsNextSteps ? 15 : 0) +
    (containsCustomerReply ? 10 : 0);

  return {
    source,
    model,
    score,
    latencyMs,
    promptMessageCount: messages.length,
    promptCharCount,
    responseCharCount: reply.length,
    safetyPassed,
    groundedTicketContext,
    containsNextSteps,
    containsCustomerReply,
    notes: [
      safetyPassed
        ? "Passed safety screen for obvious secret or account-control claims."
        : "Needs review for possible unsafe wording.",
      groundedTicketContext
        ? "Grounded in the selected ticket context."
        : "Ticket grounding was weak.",
      containsNextSteps
        ? "Included operational next steps."
        : "Missing clear next steps.",
      containsCustomerReply
        ? "Included customer-facing language."
        : "Missing customer-facing response language."
    ].join(" ")
  };
}

async function persistEvaluationLog({
  bearerToken,
  userId,
  requestId,
  ticket,
  evaluation
}: {
  bearerToken: string;
  userId: string | null;
  requestId: string;
  ticket?: z.infer<typeof ticketSchema>;
  evaluation: ReturnType<typeof buildEvaluation>;
}) {
  if (!bearerToken || !userId) return;

  const client = createServerSupabaseClient(bearerToken);
  if (!client) return;

  const { error } = await client.from("ai_evaluation_logs").insert({
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `eval-${Date.now()}`,
    user_id: userId,
    ticket_id: ticket?.id ?? null,
    request_id: requestId,
    source: evaluation.source,
    model: evaluation.model,
    score: evaluation.score,
    latency_ms: evaluation.latencyMs,
    prompt_message_count: evaluation.promptMessageCount,
    prompt_char_count: evaluation.promptCharCount,
    response_char_count: evaluation.responseCharCount,
    safety_passed: evaluation.safetyPassed,
    grounded_ticket_context: evaluation.groundedTicketContext,
    contains_next_steps: evaluation.containsNextSteps,
    contains_customer_reply: evaluation.containsCustomerReply,
    notes: evaluation.notes
  });

  if (error) {
    console.error("AI evaluation logging failed", error);
  }
}

function buildDemoAssistantReply(
  latestMessage: string,
  ticket?: z.infer<typeof ticketSchema>
) {
  const isEscalated =
    ticket?.priority === "Urgent" ||
    ticket?.priority === "High" ||
    ticket?.sentiment === "At Risk";

  const firstAction = isEscalated
    ? "Escalate this to the senior support queue and acknowledge the customer within 15 minutes."
    : "Confirm the customer's current state and keep the ticket in the normal support queue.";

  const secondAction =
    ticket?.category === "Bug"
      ? "Ask for timestamps, request IDs, and reproduction steps before engineering handoff."
      : ticket?.category === "Billing"
        ? "Verify invoice permissions, billing account role, and payment-cycle timing."
        : "Check account permissions, workspace membership, and recent product changes.";

  return [
    ticket
      ? `Triage summary for ${ticket.subject}: this looks like a ${ticket.priority.toLowerCase()} priority ${ticket.category.toLowerCase()} issue with ${ticket.sentiment.toLowerCase()} sentiment.`
      : "Triage summary: I can help convert this support note into a ticket plan.",
    `Customer signal: "${latestMessage.slice(0, 180)}${latestMessage.length > 180 ? "..." : ""}"`,
    `Recommended next step: ${firstAction}`,
    `Investigation path: ${secondAction}`,
    "Suggested reply: Thanks for flagging this. I am reviewing the account details now and will update you with the next concrete step shortly."
  ].join("\n\n");
}
