/// <reference types="bun" />

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = path
	.dirname(new URL(import.meta.url).pathname)
	.replace(/^\/([A-Za-z]:)/, "$1");

async function applyMigration(pg: PGlite, file: string): Promise<void> {
	const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
	for (const statement of sql.split("--> statement-breakpoint")) {
		const trimmed = statement.trim();
		if (trimmed) {
			await pg.exec(trimmed);
		}
	}
}

const PAYLOAD = JSON.stringify({ level: 100 });

/**
 * 0001 runs against tables that already hold data: orphan rows must go, the
 * new `match_id` must be backfilled without colliding, and the unique index
 * must end up enforced. Applying it to an empty database proves none of that.
 */
test("0001 upgrades a populated 0000 database without data loss", async () => {
	const pg = new PGlite();
	await applyMigration(pg, "0000_slim_lorna_dane.sql");

	await pg.exec(`
		INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
		VALUES ('u1', 'User One', 'u1@example.test', true, now(), now());
	`);
	await pg.exec(`
		INSERT INTO "tracked_player" ("id", "user_id", "puuid", "game_name", "tag_line", "region")
		VALUES ('tp1', 'u1', 'p-aaa', 'Player', 'EUW', 'eu'),
		       ('tp-orphan', NULL, 'p-bbb', 'Ghost', 'EUW', 'eu');
	`);
	await pg.exec(`
		INSERT INTO "player_stats_cache" ("id", "user_id", "puuid", "region", "payload")
		VALUES ('sc1', 'u1', 'p-aaa', 'eu', '${PAYLOAD}'),
		       ('sc2', 'u1', 'p-aaa', 'eu', '${PAYLOAD}'),
		       ('sc-orphan', NULL, 'p-aaa', 'eu', '${PAYLOAD}');
	`);

	await applyMigration(pg, "0001_slippery_pixie.sql");

	const tracked = await pg.query<{ id: string }>(
		`SELECT "id" FROM "tracked_player" ORDER BY "id";`,
	);
	expect(tracked.rows.map((row) => row.id)).toEqual(["tp1"]);

	const snapshots = await pg.query<{ id: string; match_id: string }>(
		`SELECT "id", "match_id" FROM "player_stats_cache" ORDER BY "id";`,
	);
	// Legacy history is kept, each row backfilled with its own id (no collision).
	expect(snapshots.rows).toEqual([
		{ id: "sc1", match_id: "sc1" },
		{ id: "sc2", match_id: "sc2" },
	]);

	await expect(
		pg.exec(`
			INSERT INTO "player_stats_cache" ("id", "user_id", "puuid", "region", "match_id", "payload")
			VALUES ('sc3', 'u1', 'p-aaa', 'eu', 'sc1', '${PAYLOAD}');
		`),
	).rejects.toThrow(/duplicate key value/i);

	await pg.close();
});
