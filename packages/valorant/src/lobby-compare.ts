import type { AggregatedStats, EnrichedPlayer } from "./types";

/** Reference values a lobby is measured against. */
export interface LobbyBaseline {
	kd: number;
	acs: number;
	hsPercent: number;
	winRate: number;
	/** How many players contributed to the baseline. */
	sampleSize: number;
}

/** Signed distance from the lobby baseline, in the stat's own unit. */
export interface LobbyDelta {
	kd: number;
	acs: number;
	hsPercent: number;
	winRate: number;
}

/**
 * Below this many enriched players a "lobby average" is noise: with one or two
 * samples a player would mostly be compared against themselves.
 */
const MIN_SAMPLE = 3;

/**
 * Median rather than mean: a lobby is ten people, so one smurf or one player
 * with a single analysed match moves a mean far enough to make every other
 * comparison wrong.
 */
function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
	}
	return sorted[mid] ?? 0;
}

/**
 * Reference values for the lobby, or `undefined` when too few players have
 * been enriched for the comparison to mean anything.
 */
export function computeLobbyBaseline(
	players: EnrichedPlayer[],
): LobbyBaseline | undefined {
	const samples = players
		.map((player) => player.stats)
		.filter((stats): stats is AggregatedStats => stats !== undefined);
	if (samples.length < MIN_SAMPLE) {
		return undefined;
	}
	return {
		kd: median(samples.map((stats) => stats.kd)),
		acs: median(samples.map((stats) => stats.acs)),
		hsPercent: median(samples.map((stats) => stats.hsPercent)),
		winRate: median(samples.map((stats) => stats.winRate)),
		sampleSize: samples.length,
	};
}

/** How far a player sits from the lobby baseline, per stat. */
export function comparePlayerToLobby(
	stats: AggregatedStats,
	baseline: LobbyBaseline,
): LobbyDelta {
	return {
		kd: stats.kd - baseline.kd,
		acs: stats.acs - baseline.acs,
		hsPercent: stats.hsPercent - baseline.hsPercent,
		winRate: stats.winRate - baseline.winRate,
	};
}
