import { useQuery } from "@tanstack/react-query";
import {
	getCompetitiveUpdates,
	mapCompetitiveUpdates,
	type RankedMatch,
} from "@valotrak/valorant";

import {
	enrichTransport,
	isDesktop,
	type LocalTokens,
} from "@/lib/valorant-bridge";
import { useRiotSession } from "./use-riot-session";

/** How far back the ranked history is charted. */
const RANKED_HISTORY_COUNT = 25;

async function loadRankedHistory(
	tokens: LocalTokens | null,
	puuid: string,
): Promise<RankedMatch[]> {
	// No Riot session means no ranked history; the stored snapshots stay the
	// only source and the charts degrade to what they showed before.
	if (!tokens?.region || !tokens.shard) {
		return [];
	}
	const raw = await getCompetitiveUpdates(
		enrichTransport,
		tokens,
		{ region: tokens.region, shard: tokens.shard },
		puuid,
		{ endIndex: RANKED_HISTORY_COUNT, queue: "competitive" },
	);
	return mapCompetitiveUpdates(raw);
}

/**
 * Riot's own ranked history for a player: real rating per match, including
 * games played long before this app was installed.
 */
export function useRankedHistory(puuid: string) {
	const { tokens, isResolving } = useRiotSession();
	return useQuery({
		queryKey: [
			"valorant",
			"ranked-history",
			puuid,
			tokens?.shard ?? null,
		] as const,
		queryFn: () => loadRankedHistory(tokens, puuid),
		enabled: (!isDesktop() || !isResolving) && puuid.length > 0,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60 * 5,
	});
}
