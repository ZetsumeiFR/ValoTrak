import type { AgentUsage, AggregatedStats, RawMatchDetails } from "./types";

/** Round to two decimals. */
function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

const EMPTY_STATS: AggregatedStats = {
	matchesAnalyzed: 0,
	kd: 0,
	avgKills: 0,
	avgDeaths: 0,
	avgAssists: 0,
	acs: 0,
	hsPercent: 0,
	winRate: 0,
	wins: 0,
	losses: 0,
	mainAgents: [],
};

interface AgentTally {
	games: number;
	wins: number;
}

/**
 * Aggregate a player's recent performance from a list of match details.
 *
 * Pure function — testable on fixtures, no network. ACS is computed as total
 * combat score over total rounds; HS% from per-round damage shot locations.
 */
export function computeAggregatedStats(
	puuid: string,
	matches: RawMatchDetails[],
): AggregatedStats {
	let matchesAnalyzed = 0;
	let totalKills = 0;
	let totalDeaths = 0;
	let totalAssists = 0;
	let totalScore = 0;
	let totalRounds = 0;
	let wins = 0;
	let losses = 0;
	let headshots = 0;
	let bodyshots = 0;
	let legshots = 0;
	const agents = new Map<string, AgentTally>();

	for (const match of matches) {
		const player = match.players.find((p) => p.subject === puuid);
		if (!player) {
			continue;
		}
		matchesAnalyzed += 1;

		const stats = player.stats;
		if (stats) {
			totalKills += stats.kills;
			totalDeaths += stats.deaths;
			totalAssists += stats.assists;
			totalScore += stats.score;
			totalRounds += stats.roundsPlayed;
		}

		const team = match.teams?.find((t) => t.teamId === player.teamId);
		const decidedResult = team ? team.won : null;
		if (decidedResult !== null) {
			if (decidedResult) {
				wins += 1;
			} else {
				losses += 1;
			}
		}

		const tally = agents.get(player.characterId) ?? { games: 0, wins: 0 };
		if (decidedResult !== null) {
			tally.games += 1;
			if (decidedResult) {
				tally.wins += 1;
			}
			agents.set(player.characterId, tally);
		}

		for (const round of match.roundResults ?? []) {
			const ps = round.playerStats?.find((s) => s.subject === puuid);
			for (const dmg of ps?.damage ?? []) {
				headshots += dmg.headshots;
				bodyshots += dmg.bodyshots;
				legshots += dmg.legshots;
			}
		}
	}

	if (matchesAnalyzed === 0) {
		return { ...EMPTY_STATS };
	}

	const totalShots = headshots + bodyshots + legshots;
	const decided = wins + losses;
	const mainAgents: AgentUsage[] = [...agents.entries()]
		.map(([agentId, tally]) => ({
			agentId,
			games: tally.games,
			winRate: tally.games > 0 ? round2((tally.wins / tally.games) * 100) : 0,
		}))
		.sort((a, b) => b.games - a.games);

	return {
		matchesAnalyzed,
		kd: round2(totalDeaths > 0 ? totalKills / totalDeaths : totalKills),
		avgKills: round2(totalKills / matchesAnalyzed),
		avgDeaths: round2(totalDeaths / matchesAnalyzed),
		avgAssists: round2(totalAssists / matchesAnalyzed),
		acs: round2(totalRounds > 0 ? totalScore / totalRounds : 0),
		hsPercent: round2(totalShots > 0 ? (headshots / totalShots) * 100 : 0),
		winRate: round2(decided > 0 ? (wins / decided) * 100 : 0),
		wins,
		losses,
		mainAgents,
	};
}
