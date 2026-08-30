import type { RawMatchDetails } from "./types";

/**
 * Players who shared a team with `puuid` in the analysed matches.
 *
 * Riot exposes no party information for a lobby — neither pregame nor coregame
 * carries a party id, and the parties endpoint only answers for your own
 * puuid. Recent co-play is the only signal available, and it comes for free:
 * these match details are already downloaded to compute the stats.
 */
export function extractRecentTeammates(
	puuid: string,
	matches: RawMatchDetails[],
): string[] {
	const teammates = new Set<string>();
	for (const match of matches) {
		const self = match.players.find((player) => player.subject === puuid);
		if (!self) {
			continue;
		}
		for (const other of match.players) {
			if (other.subject !== puuid && other.teamId === self.teamId) {
				teammates.add(other.subject);
			}
		}
	}
	return [...teammates];
}

export interface PremadeCandidate {
	puuid: string;
	recentTeammates?: string[];
}

/**
 * Group lobby players that recently played together, as `puuid -> group
 * number` (1-based, in lobby order). Players with no link are absent.
 *
 * This is a heuristic, not ground truth: it says "these players queue
 * together", which is evidence of a party but not proof, and it cannot see a
 * party formed for the very first time. Present it as such.
 */
export function inferPremadeGroups(
	players: PremadeCandidate[],
): Map<string, number> {
	const lobby = new Set(players.map((player) => player.puuid));
	const adjacency = new Map<string, Set<string>>();
	for (const player of players) {
		adjacency.set(player.puuid, new Set());
	}
	for (const player of players) {
		for (const mate of player.recentTeammates ?? []) {
			if (mate === player.puuid || !lobby.has(mate)) {
				continue;
			}
			// One-sided evidence is enough: a shared match can sit inside one
			// player's window and outside the other's.
			adjacency.get(player.puuid)?.add(mate);
			adjacency.get(mate)?.add(player.puuid);
		}
	}

	const groups = new Map<string, number>();
	const visited = new Set<string>();
	let nextGroup = 1;
	for (const player of players) {
		if (visited.has(player.puuid)) {
			continue;
		}
		const component: string[] = [];
		const queue = [player.puuid];
		visited.add(player.puuid);
		while (queue.length > 0) {
			const current = queue.shift();
			if (current === undefined) {
				break;
			}
			component.push(current);
			for (const neighbour of adjacency.get(current) ?? []) {
				if (!visited.has(neighbour)) {
					visited.add(neighbour);
					queue.push(neighbour);
				}
			}
		}
		if (component.length >= 2) {
			for (const member of component) {
				groups.set(member, nextGroup);
			}
			nextGroup += 1;
		}
	}
	return groups;
}
