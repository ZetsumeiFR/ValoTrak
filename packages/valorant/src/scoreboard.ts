import type {
	MatchScoreboard,
	RawMatchDetails,
	ScoreboardPlayer,
	ScoreboardTeam,
} from "./types";

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * Build a finished match's full scoreboard from raw match details: every
 * player's per-match line (KDA, ACS, HS%) plus each team's rounds-won, sorted by
 * combat score. Headshot % is aggregated from per-round damage, mirroring
 * {@link summarizeMatch}'s single-player computation.
 */
export function buildMatchScoreboard(
	details: RawMatchDetails,
): MatchScoreboard {
	// Aggregate shot tallies per player across all rounds.
	const shots = new Map<string, { head: number; body: number; leg: number }>();
	for (const round of details.roundResults ?? []) {
		for (const ps of round.playerStats ?? []) {
			const tally = shots.get(ps.subject) ?? { head: 0, body: 0, leg: 0 };
			for (const dmg of ps.damage ?? []) {
				tally.head += dmg.headshots;
				tally.body += dmg.bodyshots;
				tally.leg += dmg.legshots;
			}
			shots.set(ps.subject, tally);
		}
	}

	const players: ScoreboardPlayer[] = details.players.map((player) => {
		const stats = player.stats;
		const rounds = stats?.roundsPlayed ?? 0;
		const score = stats?.score ?? 0;
		const tally = shots.get(player.subject);
		const total = tally ? tally.head + tally.body + tally.leg : 0;
		return {
			puuid: player.subject,
			teamId: player.teamId,
			agentId: player.characterId,
			tier: player.competitiveTier ?? 0,
			kills: stats?.kills ?? 0,
			deaths: stats?.deaths ?? 0,
			assists: stats?.assists ?? 0,
			acs: rounds > 0 ? round2(score / rounds) : 0,
			hsPercent: total > 0 && tally ? round2((tally.head / total) * 100) : 0,
			score,
		};
	});
	players.sort(
		(a, b) =>
			b.score - a.score ||
			b.kills - a.kills ||
			a.deaths - b.deaths ||
			b.assists - a.assists ||
			a.teamId.localeCompare(b.teamId) ||
			a.puuid.localeCompare(b.puuid),
	);

	const teams: ScoreboardTeam[] = (details.teams ?? []).map((team) => ({
		teamId: team.teamId,
		won: team.won,
		roundsWon: team.numPoints ?? 0,
	}));

	return {
		matchId: details.matchInfo.matchId,
		map: details.matchInfo.mapId,
		queue: details.matchInfo.queueId,
		startedAt: details.matchInfo.gameStartMillis,
		teams,
		players,
	};
}
