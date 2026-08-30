import type { EnrichedPlayer } from "@valotrak/valorant";

export interface SnapshotEntry {
	puuid: string;
	snapshot: {
		riotId?: EnrichedPlayer["riotId"];
		rank?: EnrichedPlayer["rank"];
		level?: EnrichedPlayer["level"];
		stats?: EnrichedPlayer["stats"];
	};
}

/**
 * Snapshot payloads for the followed players that carry something worth
 * charting. Players with neither rank nor stats are skipped: enrichment may
 * still be in flight for them.
 */
export function selectSnapshotEntries(
	players: EnrichedPlayer[],
	followedPuuids: ReadonlySet<string>,
): SnapshotEntry[] {
	return players
		.filter(
			(player) =>
				followedPuuids.has(player.puuid) &&
				Boolean(player.rank || player.stats),
		)
		.map((player) => ({
			puuid: player.puuid,
			snapshot: {
				riotId: player.riotId,
				rank: player.rank,
				level: player.level,
				stats: player.stats,
			},
		}));
}

/**
 * Identity of a batch, used to skip redundant round trips.
 *
 * Must depend on *which* players are included, not how many: a lobby can swap
 * a player for another at constant size, and that new player would otherwise
 * never be persisted.
 */
export function snapshotBatchSignature(entries: SnapshotEntry[]): string {
	return entries
		.map((entry) => entry.puuid)
		.sort()
		.join(",");
}
