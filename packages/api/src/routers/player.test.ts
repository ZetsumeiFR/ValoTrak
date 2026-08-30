/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import type { Database } from "@valotrak/db";
import { playerStatsCache } from "@valotrak/db/schema/valorant";
import { and, eq } from "drizzle-orm";

import type { Context } from "../context";
import { createCallerFactory } from "../index";
import { purgeOldSnapshots } from "../retention";
import { createTestDb, insertTestUser, type TestDb } from "../test/db";
import { playerRouter } from "./player";

const createCaller = createCallerFactory(playerRouter);

const USER = "user-1";
const OTHER_USER = "user-2";
const PUUID = "puuid-aaa";
const MATCH = "match-123";

function contextFor(db: Database, userId: string): Context {
	return {
		db,
		session: {
			user: { id: userId },
		} as unknown as Context["session"],
	};
}

function callerFor(db: Database, userId: string) {
	return createCaller(contextFor(db, userId));
}

const SNAPSHOT = {
	riotId: { gameName: "Player", tagLine: "EUW" },
	rank: { tier: 18, rr: 42 },
	level: 120,
	stats: {
		matchesAnalyzed: 5,
		kd: 1.2,
		avgKills: 18,
		avgDeaths: 15,
		avgAssists: 4,
		acs: 240,
		hsPercent: 22,
		winRate: 60,
		wins: 3,
		losses: 2,
		mainAgents: [{ agentId: "jett", games: 3, winRate: 66 }],
	},
};

let handle: TestDb;
let db: Database;

beforeEach(async () => {
	handle = await createTestDb();
	db = handle.db;
	await insertTestUser(db, USER);
	await insertTestUser(db, OTHER_USER);
	await callerFor(db, USER).follow({
		puuid: PUUID,
		gameName: "Player",
		tagLine: "EUW",
		region: "eu",
	});
});

afterEach(async () => {
	await handle.close();
});

function snapshotRows(userId: string, puuid: string) {
	return db
		.select()
		.from(playerStatsCache)
		.where(
			and(
				eq(playerStatsCache.userId, userId),
				eq(playerStatsCache.puuid, puuid),
			),
		);
}

describe("player.saveCache", () => {
	it("keeps a single row when the same match snapshot is saved twice", async () => {
		const caller = callerFor(db, USER);
		const input = {
			puuid: PUUID,
			region: "eu",
			matchId: MATCH,
			snapshot: SNAPSHOT,
		};

		await caller.saveCache(input);
		await caller.saveCache(input);

		const rows = await snapshotRows(USER, PUUID);
		expect(rows).toHaveLength(1);
	});

	it("stores one row per distinct match", async () => {
		const caller = callerFor(db, USER);
		await caller.saveCache({
			puuid: PUUID,
			region: "eu",
			matchId: MATCH,
			snapshot: SNAPSHOT,
		});
		await caller.saveCache({
			puuid: PUUID,
			region: "eu",
			matchId: "match-456",
			snapshot: SNAPSHOT,
		});

		const rows = await snapshotRows(USER, PUUID);
		expect(rows).toHaveLength(2);
	});

	it("rejects a player the caller does not follow", async () => {
		const caller = callerFor(db, USER);
		await expect(
			caller.saveCache({
				puuid: "puuid-not-followed",
				region: "eu",
				matchId: MATCH,
				snapshot: SNAPSHOT,
			}),
		).rejects.toThrow(/must follow this player/i);
	});
});

describe("player.saveCacheMany", () => {
	it("inserts one row per player in a single call", async () => {
		const caller = callerFor(db, USER);
		await caller.follow({
			puuid: "puuid-bbb",
			gameName: "Mate",
			tagLine: "EUW",
			region: "eu",
		});

		const saved = await caller.saveCacheMany({
			region: "eu",
			matchId: MATCH,
			entries: [
				{ puuid: PUUID, snapshot: SNAPSHOT },
				{ puuid: "puuid-bbb", snapshot: SNAPSHOT },
			],
		});

		expect(saved.saved).toBe(2);
		expect(await snapshotRows(USER, PUUID)).toHaveLength(1);
		expect(await snapshotRows(USER, "puuid-bbb")).toHaveLength(1);
	});

	it("silently skips players the caller does not follow", async () => {
		const caller = callerFor(db, USER);
		const saved = await caller.saveCacheMany({
			region: "eu",
			matchId: MATCH,
			entries: [
				{ puuid: PUUID, snapshot: SNAPSHOT },
				{ puuid: "puuid-not-followed", snapshot: SNAPSHOT },
			],
		});

		expect(saved.saved).toBe(1);
		expect(await snapshotRows(USER, "puuid-not-followed")).toHaveLength(0);
	});

	it("is idempotent for a replayed lobby", async () => {
		const caller = callerFor(db, USER);
		const input = {
			region: "eu",
			matchId: MATCH,
			entries: [{ puuid: PUUID, snapshot: SNAPSHOT }],
		};
		await caller.saveCacheMany(input);
		await caller.saveCacheMany(input);

		expect(await snapshotRows(USER, PUUID)).toHaveLength(1);
	});
});

describe("player.getCache", () => {
	it("rejects a player the caller does not follow", async () => {
		await expect(
			callerFor(db, OTHER_USER).getCache({ puuid: PUUID }),
		).rejects.toThrow(/must follow this player/i);
	});

	it("never returns another user's snapshots", async () => {
		await callerFor(db, USER).saveCache({
			puuid: PUUID,
			region: "eu",
			matchId: MATCH,
			snapshot: SNAPSHOT,
		});
		await callerFor(db, OTHER_USER).follow({
			puuid: PUUID,
			gameName: "Player",
			tagLine: "EUW",
			region: "eu",
		});

		const rows = await callerFor(db, OTHER_USER).getCache({ puuid: PUUID });
		expect(rows).toHaveLength(0);
	});
});

describe("purgeOldSnapshots", () => {
	it("deletes snapshots older than the retention window and keeps recent ones", async () => {
		const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
		await db.insert(playerStatsCache).values([
			{
				userId: USER,
				puuid: PUUID,
				region: "eu",
				matchId: "old-match",
				capturedAt: old,
				payload: SNAPSHOT,
			},
			{
				userId: USER,
				puuid: PUUID,
				region: "eu",
				matchId: "fresh-match",
				capturedAt: new Date(),
				payload: SNAPSHOT,
			},
		]);

		const deleted = await purgeOldSnapshots(db, 90);

		expect(deleted).toBe(1);
		const rows = await snapshotRows(USER, PUUID);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.matchId).toBe("fresh-match");
	});
});
