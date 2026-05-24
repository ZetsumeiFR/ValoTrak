import { describe, expect, it } from "bun:test";

import { computeAggregatedStats } from "./aggregate";
import { AGENT, FIXTURE_MATCHES, SELF_PUUID } from "./fixtures";

describe("computeAggregatedStats", () => {
	const stats = computeAggregatedStats(SELF_PUUID, FIXTURE_MATCHES);

	it("counts analyzed matches", () => {
		expect(stats.matchesAnalyzed).toBe(3);
	});

	it("computes K/D and averages", () => {
		expect(stats.kd).toBe(1);
		expect(stats.avgKills).toBe(15);
		expect(stats.avgDeaths).toBe(15);
		expect(stats.avgAssists).toBeCloseTo(7.33, 2);
	});

	it("computes ACS from total score over total rounds", () => {
		// 13500 / 66 = 204.5454...
		expect(stats.acs).toBeCloseTo(204.55, 2);
	});

	it("computes headshot percentage", () => {
		// head 20 / (20 + 20 + 10) = 40%
		expect(stats.hsPercent).toBe(40);
	});

	it("computes win rate", () => {
		expect(stats.wins).toBe(2);
		expect(stats.losses).toBe(1);
		expect(stats.winRate).toBeCloseTo(66.67, 2);
	});

	it("ranks main agents by games played", () => {
		expect(stats.mainAgents).toHaveLength(2);
		expect(stats.mainAgents[0]).toEqual({
			agentId: AGENT.jett,
			games: 2,
			winRate: 50,
		});
		expect(stats.mainAgents[1]).toEqual({
			agentId: AGENT.sova,
			games: 1,
			winRate: 100,
		});
	});

	it("returns empty stats when the player is absent", () => {
		const empty = computeAggregatedStats("unknown", FIXTURE_MATCHES);
		expect(empty.matchesAnalyzed).toBe(0);
		expect(empty.kd).toBe(0);
		expect(empty.mainAgents).toEqual([]);
	});
});
