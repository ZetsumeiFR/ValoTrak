import { describe, expect, it } from "bun:test";

import { extractPartyId, getPartyPlayer } from "./party";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};
const shard = { region: "eu", shard: "eu" };

describe("extractPartyId", () => {
	it("returns the current party id", () => {
		expect(extractPartyId({ CurrentPartyID: "party-1" })).toBe("party-1");
	});

	it("returns nothing when the player is in no party", () => {
		expect(extractPartyId({})).toBeUndefined();
	});
});

describe("getPartyPlayer", () => {
	it("queries the party endpoint on the game lifecycle host", async () => {
		const requests: RiotRequest[] = [];
		const transport: RiotTransport = async (
			req: RiotRequest,
		): Promise<RiotResponse> => {
			requests.push(req);
			return {
				status: 200,
				ok: true,
				body: JSON.stringify({ CurrentPartyID: "party-1" }),
			};
		};

		await getPartyPlayer(transport, auth, shard, "puuid-1");

		expect(String(requests[0]?.url)).toBe(
			"https://glz-eu-1.eu.a.pvp.net/parties/v1/players/puuid-1",
		);
	});
});
