import { createDb } from "@valotrak/db";
import * as schema from "@valotrak/db/schema/auth";
import { env } from "@valotrak/env/server";
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
			// better-auth defaults to 8; short passwords are the realistic attack
			// surface here since there is no second factor.
			minPasswordLength: 12,
			maxPasswordLength: 128,
		},
		// The auth routes are public and unauthenticated: without a limit they
		// are a free credential-stuffing endpoint.
		rateLimit: {
			enabled: true,
			window: 60,
			max: 60,
			customRules: {
				"/sign-in/email": { window: 60, max: 5 },
				"/sign-up/email": { window: 3600, max: 5 },
			},
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
