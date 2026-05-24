import { queryOptions } from "@tanstack/react-query";
import {
	type Agent,
	type CompetitiveTier,
	getAgents,
	getCompetitiveTiers,
	getMaps,
	type MapInfo,
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
