import { glzBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

export interface RawPartyPlayer {
	Subject?: string;
	Version?: number;
	CurrentPartyID?: string;
}

/**
 * Party a player currently belongs to.
 *
 * Only ever called for the signed-in player: whether Riot authorises this for
 * someone else's puuid is undocumented and untested, and a per-lobby fan-out
 * would be both rate-limit heavy and policy-sensitive.
 */
export async function getPartyPlayer(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
): Promise<RawPartyPlayer> {
	return riotJson<RawPartyPlayer>(transport, {
		method: "GET",
		url: `${glzBase(shard)}/parties/v1/players/${puuid}`,
		headers: buildAuthHeaders(auth),
	});
}

export function extractPartyId(raw: RawPartyPlayer): string | undefined {
	return raw.CurrentPartyID ? raw.CurrentPartyID : undefined;
}
