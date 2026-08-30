import type { Context, MiddlewareHandler } from "hono";

export interface RateLimitOptions {
	windowMs: number;
	max: number;
	/** Injectable clock (tests drive the window without sleeping). */
	now?: () => number;
	/**
	 * Read `X-Forwarded-For`. Only enable it behind a proxy that overwrites the
	 * header: it is attacker-controlled otherwise, and rotating it would hand
	 * out an unlimited number of fresh quotas.
	 */
	trustProxy?: boolean;
	/** Socket-level peer address (runtime specific, injected by the caller). */
	socketIp?: (c: Context) => string;
}

interface Bucket {
	count: number;
	resetAt: number;
}

function clientId(c: Context, options: RateLimitOptions): string {
	if (options.trustProxy) {
		const forwarded = c.req.header("x-forwarded-for");
		const first = forwarded?.split(",")[0]?.trim();
		if (first) {
			return first;
		}
	}
	return options.socketIp?.(c) ?? "unknown";
}

/**
 * Fixed-window limiter keyed by client address.
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
		const key = clientId(c, options);
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
