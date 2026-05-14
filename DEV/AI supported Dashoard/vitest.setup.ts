import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/vercel/deployments")) {
        return Response.json({
          source: "demo",
          deployments: []
        });
      }

      if (url.includes("/api/ai-support")) {
        return Response.json({
          source: "demo",
          reply: "Demo assistant response"
        });
      }

      return Response.json({}, { status: 404 });
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
