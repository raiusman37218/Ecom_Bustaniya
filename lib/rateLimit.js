/**
 * Small in-process rate limiter for public endpoints.
 *
 * Deliberately the same shape as the counters already inlined in
 * app/api/admin/login and app/api/postex/order — this exists so new public
 * routes do not each grow their own copy. Those two are left as they are:
 * they work, and re-pointing the login limiter is not worth the risk.
 *
 * In-process means per server instance. Behind several instances a caller gets
 * that many windows, which is fine for abuse damping; it is not a substitute
 * for a WAF or an edge rate limit on a high-traffic deployment.
 */

const buckets = new Map();

/** Caller identity. X-Forwarded-For is set by the proxy; its first hop is the client. */
export function clientKeyFrom(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * Returns true when this caller has exceeded `max` requests in `windowMs`.
 * `name` keeps separate routes from sharing a budget.
 */
export function isRateLimited(name, key, { max = 20, windowMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  const bucketKey = `${name}:${key}`;

  // Opportunistic sweep so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets.entries()) if (v.expiresAt <= now) buckets.delete(k);
  }

  const current = buckets.get(bucketKey);
  if (!current || current.expiresAt <= now) {
    buckets.set(bucketKey, { count: 1, expiresAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > max;
}

/** Seconds until this caller's window resets, for a Retry-After header. */
export function retryAfterSeconds(name, key) {
  const current = buckets.get(`${name}:${key}`);
  if (!current) return 0;
  return Math.max(1, Math.ceil((current.expiresAt - Date.now()) / 1000));
}
