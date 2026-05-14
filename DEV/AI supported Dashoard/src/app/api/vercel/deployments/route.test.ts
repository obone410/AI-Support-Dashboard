import { beforeEach, describe, expect, it } from "vitest";
import { resetRateLimitStore } from "@/lib/rate-limit";
import { GET } from "./route";

describe("/api/vercel/deployments", () => {
  beforeEach(() => {
    resetRateLimitStore();
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_TEAM_ID;
  });

  it("returns cached demo deployment data when Vercel credentials are missing", async () => {
    const response = await GET(
      new Request("http://localhost/api/vercel/deployments", {
        headers: {
          "x-forwarded-for": "203.0.113.10"
        }
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(data.source).toBe("demo");
    expect(data.deployments.length).toBeGreaterThan(0);
  });
});
