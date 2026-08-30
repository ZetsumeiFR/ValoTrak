import { pdBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

/**
 * Riot's own documentation types the entries as `unknown[]`: the shape of a
 * single penalty is undocumented. This client therefore reports whether
 * restrictions exist and how many, and claims nothing about their nature or
 * their duration.
 */
export interface RawPenalties {
	Subject?: string;
	Version?: number;
	Penalties?: unknown[];
}

export interface PenaltyStatus {
	active: boolean;
	count: number;
}

export function mapPenalties(raw: RawPenalties): PenaltyStatus {
	const count = raw.Penalties?.length ?? 0;
	return { active: count > 0, count };
}

export async function getPenalties(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
): Promise<RawPenalties> {
	return riotJson<RawPenalties>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/restrictions/v3/penalties`,
		headers: buildAuthHeaders(auth),
	});
}
