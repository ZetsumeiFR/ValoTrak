import { beforeEach, describe, expect, it } from "bun:test";

import { clearMatchDetailsCache, getMatchDetailsCached } from "./cache";
import type { RiotShard } from "./endpoints";
import type { RiotAuth, RiotTransport } from "./transport";

const auth: RiotAuth = {
	accessToken: "a",
	entitlementToken: "e",
	clientVersion: "v",
};
const shard: RiotShard = { region: "eu", shard: "eu" };

/** Transport that returns a minimal match-details doc and counts calls. */
function detailsTransport(counter: { n: number }): RiotTransport {
	return async (req) => {
		counter.n += 1;
		const matchId = req.url.split("/").at(-1) ?? "";
		return {
			status: 200,
			ok: true,
			body: JSON.stringify({ matchInfo: { matchId } }),
		};
	};
}

describe("getMatchDetailsCached", () => {
	beforeEach(() => clearMatchDetailsCache());

	it("fetches once, then serves the same value from cache", async () => {
		const counter = { n: 0 };
		const transport = detailsTransport(counter);
		const first = await getMatchDetailsCached(transport, auth, shard, "m1");
		const second = await getMatchDetailsCached(transport, auth, shard, "m1");
		expect(first.matchInfo.matchId).toBe("m1");
		expect(second).toBe(first);
		expect(counter.n).toBe(1);
	});

	it("dedupes concurrent in-flight requests", async () => {
		const counter = { n: 0 };
		const transport = detailsTransport(counter);
		const [a, b] = await Promise.all([
			getMatchDetailsCached(transport, auth, shard, "m2"),
			getMatchDetailsCached(transport, auth, shard, "m2"),
		]);
		expect(a).toBe(b);
		expect(counter.n).toBe(1);
	});

	it("does not cache failures, so a later call retries", async () => {
		let calls = 0;
		const transport: RiotTransport = async () => {
			calls += 1;
			return calls === 1
				? { status: 500, ok: false, body: "" }
				: {
						status: 200,
						ok: true,
						body: JSON.stringify({ matchInfo: { matchId: "m3" } }),
					};
		};
		await expect(
			getMatchDetailsCached(transport, auth, shard, "m3"),
		).rejects.toThrow();
		const recovered = await getMatchDetailsCached(transport, auth, shard, "m3");
		expect(recovered.matchInfo.matchId).toBe("m3");
		expect(calls).toBe(2);
	});
});
