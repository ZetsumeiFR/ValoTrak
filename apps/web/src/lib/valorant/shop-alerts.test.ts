/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import type { SkinLevel, Storefront } from "@valotrak/valorant";

import {
	pendingShopAlerts,
	searchWatchableSkins,
	shopRotationId,
} from "./shop-alerts";

function store(overrides: Partial<Storefront> = {}): Storefront {
	return {
		dailyOffers: [
			{ skinLevelId: "skin-a", vpCost: 1775 },
			{ skinLevelId: "skin-b", vpCost: 2175 },
		],
		dailyRemainingSeconds: 3600,
		nightMarket: null,
		bundles: [],
		...overrides,
	};
}

describe("shopRotationId", () => {
	it("identifies the rotation by the day it ends, not by the current day", () => {
		const now = Date.UTC(2026, 7, 30, 23, 0, 0);

		// Two hours left: the rotation belongs to the 31st.
		expect(shopRotationId(2 * 3600, now)).toBe("2026-08-31");
		// Thirty minutes left: still the 30th.
		expect(shopRotationId(30 * 60, now)).toBe("2026-08-30");
	});
});

describe("pendingShopAlerts", () => {
	it("reports watched skins present in the daily shop", () => {
		expect(pendingShopAlerts(store(), new Set(["skin-b"]), new Set())).toEqual([
			"skin-b",
		]);
	});

	it("reports nothing when the watchlist is empty", () => {
		expect(pendingShopAlerts(store(), new Set(), new Set())).toEqual([]);
	});

	it("reports nothing when no watched skin is on sale", () => {
		expect(pendingShopAlerts(store(), new Set(["skin-z"]), new Set())).toEqual(
			[],
		);
	});

	it("covers the night market too", () => {
		const withNightMarket = store({
			nightMarket: {
				offers: [
					{
						skinLevelId: "skin-n",
						vpCost: 1775,
						discountedVpCost: 900,
						discountPercent: 49,
					},
				],
				remainingSeconds: 7200,
			},
		});

		expect(
			pendingShopAlerts(withNightMarket, new Set(["skin-n"]), new Set()),
		).toEqual(["skin-n"]);
	});

	it("does not alert twice for the same rotation", () => {
		expect(
			pendingShopAlerts(store(), new Set(["skin-b"]), new Set(["skin-b"])),
		).toEqual([]);
	});

	it("reports a skin once even when it is in both sections", () => {
		const both = store({
			nightMarket: {
				offers: [
					{
						skinLevelId: "skin-a",
						vpCost: 1775,
						discountedVpCost: 900,
						discountPercent: 49,
					},
				],
				remainingSeconds: 7200,
			},
		});

		expect(pendingShopAlerts(both, new Set(["skin-a"]), new Set())).toEqual([
			"skin-a",
		]);
	});
});

function level(
	levelId: string,
	skinId: string,
	displayName: string,
): SkinLevel {
	return {
		levelId,
		skinId,
		displayName,
		displayIcon: null,
		contentTierId: null,
	};
}

const catalogue: SkinLevel[] = [
	level("prime-1", "prime", "Prime Vandal"),
	level("prime-2", "prime", "Prime Vandal"),
	level("reaver-1", "reaver", "Reaver Vandal"),
	level("glitch-1", "glitch", "Glitchpop Phantom"),
];

describe("searchWatchableSkins", () => {
	it("returns one entry per skin, never its upgrade levels", () => {
		const found = searchWatchableSkins(catalogue, "prime");

		expect(found.map((skin) => skin.levelId)).toEqual(["prime-1"]);
	});

	it("matches case-insensitively on part of the name", () => {
		const found = searchWatchableSkins(catalogue, "VANDAL");

		expect(found.map((skin) => skin.skinId)).toEqual(["prime", "reaver"]);
	});

	it("stays quiet until the query is worth searching", () => {
		expect(searchWatchableSkins(catalogue, "")).toEqual([]);
		expect(searchWatchableSkins(catalogue, "p")).toEqual([]);
	});

	it("caps the number of suggestions", () => {
		expect(searchWatchableSkins(catalogue, "va", 1)).toHaveLength(1);
	});
});
