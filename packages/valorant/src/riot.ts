import { DEFAULT_MATCH_COUNT, type QueueId, UNRANKED_TIER } from "./constants";
import { glzBase, pdBase, type RiotShard } from "./endpoints";
import type { RawStorefront } from "./storefront";
import {
	buildAuthHeaders,
	RiotApiError,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";
import type {
	RankInfo,
	RawAccountXp,
	RawMatchDetails,
	RawMatchHistory,
	RawMatchHistoryEntry,
	RawMmr,
	RawNameServiceEntry,
	RiotId,
} from "./types";

/**
 * Authenticated clients for the Riot pvp.net endpoints (undocumented).
 *
 * Every call needs a {@link RiotAuth} obtained from the Tauri `get_local_tokens`
 * command and a {@link RiotShard} from region detection. The `transport` must be
 * the Rust-backed one in the app (CORS) — see {@link RiotTransport}.
 */

export async function getMmr(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
): Promise<RawMmr> {
	return riotJson<RawMmr>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/mmr/v1/players/${puuid}`,
		headers: buildAuthHeaders(auth),
	});
}

export async function getAccountXp(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
): Promise<RawAccountXp> {
	return riotJson<RawAccountXp>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/account-xp/v1/players/${puuid}`,
		headers: buildAuthHeaders(auth),
	});
}

export interface MatchHistoryOptions {
	startIndex?: number;
	endIndex?: number;
	queue?: QueueId;
}

export async function getMatchHistory(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
	options: MatchHistoryOptions = {},
): Promise<RawMatchHistoryEntry[]> {
	const startIndex = options.startIndex ?? 0;
	const endIndex = options.endIndex ?? startIndex + DEFAULT_MATCH_COUNT;
	const params = new URLSearchParams({
		startIndex: String(startIndex),
		endIndex: String(endIndex),
	});
	if (options.queue) {
		params.set("queue", options.queue);
	}
	const res = await riotJson<RawMatchHistory>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/match-history/v1/history/${puuid}?${params}`,
		headers: buildAuthHeaders(auth),
	});
	return res.History ?? [];
}

export async function getMatchDetails(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	matchId: string,
): Promise<RawMatchDetails> {
	return riotJson<RawMatchDetails>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/match-details/v1/matches/${matchId}`,
		headers: buildAuthHeaders(auth),
	});
}

/** Resolve Riot IDs for a batch of puuids. Returns a puuid -> RiotId map. */
export async function getNames(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuids: string[],
): Promise<Map<string, RiotId>> {
	if (puuids.length === 0) {
		return new Map();
	}
	const entries = await riotJson<RawNameServiceEntry[]>(transport, {
		method: "PUT",
		url: `${pdBase(shard.shard)}/name-service/v2/players`,
		headers: { ...buildAuthHeaders(auth), "Content-Type": "application/json" },
		body: JSON.stringify(puuids),
	});
	const map = new Map<string, RiotId>();
	for (const entry of entries) {
		map.set(entry.Subject, {
			gameName: entry.GameName,
			tagLine: entry.TagLine,
		});
	}
	return map;
}

/**
 * Dodge the current agent-select (pregame) match without quitting the game.
 *
 * `POST {glz}/pregame/v1/matches/{matchId}/quit`. Only valid during pregame.
 * Dodging incurs Riot's usual penalties (RR loss + a queue restriction).
 */
export async function quitPregame(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	matchId: string,
): Promise<void> {
	const url = `${glzBase(shard)}/pregame/v1/matches/${matchId}/quit`;
	const res = await transport({
		method: "POST",
		url,
		headers: buildAuthHeaders(auth),
	});
	if (!res.ok) {
		throw new RiotApiError(url, res.status, res.body);
	}
}

/**
 * Fetch the player's storefront (daily shop, bundles, and Night Market).
 *
 * `POST {pd}/store/v3/storefront/{puuid}`. The v3 endpoint requires a POST with
 * an empty JSON object body. Returns the raw parsed response — map it with
 * `mapStorefront`.
 */
export async function getStorefront(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
): Promise<RawStorefront> {
	return riotJson<RawStorefront>(transport, {
		method: "POST",
		url: `${pdBase(shard.shard)}/store/v3/storefront/${puuid}`,
		headers: { ...buildAuthHeaders(auth), "Content-Type": "application/json" },
		body: "{}",
	});
}

/** Extract the current rank + RR from an MMR response. */
export function extractRank(mmr: RawMmr): RankInfo {
	const update = mmr.LatestCompetitiveUpdate;
	return {
		tier: update?.TierAfterUpdate ?? UNRANKED_TIER,
		rr: update?.RankedRatingAfterUpdate ?? 0,
		peakTier: extractPeakTier(mmr),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(value: unknown, key: string): number | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	const field = value[key];
	return typeof field === "number" && Number.isFinite(field)
		? field
		: undefined;
}

function extractPeakTier(mmr: RawMmr): number | undefined {
	const seasonalInfo = mmr.QueueSkills?.competitive;
	if (!isRecord(seasonalInfo)) {
		return undefined;
	}

	const bySeason = seasonalInfo.SeasonalInfoBySeasonID;
	if (!isRecord(bySeason)) {
		return undefined;
	}

	let peak: number | undefined;
	for (const season of Object.values(bySeason)) {
		const tier = numberField(season, "CompetitiveTier");
		if (tier === undefined || tier <= UNRANKED_TIER) {
			continue;
		}
		peak = peak === undefined ? tier : Math.max(peak, tier);
	}
	return peak;
}

export function extractAccountLevel(
	accountXp: RawAccountXp,
): number | undefined {
	const level =
		accountXp.Progress?.Level ?? accountXp.Level ?? accountXp.AccountLevel;
	return typeof level === "number" && Number.isFinite(level) && level >= 0
		? Math.floor(level)
		: undefined;
}
