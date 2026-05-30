import type { RiotResponse, RiotTransport } from "./transport";

/**
 * The unofficial pvp.net endpoints rate-limit aggressively: enriching a full
 * 10-player lobby fans out to ~120 requests, which reliably trips HTTP 429.
 * {@link rateLimited} wraps a transport with a global concurrency cap and
 * backoff retries so transient 429 / 5xx responses recover instead of failing
 * a player's card. One wrapped instance shares a single budget across calls.
 */
export interface RateLimitOptions {
	/** Max requests in flight at once. */
	concurrency?: number;
	/** Minimum delay between request starts. Prevents short bursts that trigger 429. */
	minIntervalMs?: number;
	/** Retry attempts for 429 / 5xx responses and network errors. */
	maxRetries?: number;
	/** Base backoff delay in ms; grows exponentially per attempt. */
	baseDelayMs?: number;
	/** Upper bound for a single backoff wait. */
	maxDelayMs?: number;
}

const DEFAULTS = {
	concurrency: 4,
	minIntervalMs: 0,
	maxRetries: 4,
	baseDelayMs: 600,
	maxDelayMs: 10_000,
} as const;

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(status: number): boolean {
	return status === 429 || (status >= 500 && status < 600);
}

/** Parse a `Retry-After` header (delta-seconds or HTTP-date) into ms. */
function retryAfterMs(res: RiotResponse): number | undefined {
	const raw = res.headers?.["retry-after"];
	if (!raw) {
		return undefined;
	}
	const seconds = Number(raw);
	if (Number.isFinite(seconds)) {
		return Math.max(0, seconds * 1000);
	}
	const date = Date.parse(raw);
	return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export function rateLimited(
	transport: RiotTransport,
	options: RateLimitOptions = {},
): RiotTransport {
	const concurrency = Math.max(
		1,
		Math.floor(options.concurrency ?? DEFAULTS.concurrency),
	);
	const maxRetries = Math.max(
		0,
		Math.floor(options.maxRetries ?? DEFAULTS.maxRetries),
	);
	const minIntervalMs = Math.max(
		0,
		Math.floor(options.minIntervalMs ?? DEFAULTS.minIntervalMs),
	);
	const baseDelayMs = Math.max(0, options.baseDelayMs ?? DEFAULTS.baseDelayMs);
	const maxDelayMs = Math.max(
		baseDelayMs,
		options.maxDelayMs ?? DEFAULTS.maxDelayMs,
	);

	let active = 0;
	let nextStartAt = 0;
	const waiters: Array<() => void> = [];

	const acquire = (): Promise<void> => {
		if (active < concurrency) {
			active += 1;
			return Promise.resolve();
		}
		return new Promise((resolve) => waiters.push(resolve));
	};
	const release = (): void => {
		const next = waiters.shift();
		if (next) {
			next(); // hand the slot straight to the next waiter
		} else {
			active -= 1;
		}
	};

	const delayFor = (attempt: number, res?: RiotResponse): number => {
		const header = res ? retryAfterMs(res) : undefined;
		if (header !== undefined) {
			return Math.min(header, maxDelayMs);
		}
		// Exponential backoff with jitter in [exp/2, exp].
		const exp = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
		return exp / 2 + Math.random() * (exp / 2);
	};
	const waitForRequestTurn = async (): Promise<void> => {
		if (minIntervalMs === 0) {
			return;
		}
		const now = Date.now();
		const startAt = Math.max(now, nextStartAt);
		nextStartAt = startAt + minIntervalMs;
		const waitMs = startAt - now;
		if (waitMs > 0) {
			await sleep(waitMs);
		}
	};

	return async (req) => {
		await acquire();
		try {
			let lastRes: RiotResponse | undefined;
			let lastError: unknown;
			for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
				try {
					await waitForRequestTurn();
					const res = await transport(req);
					if (res.ok || !isRetryable(res.status)) {
						return res;
					}
					lastRes = res;
				} catch (error) {
					lastError = error;
				}
				if (attempt < maxRetries) {
					await sleep(delayFor(attempt, lastRes));
				}
			}
			if (lastRes) {
				return lastRes;
			}
			throw lastError;
		} finally {
			release();
		}
	};
}
