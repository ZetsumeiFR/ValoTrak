import { useQuery } from "@tanstack/react-query";
import {
	getPenalties,
	mapPenalties,
	type PenaltyStatus,
} from "@valotrak/valorant";

import { enrichTransport, isDesktop } from "@/lib/valorant-bridge";
import { useRiotSession } from "./use-riot-session";

const NONE: PenaltyStatus = { active: false, count: 0 };

/**
 * Matchmaking restrictions in force on the account.
 *
 * Riot documents the entries as `unknown[]`, so only their presence and count
 * are reported — never a nature or a duration this app cannot actually know.
 */
export function usePenalties(): PenaltyStatus {
	const { tokens, isResolving } = useRiotSession();
	const query = useQuery({
		queryKey: ["valorant", "penalties", tokens?.puuid ?? null] as const,
		queryFn: async (): Promise<PenaltyStatus> => {
			if (!tokens?.region || !tokens.shard) {
				return NONE;
			}
			return mapPenalties(
				await getPenalties(enrichTransport, tokens, {
					region: tokens.region,
					shard: tokens.shard,
				}),
			);
		},
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60,
	});
	return query.data ?? NONE;
}
