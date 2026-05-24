import { createDb } from "@valorant-tracker/db";
import * as schema from "@valorant-tracker/db/schema/auth";
import { env } from "@valorant-tracker/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

/**
 * Origins of the Tauri desktop webview. In dev it loads the Vite server
 * (`CORS_ORIGIN`); in a packaged build it serves over a custom protocol.
 */
const TAURI_ORIGINS = ["tauri://localhost", "http://tauri.localhost"];

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN, ...TAURI_ORIGINS],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		// Bearer token auth: the desktop webview can't rely on cross-site secure
		// cookies, so the session token is sent in the Authorization header instead.
		plugins: [bearer()],
	});
}

export const auth = createAuth();
