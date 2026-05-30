import { beforeEach, describe, expect, it } from "bun:test";

import { clearMatchDetailsCache } from "./cache";
import {
	clearPlayerEnrichmentCache,
	enrichLobby,
	enrichPlayerStats,
} from "./enrich";
import type { RiotAuth, RiotRequest, RiotTransport } from "./transport";
import type { CurrentMatch } from "./types";

const auth: RiotAuth = {
	accessToken: "a",
	entitlementToken: "e",
	clientVersion: "v",
};

const match: CurrentMatch = {
	phase: "coregame",
	matchId: "live",
	shard: { region: "eu", shard: "eu" },
	players: [
		{
			puuid: "p1",
			teamId: "Blue",
			isAlly: true,
			isSelf: true,
		},
	],
};

function json(body: unknown) {
	return {
		status: 200,
		ok: true,
		body: JSON.stringify(body),
	};
}

function transportFor(counter: Map<string, number>): RiotTransport {
	return async (req: RiotRequest) => {
		const kind = req.url.includes("/mmr/")
			? "mmr"
			: req.url.includes("/account-xp/")
				? "accountXp"
				: req.url.includes("/match-history/")
					? "history"
					: req.url.includes("/match-details/")
						? "details"
						: req.url.includes("/name-service/")
							? "names"
							: "other";
		counter.set(kind, (counter.get(kind) ?? 0) + 1);

		if (kind === "mmr") {
			return json({
				LatestCompetitiveUpdate: {
					TierAfterUpdate: 15,
					RankedRatingAfterUpdate: 42,
				},
			});
		}
		if (kind === "history") {
			return json({ History: [{ MatchID: "m1" }] });
		}
		if (kind === "accountXp") {
			return json({ Progress: { Level: 123, XP: 5000 } });
		}
		if (kind === "details") {
			return json({
				matchInfo: { matchId: "m1" },
				players: [],
			});
		}
		if (kind === "names") {
			return json([
				{
					Subject: "p1",
					GameName: "Player",
					TagLine: "EU",
				},
			]);
		}
		return json({});
	};
}

describe("player enrichment cache", () => {
	beforeEach(() => {
		clearMatchDetailsCache();
		clearPlayerEnrichmentCache();
	});

	it("reuses rank and stats enrichment across identical lobby refreshes", async () => {
		const counter = new Map<string, number>();
		const transport = transportFor(counter);

		await enrichLobby(transport, auth, match);
		await enrichLobby(transport, auth, match);

		expect(counter.get("mmr")).toBe(1);
		expect(counter.get("accountXp")).toBe(1);
		expect(counter.get("history")).toBe(1);
		expect(counter.get("details")).toBe(1);
		expect(counter.get("names")).toBe(2);
	});

	it("dedupes concurrent enrichment for the same player", async () => {
		const counter = new Map<string, number>();
		const transport = transportFor(counter);

		await Promise.all([
			enrichPlayerStats(transport, auth, match, "p1"),
			enrichPlayerStats(transport, auth, match, "p1"),
		]);

		expect(counter.get("mmr")).toBe(1);
		expect(counter.get("accountXp")).toBe(1);
		expect(counter.get("history")).toBe(1);
		expect(counter.get("details")).toBe(1);
	});

	it("does not cache transient enrichment failures", async () => {
		let mmrCalls = 0;
		const transport: RiotTransport = async (req) => {
			if (req.url.includes("/mmr/")) {
				mmrCalls += 1;
				return mmrCalls === 1
					? { status: 500, ok: false, body: "" }
					: json({
							LatestCompetitiveUpdate: {
								TierAfterUpdate: 15,
								RankedRatingAfterUpdate: 42,
							},
						});
			}
			return transportFor(new Map())(req);
		};

		const failed = await enrichPlayerStats(transport, auth, match, "p1");
		const recovered = await enrichPlayerStats(transport, auth, match, "p1");

		expect(failed.error).toBeDefined();
		expect(recovered.error).toBeUndefined();
		expect(mmrCalls).toBe(2);
	});
});
