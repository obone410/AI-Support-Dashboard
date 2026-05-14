import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { z } from "zod";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
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
  const limit = rateLimit(`ai-support:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60_000
  });
  const headers = {
    ...noStoreHeaders,
    ...limit.headers
  };

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

  if (requiresAuth) {
    const bearerToken = authHeader?.startsWith("Bearer ")
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
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        source: "demo",
        reply: buildDemoAssistantReply(
          messages[messages.length - 1].content,
          ticket
        )
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

    return NextResponse.json({ source: "openai", reply }, { headers });
  } catch (error) {
    console.error("AI provider request failed", error);
    return NextResponse.json(
      { error: "AI provider request failed." },
      { status: 502, headers }
    );
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
