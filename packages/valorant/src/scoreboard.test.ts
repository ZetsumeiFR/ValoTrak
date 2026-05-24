import { describe, expect, it } from "bun:test";

import { buildMatchScoreboard } from "./scoreboard";
import type { RawMatchDetails } from "./types";

const details: RawMatchDetails = {
	matchInfo: {
		matchId: "m1",
		queueId: "competitive",
		mapId: "/Game/Maps/Ascent/Ascent",
		gameStartMillis: 1000,
	},
	players: [
		{
			subject: "a",
			teamId: "Blue",
			characterId: "agent-a",
			competitiveTier: 18,
			stats: {
				kills: 20,
				deaths: 10,
				assists: 5,
				score: 4800,
				roundsPlayed: 24,
			},
		},
		{
			subject: "b",
			teamId: "Red",
			characterId: "agent-b",
			competitiveTier: 20,
			stats: {
				kills: 25,
				deaths: 12,
				assists: 3,
				score: 6000,
				roundsPlayed: 24,
			},
		},
	],
	teams: [
		{ teamId: "Blue", won: true, numPoints: 13 },
		{ teamId: "Red", won: false, numPoints: 11 },
	],
	roundResults: [
		{
			playerStats: [
				{ subject: "a", damage: [{ headshots: 5, bodyshots: 5, legshots: 0 }] },
				{ subject: "b", damage: [{ headshots: 0, bodyshots: 5, legshots: 5 }] },
			],
		},
		{
			playerStats: [
				{ subject: "a", damage: [{ headshots: 5, bodyshots: 5, legshots: 0 }] },
				{ subject: "b", damage: [{ headshots: 0, bodyshots: 5, legshots: 5 }] },
			],
		},
	],
};

describe("buildMatchScoreboard", () => {
	const board = buildMatchScoreboard(details);

	it("orders players by combat score, highest first", () => {
		expect(board.players.map((p) => p.puuid)).toEqual(["b", "a"]);
	});

	it("computes per-round ACS", () => {
		const a = board.players.find((p) => p.puuid === "a");
		expect(a?.acs).toBe(200); // 4800 / 24
	});

	it("computes headshot percentage from round damage", () => {
		const a = board.players.find((p) => p.puuid === "a");
		const b = board.players.find((p) => p.puuid === "b");
		expect(a?.hsPercent).toBe(50); // 10 head / 20 total
		expect(b?.hsPercent).toBe(0); // 0 head / 20 total
	});

	it("maps team scores and result", () => {
		const blue = board.teams.find((t) => t.teamId === "Blue");
		expect(blue?.won).toBe(true);
		expect(blue?.roundsWon).toBe(13);
	});

	it("carries match metadata", () => {
		expect(board.matchId).toBe("m1");
		expect(board.map).toBe("/Game/Maps/Ascent/Ascent");
	});
});
