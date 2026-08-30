import { pdBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

export interface RawLeaderboardPlayer {
	puuid?: string;
	gameName?: string;
	tagLine?: string;
	leaderboardRank?: number;
	rankedRating?: number;
	numberOfWins?: number;
	competitiveTier?: number;
	IsBanned?: boolean;
	IsAnonymized?: boolean;
}

export interface RawLeaderboard {
	Deployment?: string;
	QueueID?: string;
	SeasonID?: string;
	Players?: RawLeaderboardPlayer[];
	totalPlayers?: number;
	immortalStartingPage?: number;
	immortalStartingIndex?: number;
	topTierRRThreshold?: number;
}

export interface LeaderboardEntry {
	puuid: string;
	gameName?: string;
	tagLine?: string;
	rank: number;
	rankedRating: number;
	wins: number;
	tier: number;
}

export interface LeaderboardSnapshot {
	totalPlayers: number;
	/** Rating needed to hold the top tier, when Riot publishes it. */
	topTierRrThreshold?: number;
	/**
	 * The requested player, present only when they fall inside the fetched
	 * window: the ladder holds tens of thousands of entries and paging through
	 * all of them to find one player is not worth the requests.
	 */
	self?: LeaderboardEntry;
}

export interface LeaderboardOptions {
	startIndex?: number;
	size?: number;
}

const DEFAULT_LEADERBOARD_SIZE = 200;

export function mapLeaderboard(
	raw: RawLeaderboard,
	puuid: string,
): LeaderboardSnapshot {
	const found = (raw.Players ?? []).find((player) => player.puuid === puuid);
	return {
		totalPlayers: raw.totalPlayers ?? 0,
		topTierRrThreshold: raw.topTierRRThreshold,
		self: found
			? {
					puuid: found.puuid ?? puuid,
					gameName: found.gameName,
					tagLine: found.tagLine,
					rank: found.leaderboardRank ?? 0,
					rankedRating: found.rankedRating ?? 0,
					wins: found.numberOfWins ?? 0,
					tier: found.competitiveTier ?? 0,
				}
			: undefined,
	};
}

export async function getLeaderboard(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	seasonId: string,
	options: LeaderboardOptions = {},
): Promise<RawLeaderboard> {
	const params = new URLSearchParams({
		startIndex: String(options.startIndex ?? 0),
		size: String(options.size ?? DEFAULT_LEADERBOARD_SIZE),
	});
	return riotJson<RawLeaderboard>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/mmr/v1/leaderboards/affinity/${shard.region}/queue/competitive/season/${seasonId}?${params}`,
		headers: buildAuthHeaders(auth),
	});
}
