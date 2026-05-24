import { describe, expect, it } from "bun:test";

import type { RiotShard } from "./endpoints";
import { quitPregame } from "./riot";
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
