import { describe, expect, it } from "bun:test";

import { trendsToCsv } from "./trend-export";
import type { TrendPoint } from "./types";

function point(overrides: Partial<TrendPoint> = {}): TrendPoint {
	return {
		capturedAt: Date.UTC(2026, 7, 30, 12, 0, 0),
		tier: 18,
		rr: 42,
		kd: 1.2,
		acs: 240,
		hsPercent: 22,
		winRate: 60,
		...overrides,
	};
}

describe("trendsToCsv", () => {
	it("emits a header even with no data", () => {
		expect(trendsToCsv([])).toBe(
			"capturedAt,tier,rr,kd,acs,hsPercent,winRate\n",
		);
	});

	it("writes one chronological row per point with an ISO timestamp", () => {
		const csv = trendsToCsv([
			point(),
			point({ capturedAt: Date.UTC(2026, 7, 31, 12, 0, 0), rr: 55 }),
		]);
		const lines = csv.trimEnd().split("\n");

		expect(lines).toHaveLength(3);
		expect(lines[1]).toBe("2026-08-30T12:00:00.000Z,18,42,1.2,240,22,60");
		expect(lines[2]).toBe("2026-08-31T12:00:00.000Z,18,55,1.2,240,22,60");
	});

	it("leaves missing measurements empty rather than writing null or zero", () => {
		const csv = trendsToCsv([point({ kd: null, acs: null, rr: null })]);
		const row = csv.trimEnd().split("\n")[1];

		expect(row).toBe("2026-08-30T12:00:00.000Z,18,,,,22,60");
	});
});
