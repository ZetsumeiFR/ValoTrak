import { describe, expect, it } from "bun:test";

import {
	fixtureStorefront,
	fixtureStorefrontWithNightMarket,
} from "./fixtures";
import { mapStorefront } from "./storefront";

describe("mapStorefront", () => {
	it("maps the four daily offers with VP costs", () => {
		const store = mapStorefront(fixtureStorefront());
		expect(store.dailyOffers).toHaveLength(4);
		expect(store.dailyOffers[0]).toEqual({
			skinLevelId: "skin-lvl-0001",
			vpCost: 1775,
		});
		expect(store.dailyOffers.map((o) => o.vpCost)).toEqual([
			1775, 2175, 1275, 875,
		]);
		expect(store.dailyRemainingSeconds).toBe(50_000);
	});

	it("returns null night market when BonusStore is absent", () => {
		const store = mapStorefront(fixtureStorefront());
		expect(store.nightMarket).toBeNull();
	});

	it("populates the night market with discounts when present", () => {
		const store = mapStorefront(fixtureStorefrontWithNightMarket());
		expect(store.nightMarket).not.toBeNull();
		expect(store.nightMarket?.remainingSeconds).toBe(80_000);
		expect(store.nightMarket?.offers).toHaveLength(2);
		expect(store.nightMarket?.offers[0]).toEqual({
			skinLevelId: "skin-lvl-0001",
			vpCost: 1775,
			discountedVpCost: 940,
			discountPercent: 47,
		});
	});

	it("maps featured bundles", () => {
		const store = mapStorefront(fixtureStorefront());
		expect(store.bundles).toHaveLength(1);
		expect(store.bundles[0]).toEqual({
			dataAssetId: "bundle-asset-0001",
			totalVp: 5680,
			baseVp: 7100,
			remainingSeconds: 200_000,
			itemCount: 2,
		});
	});
});
