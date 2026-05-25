import { queryOptions } from "@tanstack/react-query";
import {
	type Agent,
	type BundleInfo,
	type CompetitiveTier,
	type ContentTier,
	getAgents,
	getBundles,
	getCompetitiveTiers,
	getContentTiers,
	getMaps,
	getWeaponSkins,
	type MapInfo,
	type SkinLevel,
} from "@valotrak/valorant";

/** Static asset data from valorant-api.com — rarely changes, cache for a day. */
const STATIC_STALE_TIME = 1000 * 60 * 60 * 24;

export function agentsQueryOptions() {
	return queryOptions({
		queryKey: ["valorant", "agents"] as const,
		queryFn: () => getAgents(),
		staleTime: STATIC_STALE_TIME,
	});
}

export function tiersQueryOptions() {
	return queryOptions({
		queryKey: ["valorant", "tiers"] as const,
		queryFn: () => getCompetitiveTiers(),
		staleTime: STATIC_STALE_TIME,
	});
}

export function indexAgents(agents: Agent[] | undefined): Map<string, Agent> {
	return new Map((agents ?? []).map((agent) => [agent.uuid, agent]));
}

export function indexTiers(
	tiers: CompetitiveTier[] | undefined,
): Map<number, CompetitiveTier> {
	return new Map((tiers ?? []).map((tier) => [tier.tier, tier]));
}

export function mapsQueryOptions() {
	return queryOptions({
		queryKey: ["valorant", "maps"] as const,
		queryFn: () => getMaps(),
		staleTime: STATIC_STALE_TIME,
	});
}

export function indexMaps(maps: MapInfo[] | undefined): Map<string, MapInfo> {
	return new Map((maps ?? []).map((m) => [m.mapUrl, m]));
}

export function skinsQueryOptions() {
	return queryOptions({
		queryKey: ["valorant", "skins"] as const,
		queryFn: () => getWeaponSkins(),
		staleTime: STATIC_STALE_TIME,
	});
}

export function contentTiersQueryOptions() {
	return queryOptions({
		queryKey: ["valorant", "contentTiers"] as const,
		queryFn: () => getContentTiers(),
		staleTime: STATIC_STALE_TIME,
	});
}

export function bundlesQueryOptions() {
	return queryOptions({
		queryKey: ["valorant", "bundles"] as const,
		queryFn: () => getBundles(),
		staleTime: STATIC_STALE_TIME,
	});
}

/** Index skin levels by their level UUID (the storefront's offer id). */
export function indexSkins(
	skins: SkinLevel[] | undefined,
): Map<string, SkinLevel> {
	return new Map((skins ?? []).map((skin) => [skin.levelId, skin]));
}

export function indexContentTiers(
	tiers: ContentTier[] | undefined,
): Map<string, ContentTier> {
	return new Map((tiers ?? []).map((tier) => [tier.uuid, tier]));
}

export function indexBundles(
	bundles: BundleInfo[] | undefined,
): Map<string, BundleInfo> {
	return new Map((bundles ?? []).map((bundle) => [bundle.uuid, bundle]));
}

/**
 * Resolve a match's raw map path (`/Game/Maps/Ascent/Ascent`) to its display
 * name. Falls back to the last path segment when the map isn't in the index
 * (e.g. the static API hasn't loaded yet or Riot added a new map).
 */
export function mapDisplayName(
	mapsByUrl: Map<string, MapInfo>,
	mapUrl: string | undefined,
): string | undefined {
	if (!mapUrl) return undefined;
	const known = mapsByUrl.get(mapUrl);
	if (known) return known.displayName;
	return mapUrl.split("/").filter(Boolean).at(-1) ?? mapUrl;
}
