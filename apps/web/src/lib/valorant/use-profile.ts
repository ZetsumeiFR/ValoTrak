import { useQuery } from "@tanstack/react-query";
import { demoProfile, enrichProfile, type Profile } from "@valotrak/valorant";

import i18n from "@/lib/i18n";
import {
	enrichTransport,
	getLocalTokens,
	isAppError,
	isDesktop,
} from "@/lib/valorant-bridge";

export interface ProfileData extends Profile {
	isDemo: boolean;
}

function demoResult(): ProfileData {
	return { ...demoProfile(), isDemo: true };
}

async function loadProfile(): Promise<ProfileData> {
	if (!isDesktop()) {
		return demoResult();
	}

	let tokens: Awaited<ReturnType<typeof getLocalTokens>>;
	try {
		tokens = await getLocalTokens();
	} catch (error) {
		if (isAppError(error) && error.kind === "notAvailable") {
			return demoResult();
		}
		throw error;
	}

	if (!tokens.region || !tokens.shard) {
		throw Object.assign(new Error(i18n.t("profileData.regionError")), {
			kind: "needRegion" as const,
		});
	}

	const profile = await enrichProfile(
		enrichTransport,
		tokens,
		{ region: tokens.region, shard: tokens.shard },
		tokens.puuid,
	);
	return { ...profile, isDemo: false };
}

export function useProfile() {
	return useQuery({
		queryKey: ["valorant", "profile"] as const,
		queryFn: loadProfile,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60,
	});
}
