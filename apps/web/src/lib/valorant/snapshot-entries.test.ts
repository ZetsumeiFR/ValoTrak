/// <reference types="bun" />

import { describe, expect, it } from "bun:test";
import type { EnrichedPlayer } from "@valotrak/valorant";

import {
	selectSnapshotEntries,
	snapshotBatchSignature,
} from "./snapshot-entries";

function player(puuid: string, extra: Partial<EnrichedPlayer> = {}) {
	return {
		puuid,
		teamId: "Blue",
		isAlly: true,
		isSelf: false,
		...extra,
	} as EnrichedPlayer;
}

const rank = { tier: 18, rr: 40 };

describe("selectSnapshotEntries", () => {
	it("keeps only followed players that already carry data", () => {
		const entries = selectSnapshotEntries(
			[
				player("followed-with-rank", { rank }),
				player("followed-without-data"),
				player("not-followed", { rank }),
			],
			new Set(["followed-with-rank", "followed-without-data"]),
		);

		expect(entries.map((entry) => entry.puuid)).toEqual(["followed-with-rank"]);
	});
});

describe("snapshotBatchSignature", () => {
	it("changes when the lobby swaps a player at constant size", () => {
		const followed = new Set(["a", "b", "c"]);
		const before = selectSnapshotEntries(
			[player("a", { rank }), player("b", { rank })],
			followed,
		);
		const after = selectSnapshotEntries(
			[player("a", { rank }), player("c", { rank })],
			followed,
		);

		expect(before).toHaveLength(after.length);
		expect(snapshotBatchSignature(before)).not.toBe(
			snapshotBatchSignature(after),
		);
	});

	it("is stable across player ordering", () => {
		const followed = new Set(["a", "b"]);
		const first = selectSnapshotEntries(
			[player("a", { rank }), player("b", { rank })],
			followed,
		);
		const reordered = selectSnapshotEntries(
			[player("b", { rank }), player("a", { rank })],
			followed,
		);

		expect(snapshotBatchSignature(first)).toBe(
			snapshotBatchSignature(reordered),
		);
	});
});
