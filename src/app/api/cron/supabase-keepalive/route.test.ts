import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { GET } from "./route";

const originalEnv = process.env;
const originalFetch = global.fetch;

function makeRequest(headers?: HeadersInit) {
  return new Request("http://localhost/api/cron/supabase-keepalive", {
    method: "GET",
    headers
  });
}

describe("/api/cron/supabase-keepalive", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key"
    };
    delete process.env.CRON_SECRET;
    resetRateLimitStore();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    } as Response);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("touches Supabase with a read-only REST probe", async () => {
    const response = await GET(
      makeRequest({
        "x-vercel-cron-schedule": "0 8 * * *"
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.source).toBe("supabase");
    expect(data.secured).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/profiles?select=id&limit=1",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          apikey: "anon-key",
          Authorization: "Bearer anon-key"
        }
      })
    );
  });

  it("requires the cron bearer token when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "test-cron-secret";

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized cron request.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("accepts the cron bearer token when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "test-cron-secret";

    const response = await GET(
      makeRequest({
        Authorization: "Bearer test-cron-secret"
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.secured).toBe(true);
  });

  it("returns a configuration error when Supabase env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("Supabase keepalive is not configured.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns an upstream error when Supabase does not respond successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    } as Response);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Supabase keepalive failed.");
  });
});
