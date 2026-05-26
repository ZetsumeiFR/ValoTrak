import { useQuery } from "@tanstack/react-query";
import {
	buildMatchScoreboard,
	getMatchDetailsCached,
	getNames,
	type MatchScoreboard,
	type RiotId,
} from "@valotrak/valorant";

import {
	enrichTransport,
	getLocalTokens,
	isAppError,
	isDesktop,
} from "@/lib/valorant-bridge";

export interface MatchDetailData {
	scoreboard: MatchScoreboard;
	/** puuid -> Riot ID (best-effort; falls back to the puuid in the UI). */
	names: Map<string, RiotId>;
	selfPuuid: string;
}

/** Thrown when the recap can't be fetched (no desktop shell / game not running). */
function unavailable(): Error {
	return Object.assign(new Error("recap unavailable"), {
		kind: "unavailable" as const,
	});
}

async function loadMatchDetail(matchId: string): Promise<MatchDetailData> {
	if (!isDesktop()) {
		throw unavailable();
	}

	let tokens: Awaited<ReturnType<typeof getLocalTokens>>;
	try {
		tokens = await getLocalTokens();
	} catch (error) {
		if (isAppError(error) && error.kind === "notAvailable") {
			throw unavailable();
		}
		throw error;
	}

	if (!tokens.region || !tokens.shard) {
		throw Object.assign(new Error("recap needs region"), {
			kind: "needRegion" as const,
		});
	}

	const shard = { region: tokens.region, shard: tokens.shard };
	const details = await getMatchDetailsCached(
		enrichTransport,
		tokens,
		shard,
		matchId,
	);
	const scoreboard = buildMatchScoreboard(details);

	// Names are best-effort: a failure here shouldn't hide the scoreboard.
	let names = new Map<string, RiotId>();
	try {
		names = await getNames(
			enrichTransport,
			tokens,
			shard,
			scoreboard.players.map((player) => player.puuid),
		);
	} catch {
		// Cards fall back to the puuid.
	}

	return { scoreboard, names, selfPuuid: tokens.puuid };
}

export function isRecapUnavailable(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error as { kind?: string }).kind === "unavailable"
	);
}

export function useMatchDetail(matchId: string) {
	return useQuery({
		queryKey: ["valorant", "match-detail", matchId] as const,
		queryFn: () => loadMatchDetail(matchId),
		retry: false,
		refetchOnWindowFocus: false,
		// A finished match never changes.
		staleTime: 1000 * 60 * 60,
	});
}
