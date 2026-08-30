import { neon } from "@neondatabase/serverless";
import { env } from "@valotrak/env/server";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "./schema";

/**
 * Driver-agnostic handle over this schema.
 *
 * Production runs on `neon-http`; tests run the same schema on an in-process
 * PGlite instance. Anything that only builds queries should depend on this
 * type rather than the concrete driver.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export function createDb() {
	const sql = neon(env.DATABASE_URL);
	return drizzle(sql, { schema });
}

export const db = createDb();
