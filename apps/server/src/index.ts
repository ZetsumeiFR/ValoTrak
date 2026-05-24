import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@valorant-tracker/api/context";
import { appRouter } from "@valorant-tracker/api/routers/index";
import { auth } from "@valorant-tracker/auth";
import { env } from "@valorant-tracker/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

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

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
