import { useQuery } from "@tanstack/react-query";
import {
	getLeaderboard,
	type LeaderboardSnapshot,
	mapLeaderboard,
} from "@valotrak/valorant";

import { enrichTransport, isDesktop } from "@/lib/valorant-bridge";
import { useRiotSession } from "./use-riot-session";
import { useActiveAct } from "./use-seasons";

/**
 * How much of the ladder is fetched. The ladder holds tens of thousands of
 * entries; paging through all of them to locate one player is not worth the
 * requests, so a player outside this window simply has no placement shown.
 */
const LEADERBOARD_WINDOW = 200;

export function useLeaderboard(puuid: string): LeaderboardSnapshot | null {
	const { tokens, isResolving } = useRiotSession();
	const act = useActiveAct();

	const query = useQuery({
		queryKey: ["valorant", "leaderboard", act?.id ?? null, puuid] as const,
		queryFn: async (): Promise<LeaderboardSnapshot | null> => {
			if (!tokens?.region || !tokens.shard || !act) {
				return null;
			}
			const raw = await getLeaderboard(
				enrichTransport,
				tokens,
				{ region: tokens.region, shard: tokens.shard },
				act.id,
				{ size: LEADERBOARD_WINDOW },
			);
			return mapLeaderboard(raw, puuid);
		},
		enabled: (!isDesktop() || !isResolving) && Boolean(act) && puuid.length > 0,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60 * 10,
	});

	return query.data ?? null;
}
