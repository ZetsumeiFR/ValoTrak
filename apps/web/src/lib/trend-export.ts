export interface TrendSeries {
	label: string;
	values: (number | null)[];
}

export interface TrendSvgOptions {
	title: string;
	subtitle?: string;
	series: TrendSeries[];
	width?: number;
	rowHeight?: number;
}

const HEADER_HEIGHT = 56;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PANEL_TOP = 24;
const PANEL_BOTTOM = 12;
const DEFAULT_WIDTH = 720;
const DEFAULT_ROW_HEIGHT = 110;

/**
 * The export is rendered from the data rather than scraped from the DOM: the
 * on-screen charts are 100x56 slivers styled with CSS variables and
 * `currentColor`, none of which survives serialisation to a standalone file.
 */
const COLORS = {
	background: "#0b0e14",
	foreground: "#e6e8ec",
	muted: "#8b93a7",
	grid: "#232936",
	line: "#ff4655",
} as const;

const FONT =
	"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function formatTick(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** Shared by the builder and its callers so the two cannot disagree. */
export function trendSvgHeight(
	seriesCount: number,
	rowHeight = DEFAULT_ROW_HEIGHT,
): number {
	return HEADER_HEIGHT + seriesCount * rowHeight;
}

export function trendSvgWidth(width = DEFAULT_WIDTH): number {
	return width;
}

function panel(
	series: TrendSeries,
	index: number,
	width: number,
	rowHeight: number,
): string {
	const top = HEADER_HEIGHT + index * rowHeight;
	const plotTop = top + PANEL_TOP;
	const plotBottom = top + rowHeight - PANEL_BOTTOM;
	const plotLeft = PAD_LEFT;
	const plotRight = width - PAD_RIGHT;
	const label = `<text x="${PAD_LEFT}" y="${top + 14}" font-family="${FONT}" font-size="11" fill="${COLORS.muted}" letter-spacing="1.2">${escapeXml(series.label.toUpperCase())}</text>`;
	const separator = `<line x1="0" y1="${top}" x2="${width}" y2="${top}" stroke="${COLORS.grid}" stroke-width="1" />`;

	const points = series.values.filter(
		(value): value is number => value !== null,
	);
	if (points.length < 2) {
		return `${separator}${label}<text x="${plotLeft}" y="${(plotTop + plotBottom) / 2}" font-family="${FONT}" font-size="12" fill="${COLORS.muted}">no data</text>`;
	}

	const min = Math.min(...points);
	const max = Math.max(...points);
	const range = max - min;
	const x = (position: number) =>
		plotLeft + (position / (points.length - 1)) * (plotRight - plotLeft);
	const y = (value: number) =>
		range === 0
			? (plotTop + plotBottom) / 2
			: plotBottom - ((value - min) / range) * (plotBottom - plotTop);

	const line = points
		.map(
			(value, position) =>
				`${position === 0 ? "M" : "L"}${x(position).toFixed(2)},${y(value).toFixed(2)}`,
		)
		.join(" ");
	const area = `${line} L${x(points.length - 1).toFixed(2)},${plotBottom.toFixed(2)} L${plotLeft.toFixed(2)},${plotBottom.toFixed(2)} Z`;

	const axis = `<text x="${plotLeft - 8}" y="${plotTop + 4}" text-anchor="end" font-family="${FONT}" font-size="10" fill="${COLORS.muted}">${escapeXml(formatTick(max))}</text><text x="${plotLeft - 8}" y="${plotBottom}" text-anchor="end" font-family="${FONT}" font-size="10" fill="${COLORS.muted}">${escapeXml(formatTick(min))}</text>`;
	const latest = points[points.length - 1] ?? 0;
	const current = `<text x="${plotRight}" y="${top + 14}" text-anchor="end" font-family="${FONT}" font-size="13" font-weight="600" fill="${COLORS.foreground}">${escapeXml(formatTick(latest))}</text>`;

	return `${separator}${label}${current}${axis}<path d="${area}" fill="${COLORS.line}" fill-opacity="0.18" /><path d="${line}" fill="none" stroke="${COLORS.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`;
}

/**
 * A self-contained SVG document of the whole trend history: explicit colours,
 * explicit fonts, no external references, so it rasterises to PNG unchanged.
 */
export function buildTrendSvg(options: TrendSvgOptions): string {
	const width = trendSvgWidth(options.width);
	const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
	const height = trendSvgHeight(options.series.length, rowHeight);
	const panels = options.series
		.map((series, index) => panel(series, index, width, rowHeight))
		.join("");
	const subtitle = options.subtitle
		? `<text x="${PAD_LEFT}" y="42" font-family="${FONT}" font-size="11" fill="${COLORS.muted}">${escapeXml(options.subtitle)}</text>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${COLORS.background}" /><text x="${PAD_LEFT}" y="26" font-family="${FONT}" font-size="15" font-weight="600" fill="${COLORS.foreground}">${escapeXml(options.title)}</text>${subtitle}${panels}</svg>`;
}

function slug(value: string): string {
	return value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** `valotrak-trends-<name>-<tag>-<date>.<ext>`, safe on every filesystem. */
export function exportFilename(
	extension: string,
	identity: { gameName?: string; tagLine?: string },
	at: Date,
): string {
	const parts = [identity.gameName, identity.tagLine]
		.map((part) => (part ? slug(part) : ""))
		.filter((part) => part.length > 0);
	const who = parts.length > 0 ? parts.join("-") : "player";
	return `valotrak-trends-${who}-${at.toISOString().slice(0, 10)}.${extension}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", () =>
			reject(new Error("the chart could not be rasterised")),
		);
		image.src = url;
	});
}

/** Rasterise a standalone SVG document through a canvas. Browser-only. */
export async function svgToPngBlob(
	svg: string,
	width: number,
	height: number,
	scale = 2,
): Promise<Blob> {
	const url = URL.createObjectURL(
		new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
	);
	try {
		const image = await loadImage(url);
		const canvas = document.createElement("canvas");
		canvas.width = width * scale;
		canvas.height = height * scale;
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("no 2D canvas context available");
		}
		context.scale(scale, scale);
		context.drawImage(image, 0, 0, width, height);
		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) =>
					blob ? resolve(blob) : reject(new Error("PNG encoding failed")),
				"image/png",
			);
		});
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** Hand a blob to the browser as a download. */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	// Revoked on the next tick: revoking synchronously can cancel the download.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
