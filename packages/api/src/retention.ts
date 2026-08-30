import type { Database } from "@valotrak/db";
import { playerStatsCache } from "@valotrak/db/schema/valorant";
import { lt } from "drizzle-orm";

/** Default retention window for the append-only snapshot history. */
export const DEFAULT_RETENTION_DAYS = 180;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Delete snapshots older than `keepDays`. Returns the number of deleted rows.
 *
 * `player_stats_cache` is append-only: without a retention pass it grows
 * without bound.
 */
export async function purgeOldSnapshots(
	db: Database,
	keepDays: number = DEFAULT_RETENTION_DAYS,
): Promise<number> {
	const cutoff = new Date(Date.now() - keepDays * MS_PER_DAY);
	const deleted = await db
		.delete(playerStatsCache)
		.where(lt(playerStatsCache.capturedAt, cutoff))
		.returning({ id: playerStatsCache.id });
	return deleted.length;
}
