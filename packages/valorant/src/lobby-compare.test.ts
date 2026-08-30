import { describe, expect, it } from "bun:test";

import { comparePlayerToLobby, computeLobbyBaseline } from "./lobby-compare";
import type { AggregatedStats, EnrichedPlayer } from "./types";

function stats(kd: number, acs: number, hs = 20, wr = 50): AggregatedStats {
	return {
		matchesAnalyzed: 5,
		kd,
		avgKills: 15,
		avgDeaths: 15,
		avgAssists: 4,
		acs,
		hsPercent: hs,
		winRate: wr,
		wins: 3,
		losses: 2,
		mainAgents: [],
	};
}

function player(puuid: string, s?: AggregatedStats): EnrichedPlayer {
	return {
		puuid,
		teamId: "Blue",
		isAlly: true,
		isSelf: false,
		stats: s,
	};
}

describe("computeLobbyBaseline", () => {
	it("returns undefined when too few players carry stats", () => {
		const baseline = computeLobbyBaseline([
			player("a", stats(1, 200)),
			player("b", stats(1.2, 220)),
			player("c"),
		]);

		expect(baseline).toBeUndefined();
	});

	it("uses the median so a single outlier cannot drag the lobby", () => {
		const baseline = computeLobbyBaseline([
			player("a", stats(0.5, 150)),
			player("b", stats(0.6, 160)),
			player("c", stats(0.7, 170)),
			player("d", stats(0.8, 180)),
			player("e", stats(5, 600)),
		]);

		expect(baseline?.kd).toBeCloseTo(0.7, 5);
		expect(baseline?.acs).toBeCloseTo(170, 5);
		expect(baseline?.sampleSize).toBe(5);
	});

	it("averages the two middle values on an even sample", () => {
		const baseline = computeLobbyBaseline([
			player("a", stats(1, 100)),
			player("b", stats(2, 200)),
			player("c", stats(3, 300)),
			player("d", stats(4, 400)),
		]);

		expect(baseline?.kd).toBeCloseTo(2.5, 5);
		expect(baseline?.acs).toBeCloseTo(250, 5);
	});
});

describe("comparePlayerToLobby", () => {
	it("reports signed distances in each stat's own unit", () => {
		const baseline = {
			kd: 1,
			acs: 200,
			hsPercent: 20,
			winRate: 50,
			sampleSize: 5,
		};

		const delta = comparePlayerToLobby(stats(1.25, 235, 26, 44), baseline);

		expect(delta.kd).toBeCloseTo(0.25, 5);
		expect(delta.acs).toBeCloseTo(35, 5);
		expect(delta.hsPercent).toBeCloseTo(6, 5);
		expect(delta.winRate).toBeCloseTo(-6, 5);
	});
});
