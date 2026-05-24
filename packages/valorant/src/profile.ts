import { computeAggregatedStats } from "./aggregate";
import { getMatchDetailsCached } from "./cache";
import { DEFAULT_MATCH_COUNT, QUEUE, type QueueId } from "./constants";
import type { RiotShard } from "./endpoints";
import { extractRank, getMatchHistory, getMmr, getNames } from "./riot";
import type { RiotAuth, RiotTransport } from "./transport";
import type { MatchSummary, Profile, RawMatchDetails } from "./types";

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Build a compact per-match summary for one player from full match details. */
export function summarizeMatch(
	puuid: string,
	match: RawMatchDetails,
): MatchSummary | null {
	const player = match.players.find((entry) => entry.subject === puuid);
	if (!player) {
		return null;
	}

	const stats = player.stats;
	const rounds = stats?.roundsPlayed ?? 0;
	const acs = rounds > 0 ? round2((stats?.score ?? 0) / rounds) : 0;

	let headshots = 0;
	let bodyshots = 0;
	let legshots = 0;
	for (const round of match.roundResults ?? []) {
		const ps = round.playerStats?.find((entry) => entry.subject === puuid);
		for (const dmg of ps?.damage ?? []) {
			headshots += dmg.headshots;
			bodyshots += dmg.bodyshots;
			legshots += dmg.legshots;
		}
	}
	const totalShots = headshots + bodyshots + legshots;

	const team = match.teams?.find((entry) => entry.teamId === player.teamId);

	return {
		matchId: match.matchInfo.matchId,
		agentId: player.characterId,
		won: team?.won ?? false,
		kills: stats?.kills ?? 0,
		deaths: stats?.deaths ?? 0,
		assists: stats?.assists ?? 0,
		acs,
		hsPercent: totalShots > 0 ? round2((headshots / totalShots) * 100) : 0,
		queue: match.matchInfo.queueId,
		map: match.matchInfo.mapId,
		startedAt: match.matchInfo.gameStartMillis,
	};
}

export interface ProfileOptions {
	matchCount?: number;
	queue?: QueueId;
}

/** Resolve the full profile (Riot ID + rank + aggregated stats + timeline). */
export async function enrichProfile(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
	options: ProfileOptions = {},
): Promise<Profile> {
	const matchCount = options.matchCount ?? DEFAULT_MATCH_COUNT;
	const queue = options.queue ?? QUEUE.competitive;

	const [mmr, names, history] = await Promise.all([
		getMmr(transport, auth, shard, puuid),
		getNames(transport, auth, shard, [puuid]),
		getMatchHistory(transport, auth, shard, puuid, {
			endIndex: matchCount,
			queue,
		}),
	]);

	const details = await Promise.all(
		history.map((entry) =>
			getMatchDetailsCached(transport, auth, shard, entry.MatchID),
		),
	);

	const recentMatches = details
		.map((match) => summarizeMatch(puuid, match))
		.filter((summary): summary is MatchSummary => summary !== null);

	return {
		puuid,
		riotId: names.get(puuid),
		rank: extractRank(mmr),
		stats: computeAggregatedStats(puuid, details),
		recentMatches,
	};
}
