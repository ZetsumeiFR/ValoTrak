import { describe, expect, it } from "bun:test";

import { getPenalties, mapPenalties } from "./penalties";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};
const shard = { region: "eu", shard: "eu" };

describe("mapPenalties", () => {
	it("reports how many restrictions are in force", () => {
		expect(mapPenalties({ Penalties: [{}, {}] })).toEqual({
			active: true,
			count: 2,
		});
	});

	it("reports a clean account when the list is empty or absent", () => {
		expect(mapPenalties({ Penalties: [] })).toEqual({
			active: false,
			count: 0,
		});
		expect(mapPenalties({})).toEqual({ active: false, count: 0 });
	});
});

describe("getPenalties", () => {
	it("queries the restrictions endpoint", async () => {
		const requests: RiotRequest[] = [];
		const transport: RiotTransport = async (
			req: RiotRequest,
		): Promise<RiotResponse> => {
			requests.push(req);
			return { status: 200, ok: true, body: JSON.stringify({ Penalties: [] }) };
		};

		await getPenalties(transport, auth, shard);

		expect(String(requests[0]?.url)).toBe(
			"https://pd.eu.a.pvp.net/restrictions/v3/penalties",
		);
	});
});
