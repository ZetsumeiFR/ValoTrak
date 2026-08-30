import { useQuery } from "@tanstack/react-query";
import {
	findActiveAct,
	getContent,
	mapSeasons,
	type SeasonInfo,
} from "@valotrak/valorant";

import { enrichTransport, isDesktop } from "@/lib/valorant-bridge";
import { useRiotSession } from "./use-riot-session";

const EMPTY: SeasonInfo[] = [];

/** Episodes and acts, for labelling history with the act it belongs to. */
export function useSeasons(): SeasonInfo[] {
	const { tokens, isResolving } = useRiotSession();
	const query = useQuery({
		queryKey: ["valorant", "seasons", tokens?.shard ?? null] as const,
		queryFn: async (): Promise<SeasonInfo[]> => {
			if (!tokens?.region || !tokens.shard) {
				return EMPTY;
			}
			return mapSeasons(
				await getContent(enrichTransport, tokens, {
					region: tokens.region,
					shard: tokens.shard,
				}),
			);
		},
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		// Acts last months; refetching more than once a day is pointless.
		staleTime: 1000 * 60 * 60 * 24,
	});
	return query.data ?? EMPTY;
}

export function useActiveAct(): SeasonInfo | undefined {
	return findActiveAct(useSeasons());
}
