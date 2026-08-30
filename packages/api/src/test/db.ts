import path from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import type { Database } from "@valotrak/db";
import * as schema from "@valotrak/db/schema/index";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const MIGRATIONS_FOLDER = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../db/src/migrations",
);

export interface TestDb {
	db: Database;
	/** Drop the in-memory instance. Always call this in `afterAll`. */
	close: () => Promise<void>;
}

/**
 * Spin up an in-process Postgres (PGlite) with the real migrations applied.
 *
 * Same SQL as production — the only difference is the driver, so schema
 * constraints (NOT NULL, unique indexes, ON CONFLICT) behave identically.
 */
export async function createTestDb(): Promise<TestDb> {
	const client = new PGlite();
	const db = drizzle(client, { schema });
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return {
		db: db as unknown as Database,
		close: () => client.close(),
	};
}

/** Insert a minimal better-auth user row (FK target for the valorant tables). */
export async function insertTestUser(
	db: Database,
	id: string,
): Promise<string> {
	await db.insert(schema.user).values({
		id,
		name: `user-${id}`,
		email: `${id}@example.test`,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return id;
}
