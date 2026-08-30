import { describe, expect, it } from "bun:test";

import {
	getCoreGameLoadouts,
	getPregameLoadouts,
	mapLobbyLoadouts,
	type RawLoadoutItem,
} from "./loadouts";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};
const shard = { region: "eu", shard: "eu" };

function weapon(...itemIds: string[]): RawLoadoutItem {
	return {
		ID: "weapon",
		Sockets: Object.fromEntries(
			itemIds.map((id, index) => [
				`socket-${index}`,
				{ ID: `socket-${index}`, Item: { ID: id } },
			]),
		),
	};
}

function capture(): { transport: RiotTransport; requests: RiotRequest[] } {
	const requests: RiotRequest[] = [];
	const transport: RiotTransport = async (
		req: RiotRequest,
	): Promise<RiotResponse> => {
		requests.push(req);
		return { status: 200, ok: true, body: JSON.stringify({ Loadouts: [] }) };
	};
	return { transport, requests };
}

describe("mapLobbyLoadouts", () => {
	it("attributes every equipped item id to its player", () => {
		const [loadout] = mapLobbyLoadouts({
			Loadouts: [
				{
					CharacterID: "jett",
					Loadout: {
						Subject: "p1",
						Items: { vandal: weapon("skin-1", "chroma-1") },
					},
				},
			],
		});

		expect(loadout?.puuid).toBe("p1");
		expect(loadout?.characterId).toBe("jett");
		expect(loadout?.itemIds).toEqual(["skin-1", "chroma-1"]);
	});

	it("accepts the flat entry shape as well as the nested one", () => {
		const [loadout] = mapLobbyLoadouts({
			Loadouts: [{ Subject: "p2", Items: { phantom: weapon("skin-2") } }],
		});

		expect(loadout?.puuid).toBe("p2");
		expect(loadout?.itemIds).toEqual(["skin-2"]);
	});

	it("drops an entry that cannot be attributed to a player", () => {
		expect(
			mapLobbyLoadouts({ Loadouts: [{ Items: { vandal: weapon("skin-1") } }] }),
		).toEqual([]);
	});

	it("reports an item shared by several sockets once", () => {
		const [loadout] = mapLobbyLoadouts({
			Loadouts: [
				{ Subject: "p1", Items: { a: weapon("same"), b: weapon("same") } },
			],
		});

		expect(loadout?.itemIds).toEqual(["same"]);
	});

	it("survives an empty payload", () => {
		expect(mapLobbyLoadouts({})).toEqual([]);
	});
});

describe("loadout endpoints", () => {
	it("reads the current game loadouts from the game lifecycle host", async () => {
		const { transport, requests } = capture();

		await getCoreGameLoadouts(transport, auth, shard, "match-1");

		expect(String(requests[0]?.url)).toBe(
			"https://glz-eu-1.eu.a.pvp.net/core-game/v1/matches/match-1/loadouts",
		);
	});

	it("reads the agent select loadouts from the same host", async () => {
		const { transport, requests } = capture();

		await getPregameLoadouts(transport, auth, shard, "match-1");

		expect(String(requests[0]?.url)).toBe(
			"https://glz-eu-1.eu.a.pvp.net/pregame/v1/matches/match-1/loadouts",
		);
	});
});
