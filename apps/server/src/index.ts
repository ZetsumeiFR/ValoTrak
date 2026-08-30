import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@valotrak/api/context";
import { purgeOldSnapshots } from "@valotrak/api/retention";
import { appRouter } from "@valotrak/api/routers/index";
import { auth } from "@valotrak/auth";
import { db } from "@valotrak/db";
import { env } from "@valotrak/env/server";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { getConnInfo } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { errorHandler } from "./error";
import { createHealthHandler } from "./health";
import { createRateLimit } from "./rate-limit";

const app = new Hono();

app.onError(errorHandler);

app.use(logger());
app.use(
	"/*",
	cors({
		// Allow the web dev server and the Tauri desktop webview origins.
		origin: [env.CORS_ORIGIN, "tauri://localhost", "http://tauri.localhost"],
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		// `set-auth-token` carries the bearer session token to the desktop client.
		exposeHeaders: ["set-auth-token"],
		credentials: true,
	}),
);

// Edge limiter: runs before the auth handler touches the database, so it still
// protects the endpoint when the database is unavailable. better-auth's own
// rate limiting stays enabled behind it as a second layer.
app.use(
	"/api/auth/*",
	createRateLimit({
		windowMs: 60_000,
		max: 20,
		trustProxy: env.TRUST_PROXY,
		socketIp: (c) => getConnInfo(c).remote.address ?? "unknown",
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get(
	"/health",
	createHealthHandler(async () => {
		await db.execute(sql`select 1`);
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * `player_stats_cache` is append-only; without this pass it grows forever.
 * Unref'd so it never keeps the process alive on its own.
 */
const retentionTimer = setInterval(() => {
	purgeOldSnapshots(db, env.SNAPSHOT_RETENTION_DAYS)
		.then((deleted) => {
			if (deleted > 0) {
				console.info(`[retention] purged ${deleted} expired snapshots`);
			}
		})
		.catch((error) => {
			console.error("[retention] purge failed", error);
		});
}, RETENTION_INTERVAL_MS);
retentionTimer.unref?.();

export default app;
