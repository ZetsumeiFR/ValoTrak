import { useQuery } from "@tanstack/react-query";
import {
	getStorefront,
	mapStorefront,
	type Storefront,
} from "@valotrak/valorant";

import i18n from "@/lib/i18n";
import { useRiotSession } from "@/lib/valorant/use-riot-session";
import {
	enrichTransport,
	isDesktop,
	type LocalTokens,
} from "@/lib/valorant-bridge";

export type StoreData = Storefront;

async function loadStore(tokens: LocalTokens | null): Promise<StoreData> {
	if (!tokens) {
		throw Object.assign(new Error(i18n.t("riot.needLoginDesc")), {
			kind: "needLogin" as const,
		});
	}

	if (!tokens.region || !tokens.shard) {
		throw Object.assign(new Error(i18n.t("profileData.regionError")), {
			kind: "needRegion" as const,
		});
	}

	const raw = await getStorefront(
		enrichTransport,
		tokens,
		{ region: tokens.region, shard: tokens.shard },
		tokens.puuid,
	);
	return mapStorefront(raw);
}

export function useStore() {
	const { tokens, isResolving } = useRiotSession();
	return useQuery({
		queryKey: ["valorant", "store", tokens?.puuid ?? null] as const,
		queryFn: () => loadStore(tokens),
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		// The shop only rotates daily; a few minutes of cache is plenty.
		staleTime: 1000 * 60 * 5,
	});
}
