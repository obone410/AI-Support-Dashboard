import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0"
};

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
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`,
      {
        cache: "no-store",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase REST returned ${response.status}`);
    }

    const rows = (await response.json()) as unknown;

    return NextResponse.json(
      {
        ok: true,
        source: "supabase",
        secured: authorization.secured,
        schedule: request.headers.get("x-vercel-cron-schedule") ?? "manual",
        checkedAt: new Date().toISOString(),
        probeRows: Array.isArray(rows) ? rows.length : 0
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
