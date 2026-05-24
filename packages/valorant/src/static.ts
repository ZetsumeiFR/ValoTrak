import { VALORANT_API_BASE } from "./constants";
import { fetchTransport, type RiotTransport, riotJson } from "./transport";
import type { Agent, ClientVersion, CompetitiveTier } from "./types";

/**
 * Clients for the community static-asset API (valorant-api.com).
 *
 * These have no auth, send permissive CORS headers, and rarely change — cache
 * the results aggressively (e.g. TanStack Query with a long `staleTime`).
 */

interface ValorantApiEnvelope<T> {
	status: number;
	data: T;
}

interface RawAgent {
	uuid: string;
	displayName: string;
	displayIcon: string | null;
	isPlayableCharacter: boolean;
	role: { displayName: string } | null;
}

interface RawTier {
	tier: number;
	tierName: string;
	divisionName: string;
	color: string;
	backgroundColor: string;
	smallIcon: string | null;
	largeIcon: string | null;
}

interface RawTierSet {
	tiers: RawTier[];
}

export async function getAgents(
	transport: RiotTransport = fetchTransport,
): Promise<Agent[]> {
	const res = await riotJson<ValorantApiEnvelope<RawAgent[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/agents?isPlayableCharacter=true`,
	});
	return res.data.map((a) => ({
		uuid: a.uuid,
		displayName: a.displayName,
		displayIcon: a.displayIcon,
		role: a.role?.displayName ?? null,
	}));
}

export async function getCompetitiveTiers(
	transport: RiotTransport = fetchTransport,
): Promise<CompetitiveTier[]> {
	const res = await riotJson<ValorantApiEnvelope<RawTierSet[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/competitivetiers`,
	});
	// The last tier set is the current episode's ranking system.
	const current = res.data.at(-1);
	if (!current) {
		return [];
	}
	return current.tiers.map((t) => ({
		tier: t.tier,
		tierName: t.tierName,
		divisionName: t.divisionName,
		color: t.color,
		backgroundColor: t.backgroundColor,
		smallIcon: t.smallIcon,
		largeIcon: t.largeIcon,
	}));
}

export async function getVersion(
	transport: RiotTransport = fetchTransport,
): Promise<ClientVersion> {
	const res = await riotJson<ValorantApiEnvelope<ClientVersion>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/version`,
	});
	return res.data;
}
