/// <reference types="bun" />

import { beforeEach, describe, expect, it } from "bun:test";
import type { MatchSummary } from "@valotrak/valorant";

import {
	type KeyValueStorage,
	MAX_CACHED_MATCHES,
	MAX_CACHED_PLAYERS,
	readCachedMatches,
	readLatestCachedMatches,
	writeCachedMatches,
} from "./match-history-cache";

class FakeStorage implements KeyValueStorage {
	readonly entries = new Map<string, string>();
	failOnWrite = false;

	getItem(key: string): string | null {
		return this.entries.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		if (this.failOnWrite) {
			throw new Error("QuotaExceededError");
		}
		this.entries.set(key, value);
	}

	removeItem(key: string): void {
		this.entries.delete(key);
	}
}

function match(id: string): MatchSummary {
	return {
		matchId: id,
		agentId: "jett",
		won: true,
		kills: 20,
		deaths: 12,
		assists: 5,
		acs: 260,
		hsPercent: 24,
	};
}

let storage: FakeStorage;
const options = () => ({ storage, now: () => 1_700_000_000_000 });

beforeEach(() => {
	storage = new FakeStorage();
});

describe("match history cache", () => {
	it("round trips a player's matches with the time they were saved", () => {
		writeCachedMatches("puuid-a", [match("m1"), match("m2")], options());

		const cached = readCachedMatches("puuid-a", options());

		expect(cached?.matches.map((m) => m.matchId)).toEqual(["m1", "m2"]);
		expect(cached?.savedAt).toBe(1_700_000_000_000);
	});

	it("keeps players separate", () => {
		writeCachedMatches("puuid-a", [match("a1")], options());
		writeCachedMatches("puuid-b", [match("b1")], options());

		expect(readCachedMatches("puuid-a", options())?.matches[0]?.matchId).toBe(
			"a1",
		);
		expect(readCachedMatches("puuid-b", options())?.matches[0]?.matchId).toBe(
			"b1",
		);
	});

	it("returns nothing for a player that was never cached", () => {
		expect(readCachedMatches("unknown", options())).toBeUndefined();
	});

	it("keeps only the newest matches", () => {
		const many = Array.from({ length: MAX_CACHED_MATCHES + 5 }, (_, i) =>
			match(`m${i}`),
		);

		writeCachedMatches("puuid-a", many, options());

		const cached = readCachedMatches("puuid-a", options());
		expect(cached?.matches).toHaveLength(MAX_CACHED_MATCHES);
		expect(cached?.matches[0]?.matchId).toBe("m0");
	});

	it("evicts the least recently written player past the cap", () => {
		for (let i = 0; i <= MAX_CACHED_PLAYERS; i += 1) {
			writeCachedMatches(`puuid-${i}`, [match(`m${i}`)], options());
		}

		expect(readCachedMatches("puuid-0", options())).toBeUndefined();
		expect(
			readCachedMatches(`puuid-${MAX_CACHED_PLAYERS}`, options()),
		).toBeDefined();
	});

	it("treats corrupted storage as an empty cache instead of throwing", () => {
		writeCachedMatches("puuid-a", [match("m1")], options());
		for (const key of storage.entries.keys()) {
			storage.entries.set(key, "{not json");
		}

		expect(() => readCachedMatches("puuid-a", options())).not.toThrow();
		expect(readCachedMatches("puuid-a", options())).toBeUndefined();
	});

	it("ignores an entry written by an older schema", () => {
		writeCachedMatches("puuid-a", [match("m1")], options());
		const key = [...storage.entries.keys()].find((k) => k.includes("puuid-a"));
		storage.entries.set(
			String(key),
			JSON.stringify({ version: 0, savedAt: 1, matches: [match("old")] }),
		);

		expect(readCachedMatches("puuid-a", options())).toBeUndefined();
	});

	it("degrades silently when the storage quota is exhausted", () => {
		storage.failOnWrite = true;

		expect(() =>
			writeCachedMatches("puuid-a", [match("m1")], options()),
		).not.toThrow();
	});
});

describe("latest cached history", () => {
	it("finds the most recently written player without knowing the puuid", () => {
		writeCachedMatches("puuid-a", [match("a1")], options());
		writeCachedMatches("puuid-b", [match("b1")], options());

		expect(readLatestCachedMatches(options())?.matches[0]?.matchId).toBe("b1");
	});

	it("returns nothing when the cache is empty", () => {
		expect(readLatestCachedMatches(options())).toBeUndefined();
	});

	it("ignores an empty refresh so a partial load cannot erase the history", () => {
		writeCachedMatches("puuid-a", [match("a1")], options());
		writeCachedMatches("puuid-a", [], options());

		expect(readCachedMatches("puuid-a", options())?.matches).toHaveLength(1);
	});
});
