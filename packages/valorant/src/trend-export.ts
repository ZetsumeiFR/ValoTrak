import type { TrendPoint } from "./types";

const COLUMNS = [
	"capturedAt",
	"tier",
	"rr",
	"kd",
	"acs",
	"hsPercent",
	"winRate",
] as const;

/** Missing measurements stay empty: 0 would be read as a real value. */
function cell(value: number | null): string {
	return value === null ? "" : String(value);
}

/**
 * Serialize a trend history to CSV, oldest first.
 *
 * Values are written unrounded — this is a data export, the charts are where
 * rounding belongs. Every field is a number or an ISO timestamp, so no field
 * can contain a separator and no quoting is needed.
 */
export function trendsToCsv(points: TrendPoint[]): string {
	const rows = points.map((point) =>
		[
			new Date(point.capturedAt).toISOString(),
			cell(point.tier),
			cell(point.rr),
			cell(point.kd),
			cell(point.acs),
			cell(point.hsPercent),
			cell(point.winRate),
		].join(","),
	);
	return `${[COLUMNS.join(","), ...rows].join("\n")}\n`;
}
