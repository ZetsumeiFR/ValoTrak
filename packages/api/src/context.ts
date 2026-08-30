import { auth } from "@valotrak/auth";
import { type Database, db } from "@valotrak/db";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * Request context handed to every procedure.
 *
 * `db` is injected rather than imported by the routers so tests can run the
 * same procedures against an in-process PGlite database.
 */
export type Context = {
	db: Database;
	session: Session;
};

export async function createContext({
	context,
}: CreateContextOptions): Promise<Context> {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});
	return { db, session };
}
