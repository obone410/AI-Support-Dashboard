import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

const heartbeatProbeCount = 3;

function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return {
      authorized: false,
      secured: false
    };
  }

  return {
    authorized: request.headers.get("authorization") === `Bearer ${cronSecret}`,
    secured: true
  };
}

export async function GET(request: Request) {
  const limit = rateLimit(`supabase-keepalive:${getClientIp(request)}`, {
    limit: 20,
    windowMs: 60_000
  });
  const headers = {
    ...noStoreHeaders,
    ...limit.headers
  };

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many keepalive requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(limit.retryAfter)
        }
      }
    );
  }

  const authorization = isCronAuthorized(request);

  if (!authorization.authorized) {
    return NextResponse.json(
      { error: "Unauthorized cron request." },
      { status: 401, headers }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase keepalive is not configured." },
      { status: 503, headers }
    );
  }

  try {
    const probes: Array<{ rows: unknown; status: number }> = [];
    const probeUrl = `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`;

    for (let probeIndex = 0; probeIndex < heartbeatProbeCount; probeIndex += 1) {
      const response = await fetch(probeUrl, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Cache-Control": "no-store"
        }
      });

      if (!response.ok) {
        throw new Error(`Supabase REST returned ${response.status}`);
      }

      probes.push({
        rows: (await response.json()) as unknown,
        status: response.status
      });
    }

    return NextResponse.json(
      {
        ok: true,
        source: "supabase",
        secured: authorization.secured,
        schedule: request.headers.get("x-vercel-cron-schedule") ?? "manual",
        checkedAt: new Date().toISOString(),
        probeCount: probes.length,
        successfulProbes: probes.filter((probe) => probe.status >= 200 && probe.status < 300).length,
        probeRows: probes.reduce(
          (total, probe) => total + (Array.isArray(probe.rows) ? probe.rows.length : 0),
          0
        )
      },
      { headers }
    );
  } catch (error) {
    console.error("Supabase keepalive failed", error);
    return NextResponse.json(
      { error: "Supabase keepalive failed." },
      { status: 502, headers }
    );
  }
}
