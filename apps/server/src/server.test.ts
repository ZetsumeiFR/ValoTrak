/// <reference types="bun" />
import { describe, expect, it } from "bun:test";
import { Hono } from "hono";

import { errorHandler } from "./error";
import { createHealthHandler } from "./health";
import { createRateLimit } from "./rate-limit";

function healthApp(probe: () => Promise<void>) {
	const app = new Hono();
	app.get("/health", createHealthHandler(probe));
	return app;
}

describe("GET /health", () => {
	it("reports ok when the database answers", async () => {
		const res = await healthApp(async () => {}).request("/health");

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: "ok", database: "up" });
	});

	it("reports 503 when the database is unreachable", async () => {
		const res = await healthApp(async () => {
			throw new Error("connection refused to db-host:5432");
		}).request("/health");

		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({ status: "error", database: "down" });
	});

	it("never leaks the database error to the client", async () => {
		const res = await healthApp(async () => {
			throw new Error("password authentication failed for user 'admin'");
		}).request("/health");

		expect(await res.text()).not.toContain("password authentication failed");
	});
});

describe("rate limit", () => {
	function limitedApp(
		now: () => number,
		options: { trustProxy?: boolean; socketIp?: string } = {},
	) {
		const app = new Hono();
		app.use(
			"/api/auth/*",
			createRateLimit({
				windowMs: 60_000,
				max: 3,
				now,
				trustProxy: options.trustProxy ?? true,
				socketIp: () => options.socketIp ?? "10.0.0.1",
			}),
		);
		app.post("/api/auth/sign-in/email", (c) => c.json({ ok: true }));
		return app;
	}

	function signIn(app: Hono, ip: string) {
		return app.request("/api/auth/sign-in/email", {
			method: "POST",
			headers: { "x-forwarded-for": ip },
		});
	}

	it("allows requests up to the limit and rejects the next one", async () => {
		const app = limitedApp(() => 1_000);

		const allowed = [
			await signIn(app, "1.2.3.4"),
			await signIn(app, "1.2.3.4"),
			await signIn(app, "1.2.3.4"),
		];
		const blocked = await signIn(app, "1.2.3.4");

		expect(allowed.map((res) => res.status)).toEqual([200, 200, 200]);
		expect(blocked.status).toBe(429);
		expect(blocked.headers.get("retry-after")).toBe("60");
		expect(await blocked.json()).toEqual({ error: "Too Many Requests" });
	});

	it("counts each client separately", async () => {
		const app = limitedApp(() => 1_000);
		for (let i = 0; i < 3; i += 1) {
			await signIn(app, "1.2.3.4");
		}

		expect((await signIn(app, "1.2.3.4")).status).toBe(429);
		expect((await signIn(app, "5.6.7.8")).status).toBe(200);
	});

	it("ignores a spoofed X-Forwarded-For when no proxy is trusted", async () => {
		// Without a trusted proxy the header is attacker-controlled: rotating it
		// must not hand out a fresh quota.
		const app = limitedApp(() => 1_000, {
			trustProxy: false,
			socketIp: "10.0.0.1",
		});

		await signIn(app, "1.1.1.1");
		await signIn(app, "2.2.2.2");
		await signIn(app, "3.3.3.3");

		expect((await signIn(app, "4.4.4.4")).status).toBe(429);
	});

	it("lets the client through again once the window rolls over", async () => {
		let clock = 1_000;
		const app = limitedApp(() => clock);
		for (let i = 0; i < 3; i += 1) {
			await signIn(app, "1.2.3.4");
		}
		expect((await signIn(app, "1.2.3.4")).status).toBe(429);

		clock += 60_001;

		expect((await signIn(app, "1.2.3.4")).status).toBe(200);
	});
});

describe("error handler", () => {
	it("answers 500 without leaking the message or the stack", async () => {
		const app = new Hono();
		app.onError(errorHandler);
		app.get("/boom", () => {
			throw new Error("secret internal detail at /srv/app/db.ts:42");
		});

		const res = await app.request("/boom");
		const body = await res.text();

		expect(res.status).toBe(500);
		expect(body).not.toContain("secret internal detail");
		expect(body).not.toContain("db.ts:42");
		expect(JSON.parse(body)).toEqual({ error: "Internal Server Error" });
	});
});
