import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { POST } from "./route";

const originalEnv = process.env;

function makeRequest(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/ai-support", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

describe("/api/ai-support", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    resetRateLimitStore();
    delete process.env.OPENAI_API_KEY;
    delete process.env.REQUIRE_AI_AUTH;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns a demo assistant response when no OpenAI key is configured", async () => {
    const response = await POST(
      makeRequest({
        messages: [
          {
            role: "user",
            content: "How should we triage this invoice issue?"
          }
        ],
        ticket: {
          id: "tkt-test",
          subject: "Invoice export failed",
          customer: "Acme Ops",
          category: "Billing",
          priority: "High",
          status: "Open",
          description: "Customer cannot export invoices.",
          sentiment: "At Risk"
        }
      })
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.source).toBe("demo");
    expect(data.reply).toContain("Triage summary");
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      makeRequest({
        messages: []
      })
    );

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid support assistant request.");
  });

  it("requires a bearer token when REQUIRE_AI_AUTH is enabled", async () => {
    process.env.REQUIRE_AI_AUTH = "true";

    const response = await POST(
      makeRequest({
        messages: [{ role: "user", content: "Hello" }]
      })
    );

    expect(response.status).toBe(401);
  });

  it("does not accept unvalidated bearer tokens when auth is enabled", async () => {
    process.env.REQUIRE_AI_AUTH = "true";

    const response = await POST(
      makeRequest(
        {
          messages: [{ role: "user", content: "Hello" }]
        },
        {
          Authorization: "Bearer fake-token"
        }
      )
    );

    expect(response.status).toBe(503);
  });

  it("rate limits excessive AI requests", async () => {
    const body = {
      messages: [{ role: "user", content: "Hello" }]
    };

    const requests = await Promise.all(
      Array.from({ length: 31 }, () => POST(makeRequest(body)))
    );

    expect(requests[30].status).toBe(429);
    expect(requests[30].headers.get("Retry-After")).toBeTruthy();
  });
});
