import { DEFAULT_MATCH_COUNT, type QueueId } from "./constants";
import { pdBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";
import type { TrendPoint } from "./types";

/** Raw entry of `mmr/v1/players/{puuid}/competitiveupdates`. */
export interface RawCompetitiveUpdateEntry {
	MatchID: string;
	MapID?: string;
	SeasonID?: string;
	/** Milliseconds since epoch. */
	MatchStartTime: number;
	TierAfterUpdate: number;
	TierBeforeUpdate?: number;
	RankedRatingAfterUpdate: number;
	RankedRatingBeforeUpdate?: number;
	RankedRatingEarned: number;
	RankedRatingPerformanceBonus?: number;
	CompetitiveMovement?: string;
}

export interface RawCompetitiveUpdates {
	Version?: number;
	Subject?: string;
	Matches?: RawCompetitiveUpdateEntry[];
}

/** One ranked match and what it did to the player's rating. */
export interface RankedMatch {
	matchId: string;
	mapId?: string;
	seasonId?: string;
	/** Milliseconds since epoch. */
	startedAt: number;
	tier: number;
	/** Rating after the match. */
	rr: number;
	/** Rating gained or lost. */
	rrChange: number;
	performanceBonus: number;
	movement?: string;
}

export interface CompetitiveUpdatesOptions {
	startIndex?: number;
	endIndex?: number;
	queue?: QueueId;
}

/**
 * Ranked history straight from Riot: every match with the rating it moved.
 *
 * Unlike the snapshot history this app records itself, this is retroactive —
 * it covers games played before ValoTrak was ever installed.
 */
export async function getCompetitiveUpdates(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
	options: CompetitiveUpdatesOptions = {},
): Promise<RawCompetitiveUpdates> {
	const startIndex = options.startIndex ?? 0;
	const endIndex = options.endIndex ?? startIndex + DEFAULT_MATCH_COUNT;
	const params = new URLSearchParams({
		startIndex: String(startIndex),
		endIndex: String(endIndex),
	});
	if (options.queue) {
		params.set("queue", options.queue);
	}
	return riotJson<RawCompetitiveUpdates>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/mmr/v1/players/${puuid}/competitiveupdates?${params}`,
		headers: buildAuthHeaders(auth),
	});
}

/**
 * Normalise ranked updates, oldest first.
 *
 * Entries that left the rating untouched are dropped: the endpoint also
 * returns rows for games that never affected the rank, and charting them as
 * a flat 0 would invent a rating collapse.
 */
export function mapCompetitiveUpdates(
	raw: RawCompetitiveUpdates,
): RankedMatch[] {
	return (raw.Matches ?? [])
		.filter(
			(entry) =>
				entry.TierAfterUpdate > 0 ||
				entry.RankedRatingAfterUpdate > 0 ||
				entry.RankedRatingEarned !== 0,
		)
		.map((entry) => ({
			matchId: entry.MatchID,
			mapId: entry.MapID,
			seasonId: entry.SeasonID,
			startedAt: entry.MatchStartTime,
			tier: entry.TierAfterUpdate,
			rr: entry.RankedRatingAfterUpdate,
			rrChange: entry.RankedRatingEarned,
			performanceBonus: entry.RankedRatingPerformanceBonus ?? 0,
			movement: entry.CompetitiveMovement,
		}))
		.sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Ranked history as chart points. Only rank data is filled in: this endpoint
 * knows nothing about K/D, ACS or headshots.
 */
export function rankedMatchesToTrend(matches: RankedMatch[]): TrendPoint[] {
	return matches.map((match) => ({
		capturedAt: match.startedAt,
		tier: match.tier,
		rr: match.rr,
		kd: null,
		acs: null,
		hsPercent: null,
		winRate: null,
	}));
}
