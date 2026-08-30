import { glzBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

export interface RawLoadoutSocket {
	ID?: string;
	Item?: { ID?: string; TypeID?: string };
}

export interface RawLoadoutItem {
	ID?: string;
	TypeID?: string;
	Sockets?: Record<string, RawLoadoutSocket>;
}

export interface RawPlayerLoadout {
	Subject?: string;
	Items?: Record<string, RawLoadoutItem>;
}

export interface RawLobbyLoadoutEntry extends RawPlayerLoadout {
	CharacterID?: string;
	Loadout?: RawPlayerLoadout;
}

export interface RawLobbyLoadouts {
	Loadouts?: RawLobbyLoadoutEntry[];
}

/** Every cosmetic id a lobby player has equipped, attributed to their puuid. */
export interface LobbyLoadout {
	puuid: string;
	characterId?: string;
	itemIds: string[];
}

/**
 * Flatten a lobby loadout payload to one entry per player.
 *
 * Socket ids are deliberately ignored: the caller resolves the collected item
 * ids against the static skin catalogue, so the mapping keeps working if Riot
 * renumbers or adds sockets. Entries without a subject are dropped — an
 * unattributable loadout is worse than none.
 */
export function mapLobbyLoadouts(raw: RawLobbyLoadouts): LobbyLoadout[] {
	const loadouts: LobbyLoadout[] = [];
	for (const entry of raw.Loadouts ?? []) {
		const inner = entry.Loadout ?? entry;
		const puuid = inner.Subject ?? entry.Subject;
		if (!puuid) {
			continue;
		}
		const itemIds = new Set<string>();
		for (const item of Object.values(inner.Items ?? {})) {
			for (const socket of Object.values(item.Sockets ?? {})) {
				const id = socket.Item?.ID;
				if (id) {
					itemIds.add(id);
				}
			}
		}
		loadouts.push({
			puuid,
			characterId: entry.CharacterID,
			itemIds: [...itemIds],
		});
	}
	return loadouts;
}

export async function getCoreGameLoadouts(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	matchId: string,
): Promise<RawLobbyLoadouts> {
	return riotJson<RawLobbyLoadouts>(transport, {
		method: "GET",
		url: `${glzBase(shard)}/core-game/v1/matches/${matchId}/loadouts`,
		headers: buildAuthHeaders(auth),
	});
}

export async function getPregameLoadouts(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	matchId: string,
): Promise<RawLobbyLoadouts> {
	return riotJson<RawLobbyLoadouts>(transport, {
		method: "GET",
		url: `${glzBase(shard)}/pregame/v1/matches/${matchId}/loadouts`,
		headers: buildAuthHeaders(auth),
	});
}
