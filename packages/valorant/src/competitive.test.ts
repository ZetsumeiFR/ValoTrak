import { describe, expect, it } from "bun:test";

import {
	getCompetitiveUpdates,
	mapCompetitiveUpdates,
	type RawCompetitiveUpdateEntry,
	rankedMatchesToTrend,
} from "./competitive";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};
const shard = { region: "eu", shard: "eu" };

function capture(body: unknown): {
	transport: RiotTransport;
	requests: RiotRequest[];
} {
	const requests: RiotRequest[] = [];
	const transport: RiotTransport = async (
		req: RiotRequest,
	): Promise<RiotResponse> => {
		requests.push(req);
		return { status: 200, ok: true, body: JSON.stringify(body) };
	};
	return { transport, requests };
}

function entry(
	overrides: Partial<RawCompetitiveUpdateEntry> = {},
): RawCompetitiveUpdateEntry {
	return {
		MatchID: "m1",
		MapID: "/Game/Maps/Ascent/Ascent",
		SeasonID: "season-1",
		MatchStartTime: 1_700_000_000_000,
		TierAfterUpdate: 18,
		TierBeforeUpdate: 18,
		RankedRatingAfterUpdate: 42,
		RankedRatingBeforeUpdate: 22,
		RankedRatingEarned: 20,
		RankedRatingPerformanceBonus: 3,
		CompetitiveMovement: "PROMOTED",
		...overrides,
	};
}

describe("getCompetitiveUpdates", () => {
	it("asks the ranked history endpoint with the requested window and queue", async () => {
		const { transport, requests } = capture({ Matches: [] });

		await getCompetitiveUpdates(transport, auth, shard, "puuid-1", {
			endIndex: 20,
			queue: "competitive",
		});

		const url = new URL(String(requests[0]?.url));
		expect(url.host).toBe("pd.eu.a.pvp.net");
		expect(url.pathname).toBe("/mmr/v1/players/puuid-1/competitiveupdates");
		expect(url.searchParams.get("startIndex")).toBe("0");
		expect(url.searchParams.get("endIndex")).toBe("20");
		expect(url.searchParams.get("queue")).toBe("competitive");
	});
});

describe("mapCompetitiveUpdates", () => {
	it("returns matches oldest first so a chart reads left to right", () => {
		const matches = mapCompetitiveUpdates({
			Matches: [
				entry({ MatchID: "recent", MatchStartTime: 3000 }),
				entry({ MatchID: "old", MatchStartTime: 1000 }),
			],
		});

		expect(matches.map((m) => m.matchId)).toEqual(["old", "recent"]);
	});

	it("keeps the rating gained and the performance bonus", () => {
		const [match] = mapCompetitiveUpdates({ Matches: [entry()] });

		expect(match?.rr).toBe(42);
		expect(match?.rrChange).toBe(20);
		expect(match?.performanceBonus).toBe(3);
		expect(match?.tier).toBe(18);
	});

	it("drops entries that never moved the rating, such as unrated games", () => {
		const matches = mapCompetitiveUpdates({
			Matches: [
				entry({ MatchID: "ranked" }),
				entry({
					MatchID: "placement-noise",
					TierAfterUpdate: 0,
					RankedRatingAfterUpdate: 0,
					RankedRatingEarned: 0,
					RankedRatingBeforeUpdate: 0,
				}),
			],
		});

		expect(matches.map((m) => m.matchId)).toEqual(["ranked"]);
	});

	it("survives an empty or absent payload", () => {
		expect(mapCompetitiveUpdates({})).toEqual([]);
	});
});

describe("rankedMatchesToTrend", () => {
	it("produces chart points carrying only what ranked history knows", () => {
		const [point] = rankedMatchesToTrend(
			mapCompetitiveUpdates({ Matches: [entry()] }),
		);

		expect(point).toEqual({
			capturedAt: 1_700_000_000_000,
			tier: 18,
			rr: 42,
			kd: null,
			acs: null,
			hsPercent: null,
			winRate: null,
		});
	});
});
