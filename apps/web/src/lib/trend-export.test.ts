/// <reference types="bun" />
import { describe, expect, it } from "bun:test";

import { buildTrendSvg, exportFilename } from "./trend-export";

const geometry = { width: 200, rowHeight: 100 };

describe("buildTrendSvg", () => {
	it("is standalone: no currentColor, no CSS class dependency", () => {
		const svg = buildTrendSvg({
			title: "Trends",
			series: [{ label: "RR", values: [10, 20] }],
			...geometry,
		});

		expect(svg).toContain("<svg");
		expect(svg).not.toContain("currentColor");
		expect(svg).not.toContain("class=");
	});

	it("sizes the canvas from the number of series", () => {
		const one = buildTrendSvg({
			title: "Trends",
			series: [{ label: "RR", values: [1, 2] }],
			...geometry,
		});
		const three = buildTrendSvg({
			title: "Trends",
			series: [
				{ label: "RR", values: [1, 2] },
				{ label: "KD", values: [1, 2] },
				{ label: "ACS", values: [1, 2] },
			],
			...geometry,
		});

		expect(one).toContain('height="156"');
		expect(three).toContain('height="356"');
	});

	it("maps the lowest value to the bottom and the highest to the top", () => {
		const svg = buildTrendSvg({
			title: "Trends",
			series: [{ label: "RR", values: [0, 10] }],
			...geometry,
		});

		expect(svg).toContain("56.00,144.00");
		expect(svg).toContain("184.00,80.00");
	});

	it("centres a flat series instead of dividing by a zero range", () => {
		const svg = buildTrendSvg({
			title: "Trends",
			series: [{ label: "RR", values: [5, 5] }],
			...geometry,
		});

		expect(svg).toContain("56.00,112.00");
		expect(svg).toContain("184.00,112.00");
	});

	it("ignores gaps in the history", () => {
		const svg = buildTrendSvg({
			title: "Trends",
			series: [{ label: "RR", values: [0, null, 10] }],
			...geometry,
		});

		expect(svg).toContain("56.00,144.00");
		expect(svg).toContain("184.00,80.00");
	});

	it("escapes text so a Riot ID cannot break the document", () => {
		const svg = buildTrendSvg({
			title: "Rock & <Roll>",
			series: [{ label: "RR", values: [1, 2] }],
			...geometry,
		});

		expect(svg).toContain("Rock &amp; &lt;Roll&gt;");
		expect(svg).not.toContain("<Roll>");
	});
});

describe("exportFilename", () => {
	it("builds a dated, extension-suffixed name from the Riot ID", () => {
		const name = exportFilename(
			"csv",
			{ gameName: "Player", tagLine: "EUW" },
			new Date(Date.UTC(2026, 7, 30)),
		);

		expect(name).toBe("valotrak-trends-Player-EUW-2026-08-30.csv");
	});

	it("strips characters the filesystem would reject", () => {
		const name = exportFilename(
			"png",
			{ gameName: "a/b:c*d", tagLine: "E U" },
			new Date(Date.UTC(2026, 7, 30)),
		);

		expect(name).toBe("valotrak-trends-a-b-c-d-E-U-2026-08-30.png");
	});

	it("falls back to a generic name when the Riot ID is unknown", () => {
		const name = exportFilename("csv", {}, new Date(Date.UTC(2026, 7, 30)));

		expect(name).toBe("valotrak-trends-player-2026-08-30.csv");
	});
});
