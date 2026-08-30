import { describe, expect, it } from "bun:test";

import { getLeaderboard, mapLeaderboard } from "./leaderboard";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};

const shard = { region: "eu", shard: "eu" };

const raw = {
	totalPlayers: 25_000,
	topTierRRThreshold: 620,
	Players: [
		{
			puuid: "puuid-top",
			gameName: "Top",
			tagLine: "EUW",
			leaderboardRank: 1,
			rankedRating: 900,
			numberOfWins: 300,
			competitiveTier: 27,
		},
		{
			puuid: "puuid-me",
			gameName: "Me",
			tagLine: "EUW",
			leaderboardRank: 412,
			rankedRating: 410,
			numberOfWins: 120,
			competitiveTier: 26,
		},
	],
};

describe("mapLeaderboard", () => {
	it("finds the requested player inside the fetched window", () => {
		const snapshot = mapLeaderboard(raw, "puuid-me");

		expect(snapshot.self?.rank).toBe(412);
		expect(snapshot.self?.rankedRating).toBe(410);
		expect(snapshot.self?.wins).toBe(120);
	});

	it("reports the ladder size and the top-tier cutoff", () => {
		const snapshot = mapLeaderboard(raw, "puuid-me");

		expect(snapshot.totalPlayers).toBe(25_000);
		expect(snapshot.topTierRrThreshold).toBe(620);
	});

	it("leaves the player out when they are below the fetched window", () => {
		expect(mapLeaderboard(raw, "puuid-unranked").self).toBeUndefined();
	});
});

describe("getLeaderboard", () => {
	it("queries a season ladder with an explicit window", async () => {
		const requests: RiotRequest[] = [];
		const transport: RiotTransport = async (
			req: RiotRequest,
		): Promise<RiotResponse> => {
			requests.push(req);
			return { status: 200, ok: true, body: JSON.stringify({ Players: [] }) };
		};

		await getLeaderboard(transport, auth, shard, "season-1", { size: 200 });

		const url = new URL(String(requests[0]?.url));
		expect(url.host).toBe("pd.eu.a.pvp.net");
		expect(url.pathname).toBe(
			"/mmr/v1/leaderboards/affinity/eu/queue/competitive/season/season-1",
		);
		expect(url.searchParams.get("startIndex")).toBe("0");
		expect(url.searchParams.get("size")).toBe("200");
	});
});
