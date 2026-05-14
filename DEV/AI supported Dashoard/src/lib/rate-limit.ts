type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  maxEntries?: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }

  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "anonymous"
  );
}

export function rateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const maxEntries = options.maxEntries ?? 10000;

  if (rateLimitStore.size > maxEntries) {
    for (const [candidateKey, candidate] of rateLimitStore) {
      if (candidate.resetAt <= now || rateLimitStore.size > maxEntries) {
        rateLimitStore.delete(candidateKey);
      }

      if (rateLimitStore.size <= maxEntries) break;
    }
  }

  const current = rateLimitStore.get(key);
  const entry =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + options.windowMs
        };

  entry.count += 1;
  rateLimitStore.set(key, entry);

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  const remaining = Math.max(0, options.limit - entry.count);

  return {
    allowed: entry.count <= options.limit,
    remaining,
    resetAt: entry.resetAt,
    retryAfter,
    headers: {
      "X-RateLimit-Limit": String(options.limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000))
    }
  };
}

export function resetRateLimitStore() {
  rateLimitStore.clear();
}
