import type { Context, MiddlewareHandler } from "hono";

export interface RateLimitOptions {
	windowMs: number;
	max: number;
	/** Injectable clock (tests drive the window without sleeping). */
	now?: () => number;
}

interface Bucket {
	count: number;
	resetAt: number;
}

/** Best-effort client identity: proxy header first, then the socket address. */
function clientId(c: Context): string {
	const forwarded = c.req.header("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0]?.trim() || "unknown";
	}
	return c.req.header("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window limiter keyed by client IP.
 *
 * Sits in front of the auth routes, which are public, unauthenticated and
 * otherwise a free credential-stuffing endpoint. Deliberately in-process: it
 * must keep answering when the database is down, which is exactly when a
 * database-backed limiter fails open.
 */
export function createRateLimit(options: RateLimitOptions): MiddlewareHandler {
	const now = options.now ?? Date.now;
	const buckets = new Map<string, Bucket>();
	const retryAfter = String(Math.ceil(options.windowMs / 1000));

	return async (c, next) => {
		const key = clientId(c);
		const current = now();
		const bucket = buckets.get(key);

		if (!bucket || bucket.resetAt <= current) {
			buckets.set(key, { count: 1, resetAt: current + options.windowMs });
			// Drop windows that already expired so the map cannot grow unbounded.
			for (const [id, entry] of buckets) {
				if (entry.resetAt <= current) {
					buckets.delete(id);
				}
			}
			return next();
		}

		if (bucket.count >= options.max) {
			return c.json({ error: "Too Many Requests" }, 429, {
				"Retry-After": retryAfter,
			});
		}

		bucket.count += 1;
		return next();
	};
}
