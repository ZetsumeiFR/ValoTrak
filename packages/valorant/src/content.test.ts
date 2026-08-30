import { describe, expect, it } from "bun:test";

import { findActiveAct, findSeasonAt, getContent, mapSeasons } from "./content";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};

const shard = { region: "eu", shard: "eu" };

const raw = {
	Seasons: [
		{
			ID: "episode-1",
			Name: "Episode 1",
			Type: "episode" as const,
			StartTime: "2026-01-01T00:00:00Z",
			EndTime: "2026-12-31T00:00:00Z",
			IsActive: true,
		},
		{
			ID: "act-1",
			Name: "Act I",
			Type: "act" as const,
			StartTime: "2026-01-01T00:00:00Z",
			EndTime: "2026-03-01T00:00:00Z",
			IsActive: false,
		},
		{
			ID: "act-2",
			Name: "Act II",
			Type: "act" as const,
			StartTime: "2026-03-01T00:00:00Z",
			EndTime: "2026-06-01T00:00:00Z",
			IsActive: true,
		},
	],
};

describe("mapSeasons", () => {
	it("turns the ISO window into epoch milliseconds", () => {
		const [episode] = mapSeasons(raw);

		expect(episode?.id).toBe("episode-1");
		expect(episode?.startedAt).toBe(Date.parse("2026-01-01T00:00:00Z"));
		expect(episode?.endedAt).toBe(Date.parse("2026-12-31T00:00:00Z"));
	});

	it("survives an empty payload", () => {
		expect(mapSeasons({})).toEqual([]);
	});
});

describe("findActiveAct", () => {
	it("picks the running act, not the running episode", () => {
		expect(findActiveAct(mapSeasons(raw))?.id).toBe("act-2");
	});

	it("returns nothing when no act is running", () => {
		expect(findActiveAct([])).toBeUndefined();
	});
});

describe("findSeasonAt", () => {
	it("names the act a past date belongs to", () => {
		const at = Date.parse("2026-02-01T00:00:00Z");

		expect(findSeasonAt(mapSeasons(raw), at)?.id).toBe("act-1");
	});

	it("returns nothing for a date outside every act", () => {
		const at = Date.parse("2030-01-01T00:00:00Z");

		expect(findSeasonAt(mapSeasons(raw), at)).toBeUndefined();
	});
});

describe("getContent", () => {
	it("queries the shared content service", async () => {
		const requests: RiotRequest[] = [];
		const transport: RiotTransport = async (
			req: RiotRequest,
		): Promise<RiotResponse> => {
			requests.push(req);
			return { status: 200, ok: true, body: JSON.stringify({ Seasons: [] }) };
		};

		await getContent(transport, auth, shard);

		expect(String(requests[0]?.url)).toBe(
			"https://shared.eu.a.pvp.net/content-service/v3/content",
		);
	});
});
