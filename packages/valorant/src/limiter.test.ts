import { describe, expect, it } from "bun:test";

import { rateLimited } from "./limiter";
import type { RiotRequest, RiotResponse } from "./transport";

const req: RiotRequest = { method: "GET", url: "https://pd.eu.a.pvp.net/x" };
const ok = (body = "{}"): RiotResponse => ({ status: 200, ok: true, body });
const fast = { baseDelayMs: 1, maxDelayMs: 2 } as const;

describe("rateLimited", () => {
	it("passes a successful response through without retrying", async () => {
		let calls = 0;
		const transport = rateLimited(async () => {
			calls += 1;
			return ok();
		});
		const res = await transport(req);
		expect(res.status).toBe(200);
		expect(calls).toBe(1);
	});

	it("retries on 429 then succeeds", async () => {
		let calls = 0;
		const transport = rateLimited(async () => {
			calls += 1;
			return calls < 3 ? { status: 429, ok: false, body: "" } : ok();
		}, fast);
		const res = await transport(req);
		expect(res.ok).toBe(true);
		expect(calls).toBe(3);
	});

	it("does not retry non-retryable statuses", async () => {
		let calls = 0;
		const transport = rateLimited(async () => {
			calls += 1;
			return { status: 404, ok: false, body: "" };
		}, fast);
		const res = await transport(req);
		expect(res.status).toBe(404);
		expect(calls).toBe(1);
	});

	it("gives up after maxRetries and returns the last response", async () => {
		let calls = 0;
		const transport = rateLimited(
			async () => {
				calls += 1;
				return { status: 429, ok: false, body: "" };
			},
			{ ...fast, maxRetries: 2 },
		);
		const res = await transport(req);
		expect(res.status).toBe(429);
		expect(calls).toBe(3); // initial attempt + 2 retries
	});

	it("honors a Retry-After header instead of the long backoff", async () => {
		let calls = 0;
		const start = Date.now();
		const transport = rateLimited(
			async () => {
				calls += 1;
				return calls === 1
					? {
							status: 429,
							ok: false,
							body: "",
							headers: { "retry-after": "0" },
						}
					: ok();
			},
			{ baseDelayMs: 10_000 },
		);
		const res = await transport(req);
		expect(res.ok).toBe(true);
		expect(Date.now() - start).toBeLessThan(1000);
	});

	it("caps the number of in-flight requests", async () => {
		let active = 0;
		let max = 0;
		const transport = rateLimited(
			async () => {
				active += 1;
				max = Math.max(max, active);
				await new Promise((resolve) => setTimeout(resolve, 10));
				active -= 1;
				return ok();
			},
			{ concurrency: 2 },
		);
		await Promise.all(Array.from({ length: 6 }, () => transport(req)));
		expect(max).toBeLessThanOrEqual(2);
	});

	it("retries a thrown network error then succeeds", async () => {
		let calls = 0;
		const transport = rateLimited(async () => {
			calls += 1;
			if (calls < 2) {
				throw new Error("network down");
			}
			return ok();
		}, fast);
		const res = await transport(req);
		expect(res.ok).toBe(true);
		expect(calls).toBe(2);
	});
});
