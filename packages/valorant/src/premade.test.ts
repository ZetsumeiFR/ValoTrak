import { describe, expect, it } from "bun:test";

import { extractRecentTeammates, inferPremadeGroups } from "./premade";
import type { RawMatchDetails, RawMatchPlayer } from "./types";

function player(subject: string, teamId: string): RawMatchPlayer {
	return { subject, teamId, characterId: "jett", competitiveTier: 18 };
}

function detail(players: RawMatchPlayer[]): RawMatchDetails {
	return {
		matchInfo: { matchId: "m1" } as RawMatchDetails["matchInfo"],
		players,
	};
}

describe("extractRecentTeammates", () => {
	it("keeps the players who were on the same team", () => {
		const teammates = extractRecentTeammates("me", [
			detail([
				player("me", "Blue"),
				player("mate", "Blue"),
				player("enemy", "Red"),
			]),
		]);

		expect(teammates).toEqual(["mate"]);
	});

	it("never reports the player themselves", () => {
		const teammates = extractRecentTeammates("me", [
			detail([player("me", "Blue"), player("mate", "Blue")]),
		]);

		expect(teammates).not.toContain("me");
	});

	it("reports a repeated teammate once", () => {
		const together = detail([player("me", "Blue"), player("mate", "Blue")]);

		expect(extractRecentTeammates("me", [together, together])).toEqual([
			"mate",
		]);
	});

	it("skips matches the player did not take part in", () => {
		const teammates = extractRecentTeammates("me", [
			detail([player("other", "Blue"), player("someone", "Blue")]),
		]);

		expect(teammates).toEqual([]);
	});
});

describe("inferPremadeGroups", () => {
	it("leaves a lobby of strangers ungrouped", () => {
		const groups = inferPremadeGroups([
			{ puuid: "a" },
			{ puuid: "b", recentTeammates: [] },
		]);

		expect(groups.size).toBe(0);
	});

	it("groups two players who recently played together", () => {
		const groups = inferPremadeGroups([
			{ puuid: "a", recentTeammates: ["b"] },
			{ puuid: "b", recentTeammates: ["a"] },
		]);

		expect(groups.get("a")).toBe(1);
		expect(groups.get("b")).toBe(1);
	});

	it("accepts one-sided evidence: a shared match may fall outside one window", () => {
		const groups = inferPremadeGroups([
			{ puuid: "a", recentTeammates: ["b"] },
			{ puuid: "b", recentTeammates: [] },
		]);

		expect(groups.get("a")).toBe(1);
		expect(groups.get("b")).toBe(1);
	});

	it("merges a trio through a shared member", () => {
		const groups = inferPremadeGroups([
			{ puuid: "a", recentTeammates: ["b"] },
			{ puuid: "b", recentTeammates: ["c"] },
			{ puuid: "c", recentTeammates: [] },
		]);

		expect(groups.get("a")).toBe(1);
		expect(groups.get("b")).toBe(1);
		expect(groups.get("c")).toBe(1);
	});

	it("numbers independent groups separately and leaves solos out", () => {
		const groups = inferPremadeGroups([
			{ puuid: "a", recentTeammates: ["b"] },
			{ puuid: "b", recentTeammates: [] },
			{ puuid: "solo", recentTeammates: [] },
			{ puuid: "c", recentTeammates: ["d"] },
			{ puuid: "d", recentTeammates: [] },
		]);

		expect(groups.get("a")).toBe(1);
		expect(groups.get("b")).toBe(1);
		expect(groups.get("c")).toBe(2);
		expect(groups.get("d")).toBe(2);
		expect(groups.has("solo")).toBe(false);
	});

	it("ignores teammates who are not in this lobby", () => {
		const groups = inferPremadeGroups([
			{ puuid: "a", recentTeammates: ["someone-else"] },
			{ puuid: "b", recentTeammates: [] },
		]);

		expect(groups.size).toBe(0);
	});
});
