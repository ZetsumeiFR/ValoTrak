import { useQuery } from "@tanstack/react-query";
import {
	type ContractProgress,
	findActiveContract,
	getContracts,
} from "@valotrak/valorant";

import { enrichTransport, isDesktop } from "@/lib/valorant-bridge";
import { useRiotSession } from "./use-riot-session";

/** Progress on the contract Riot currently flags as active. */
export function useActiveContract(): ContractProgress | null {
	const { tokens, isResolving } = useRiotSession();
	const query = useQuery({
		queryKey: ["valorant", "contracts", tokens?.puuid ?? null] as const,
		queryFn: async (): Promise<ContractProgress | null> => {
			if (!tokens?.region || !tokens.shard) {
				return null;
			}
			const raw = await getContracts(
				enrichTransport,
				tokens,
				{ region: tokens.region, shard: tokens.shard },
				tokens.puuid,
			);
			return findActiveContract(raw) ?? null;
		},
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60 * 5,
	});
	return query.data ?? null;
}
