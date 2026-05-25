import { useQuery } from "@tanstack/react-query";
import { enrichProfile, type Profile } from "@valotrak/valorant";

import i18n from "@/lib/i18n";
import { useRiotSession } from "@/lib/valorant/use-riot-session";
import {
	enrichTransport,
	isDesktop,
	type LocalTokens,
} from "@/lib/valorant-bridge";

export type ProfileData = Profile;

async function loadProfile(tokens: LocalTokens | null): Promise<ProfileData> {
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

	return enrichProfile(
		enrichTransport,
		tokens,
		{ region: tokens.region, shard: tokens.shard },
		tokens.puuid,
	);
}

export function useProfile() {
	const { tokens, isResolving } = useRiotSession();
	return useQuery({
		queryKey: ["valorant", "profile", tokens?.puuid ?? null] as const,
		queryFn: () => loadProfile(tokens),
		// Wait for the session to resolve before deciding demo / login / load.
		enabled: !isDesktop() || !isResolving,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60,
	});
}
