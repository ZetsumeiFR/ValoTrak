import { useQuery } from "@tanstack/react-query";
import {
	getOwnedItems,
	getWallet,
	ITEM_TYPE,
	mapWallet,
	type RiotShard,
	type Wallet,
} from "@valotrak/valorant";

import {
	enrichTransport,
	isDesktop,
	type LocalTokens,
} from "@/lib/valorant-bridge";
import { useRiotSession } from "./use-riot-session";

const EMPTY_OWNED: ReadonlySet<string> = new Set();

function shardOf(tokens: LocalTokens | null): RiotShard | null {
	return tokens?.region && tokens.shard
		? { region: tokens.region, shard: tokens.shard }
		: null;
}

/** Spendable balances. Absent without a Riot session. */
export function useWallet() {
	const { tokens, isResolving } = useRiotSession();
	return useQuery({
		queryKey: ["valorant", "wallet", tokens?.puuid ?? null] as const,
		queryFn: async (): Promise<Wallet | null> => {
			const shard = shardOf(tokens);
			if (!shard || !tokens) {
				return null;
			}
			return mapWallet(
				await getWallet(enrichTransport, tokens, shard, tokens.puuid),
			);
		},
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60,
	});
}

/**
 * Skin ids the player already owns.
 *
 * Entitlements barely change, so this is cached for an hour; an empty set
 * simply means "unknown", never "owns nothing".
 */
export function useOwnedSkins(): ReadonlySet<string> {
	const { tokens, isResolving } = useRiotSession();
	const query = useQuery({
		queryKey: ["valorant", "owned-skins", tokens?.puuid ?? null] as const,
		queryFn: async (): Promise<ReadonlySet<string>> => {
			const shard = shardOf(tokens);
			if (!shard || !tokens) {
				return EMPTY_OWNED;
			}
			const ids = await getOwnedItems(
				enrichTransport,
				tokens,
				shard,
				tokens.puuid,
				ITEM_TYPE.skins,
			);
			return new Set(ids);
		},
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60 * 60,
	});
	return query.data ?? EMPTY_OWNED;
}
