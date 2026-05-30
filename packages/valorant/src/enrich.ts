import { computeAggregatedStats } from "./aggregate";
import { getMatchDetailsCached } from "./cache";
import { DEFAULT_MATCH_COUNT, QUEUE, type QueueId } from "./constants";
import {
	extractAccountLevel,
	extractRank,
	getAccountXp,
	getMatchHistory,
	getMmr,
	getNames,
} from "./riot";
import type { RiotAuth, RiotTransport } from "./transport";
import type {
	AggregatedStats,
	CurrentMatch,
	EnrichedPlayer,
	RankInfo,
	RiotId,
} from "./types";

export interface EnrichOptions {
	/** Number of recent matches to aggregate per player. */
	matchCount?: number;
	/** Queue to pull match history from. */
	queue?: QueueId;
	/** Max players enriched in parallel (gentle on the unofficial API). */
	concurrency?: number;
	/** How long per-player rank + stats enrichment can be reused. */
	cacheTtlMs?: number;
}

export interface PlayerEnrichment {
	rank?: RankInfo;
	level?: number;
	stats?: AggregatedStats;
	error?: string;
}

const DETAIL_CONCURRENCY = 3;
const DEFAULT_ENRICHMENT_CACHE_TTL_MS = 60_000;
const MAX_ENRICHMENT_CACHE_ENTRIES = 200;

interface CachedEnrichment {
	expiresAt: number;
	promise: Promise<PlayerEnrichment>;
}

const enrichmentCache = new Map<string, CachedEnrichment>();

function enrichmentCacheKey(
	match: CurrentMatch,
	puuid: string,
	matchCount: number,
	queue: QueueId,
): string {
	return [match.shard.region, match.shard.shard, puuid, matchCount, queue].join(
		":",
	);
}

function pruneEnrichmentCache(now: number): void {
	for (const [key, entry] of enrichmentCache) {
		if (entry.expiresAt <= now) {
			enrichmentCache.delete(key);
		}
	}
	while (enrichmentCache.size > MAX_ENRICHMENT_CACHE_ENTRIES) {
		const oldest = enrichmentCache.keys().next().value;
		if (oldest === undefined) {
			return;
		}
		enrichmentCache.delete(oldest);
	}
}

/** Fetch a single player's rank + aggregated recent stats. */
export async function enrichPlayerStats(
	transport: RiotTransport,
	auth: RiotAuth,
	match: CurrentMatch,
	puuid: string,
	options: EnrichOptions = {},
): Promise<PlayerEnrichment> {
	const matchCount = options.matchCount ?? DEFAULT_MATCH_COUNT;
	const queue = options.queue ?? QUEUE.competitive;
	const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_ENRICHMENT_CACHE_TTL_MS;
	if (cacheTtlMs > 0) {
		const now = Date.now();
		const key = enrichmentCacheKey(match, puuid, matchCount, queue);
		const cached = enrichmentCache.get(key);
		if (cached && cached.expiresAt > now) {
			return cached.promise;
		}

		const promise = fetchPlayerEnrichment(
			transport,
			auth,
			match,
			puuid,
			matchCount,
			queue,
		).then(
			(result) => {
				if (result.error) {
					enrichmentCache.delete(key);
				}
				return result;
			},
			(error) => {
				enrichmentCache.delete(key);
				throw error;
			},
		);
		enrichmentCache.set(key, {
			expiresAt: now + cacheTtlMs,
			promise,
		});
		pruneEnrichmentCache(now);
		return promise;
	}

	return fetchPlayerEnrichment(
		transport,
		auth,
		match,
		puuid,
		matchCount,
		queue,
	);
}

async function fetchPlayerEnrichment(
	transport: RiotTransport,
	auth: RiotAuth,
	match: CurrentMatch,
	puuid: string,
	matchCount: number,
	queue: QueueId,
): Promise<PlayerEnrichment> {
	try {
		const [mmr, history, accountXp] = await Promise.all([
			getMmr(transport, auth, match.shard, puuid),
			getMatchHistory(transport, auth, match.shard, puuid, {
				endIndex: matchCount,
				queue,
			}),
			getAccountXp(transport, auth, match.shard, puuid).catch(() => undefined),
		]);
		const details = await mapWithConcurrency(
			history,
			DETAIL_CONCURRENCY,
			(entry) =>
				getMatchDetailsCached(transport, auth, match.shard, entry.MatchID),
		);
		return {
			rank: extractRank(mmr),
			level: accountXp ? extractAccountLevel(accountXp) : undefined,
			stats: computeAggregatedStats(puuid, details),
		};
	} catch (error) {
		return {
			error: error instanceof Error ? error.message : "enrichment failed",
		};
	}
}

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const safeLimit = Math.max(1, Math.floor(limit));
	const results: R[] = new Array(items.length);
	let cursor = 0;
	const worker = async (): Promise<void> => {
		while (cursor < items.length) {
			const index = cursor;
			cursor += 1;
			const item = items[index];
			if (item !== undefined) {
				results[index] = await fn(item, index);
			}
		}
	};
	const workers = Array.from(
		{ length: Math.min(safeLimit, items.length) },
		worker,
	);
	await Promise.all(workers);
	return results;
}

/**
 * Enrich every lobby player: resolve Riot IDs (one batched call) and fetch
 * rank + recent stats per player with bounded concurrency. Per-player failures
 * are captured in `error` rather than failing the whole lobby.
 */
export async function enrichLobby(
	transport: RiotTransport,
	auth: RiotAuth,
	match: CurrentMatch,
	options: EnrichOptions = {},
): Promise<EnrichedPlayer[]> {
	const concurrency = options.concurrency ?? 3;
	const puuids = match.players.map((player) => player.puuid);

	let names = new Map<string, RiotId>();
	try {
		names = await getNames(transport, auth, match.shard, puuids);
	} catch {
		// Name resolution is best-effort; cards fall back to the puuid.
	}

	return mapWithConcurrency(match.players, concurrency, async (player) => {
		const enrichment = await enrichPlayerStats(
			transport,
			auth,
			match,
			player.puuid,
			options,
		);
		return {
			...player,
			riotId: names.get(player.puuid),
			rank: enrichment.rank,
			level: enrichment.level,
			stats: enrichment.stats,
			error: enrichment.error,
		};
	});
}

/** Clear cached per-player enrichment (e.g. on sign-out or for tests). */
export function clearPlayerEnrichmentCache(): void {
	enrichmentCache.clear();
}
