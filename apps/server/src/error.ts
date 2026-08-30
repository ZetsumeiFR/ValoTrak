import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Central error handler: log server-side, never leak internals to clients.
 *
 * Without it Hono answers unhandled errors with the raw message, which for a
 * database or auth failure means leaking connection strings and stack frames.
 */
export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	console.error("[error] unhandled request failure", err);
	return c.json({ error: "Internal Server Error" }, 500);
};
