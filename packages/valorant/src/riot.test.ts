import { describe, expect, it } from "bun:test";

import type { RiotShard } from "./endpoints";
import { extractAccountLevel, extractRank, quitPregame } from "./riot";
import type { RiotAuth, RiotRequest } from "./transport";

const auth: RiotAuth = {
	accessToken: "acc",
	entitlementToken: "ent",
	clientVersion: "release-09",
};
const shard: RiotShard = { region: "eu", shard: "eu" };

describe("quitPregame", () => {
	it("POSTs to the pregame quit endpoint with auth headers", async () => {
		let captured: RiotRequest | undefined;
		await quitPregame(
			async (req) => {
				captured = req;
				return { status: 200, ok: true, body: "" };
			},
			auth,
			shard,
			"match-123",
		);
		expect(captured?.method).toBe("POST");
		expect(captured?.url).toBe(
			"https://glz-eu-1.eu.a.pvp.net/pregame/v1/matches/match-123/quit",
		);
		expect(captured?.headers?.Authorization).toBe("Bearer acc");
		expect(captured?.headers?.["X-Riot-Entitlements-JWT"]).toBe("ent");
	});

	it("throws on a non-ok response", () => {
		expect(
			quitPregame(
				async () => ({ status: 404, ok: false, body: "nope" }),
				auth,
				shard,
				"m",
			),
		).rejects.toThrow();
	});
});

describe("rank and account extraction", () => {
	it("extracts current rank, RR, and peak tier from seasonal MMR", () => {
		const rank = extractRank({
			LatestCompetitiveUpdate: {
				TierAfterUpdate: 15,
				RankedRatingAfterUpdate: 42,
			},
			QueueSkills: {
				competitive: {
					SeasonalInfoBySeasonID: {
						old: { CompetitiveTier: 14 },
						current: { CompetitiveTier: 18 },
						unrated: { CompetitiveTier: 0 },
					},
				},
			},
		});

		expect(rank).toEqual({ tier: 15, rr: 42, peakTier: 18 });
	});

	it("keeps peak tier undefined when seasonal MMR is unavailable", () => {
		expect(extractRank({})).toEqual({ tier: 0, rr: 0, peakTier: undefined });
	});

	it("extracts account level from account XP progress", () => {
		expect(extractAccountLevel({ Progress: { Level: 312, XP: 1200 } })).toBe(
			312,
		);
		expect(extractAccountLevel({ AccountLevel: 99 })).toBe(99);
		expect(extractAccountLevel({ Progress: { Level: -1 } })).toBeUndefined();
	});
});
