import { queryOptions } from "@tanstack/react-query";
import {
	type Agent,
	type CompetitiveTier,
	getAgents,
	getCompetitiveTiers,
} from "@valorant-tracker/valorant";

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
