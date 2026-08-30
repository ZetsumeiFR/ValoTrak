import { describe, expect, it } from "bun:test";

import {
	getOwnedItems,
	ITEM_TYPE,
	mapOwnedItemIds,
	mapVpPrices,
	mapWallet,
} from "./inventory";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};
const shard = { region: "eu", shard: "eu" };

const VP = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
const RAD = "e59aa87c-4cbf-517a-5983-6e81511be9b7";
const KC = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";

describe("mapWallet", () => {
	it("names the three currencies", () => {
		const wallet = mapWallet({
			Balances: { [VP]: 1775, [RAD]: 40, [KC]: 900 },
		});

		expect(wallet).toEqual({
			valorantPoints: 1775,
			radianitePoints: 40,
			kingdomCredits: 900,
		});
	});

	it("reads an absent balance as zero", () => {
		expect(mapWallet({})).toEqual({
			valorantPoints: 0,
			radianitePoints: 0,
			kingdomCredits: 0,
		});
	});
});

describe("mapOwnedItemIds", () => {
	it("reads the single-category shape", () => {
		const owned = mapOwnedItemIds({
			ItemTypeID: ITEM_TYPE.skins,
			Entitlements: [{ ItemID: "skin-a" }, { ItemID: "skin-b" }],
		});

		expect(owned).toEqual(["skin-a", "skin-b"]);
	});

	it("reads the grouped shape too", () => {
		const owned = mapOwnedItemIds({
			EntitlementsByTypes: [
				{ ItemTypeID: ITEM_TYPE.skins, Entitlements: [{ ItemID: "skin-a" }] },
				{ ItemTypeID: ITEM_TYPE.sprays, Entitlements: [{ ItemID: "spray-a" }] },
			],
		});

		expect(owned).toEqual(["skin-a", "spray-a"]);
	});

	it("ignores entries without an item id", () => {
		expect(mapOwnedItemIds({ Entitlements: [{ TypeID: "x" }] })).toEqual([]);
	});
});

describe("getOwnedItems", () => {
	it("targets the entitlements endpoint for the requested category", async () => {
		const requests: RiotRequest[] = [];
		const transport: RiotTransport = async (
			req: RiotRequest,
		): Promise<RiotResponse> => {
			requests.push(req);
			return {
				status: 200,
				ok: true,
				body: JSON.stringify({ Entitlements: [{ ItemID: "skin-a" }] }),
			};
		};

		const owned = await getOwnedItems(
			transport,
			auth,
			shard,
			"puuid-1",
			ITEM_TYPE.skins,
		);

		expect(String(requests[0]?.url)).toBe(
			`https://pd.eu.a.pvp.net/store/v1/entitlements/puuid-1/${ITEM_TYPE.skins}`,
		);
		expect(owned).toEqual(["skin-a"]);
	});
});

describe("mapVpPrices", () => {
	it("indexes a price by the offer id and by every reward it grants", () => {
		const prices = mapVpPrices({
			Offers: [
				{
					OfferID: "offer-1",
					Cost: { [VP]: 1775 },
					Rewards: [{ ItemID: "skin-level-1", Quantity: 1 }],
				},
			],
		});

		expect(prices.get("offer-1")).toBe(1775);
		expect(prices.get("skin-level-1")).toBe(1775);
	});

	it("skips offers that are not priced in Valorant Points", () => {
		const prices = mapVpPrices({
			Offers: [{ OfferID: "offer-kc", Cost: { [KC]: 5000 } }],
		});

		expect(prices.size).toBe(0);
	});
});
