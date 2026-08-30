import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const origin = z.url().refine((v) => {
	try {
		const u = new URL(v);
		return `${u.protocol}//${u.host}` === v.replace(/\/$/, "");
	} catch {
		return false;
	}
}, "must be a bare origin (scheme://host[:port]) with no path");

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: origin,
		CORS_ORIGIN: origin,
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		/**
		 * Set only when the server sits behind a proxy that overwrites
		 * `X-Forwarded-For`; otherwise the header is client-controlled and the
		 * auth rate limit becomes trivially bypassable.
		 */
		TRUST_PROXY: z
			.enum(["true", "false"])
			.default("false")
			.transform((value) => value === "true"),
		/** Retention window for the append-only snapshot history. */
		SNAPSHOT_RETENTION_DAYS: z.coerce
			.number()
			.int()
			.min(1)
			.max(3650)
			.default(180),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
