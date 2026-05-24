import { cn } from "@valorant-tracker/ui/lib/utils";
import { useId } from "react";

const COLOR_CLASS = {
	brand: "text-brand",
	win: "text-win",
	loss: "text-loss",
} as const;

/**
 * Dependency-free SVG line+area chart. Scales to its container width via a
 * normalized viewBox; strokes stay crisp with `vector-effect="non-scaling-stroke"`.
 * Expects at least two values.
 */
export function TrendChart({
	values,
	color = "brand",
	height = 80,
	className,
}: {
	values: number[];
	color?: "brand" | "win" | "loss";
	height?: number;
	className?: string;
}) {
	const gradientId = useId();
	const count = values.length;
	const width = 100;
	const padY = 8;

	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;

	const x = (index: number) => (index / (count - 1)) * width;
	const y = (value: number) =>
		padY + (1 - (value - min) / range) * (height - 2 * padY);

	const line = values
		.map(
			(value, index) =>
				`${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(value).toFixed(2)}`,
		)
		.join(" ");
	const area = `${line} L ${width},${height} L 0,${height} Z`;
	const lastX = x(count - 1);

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			preserveAspectRatio="none"
			className={cn("w-full", COLOR_CLASS[color], className)}
			style={{ height }}
			role="img"
			aria-label="Trend chart"
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
					<stop offset="100%" stopColor="currentColor" stopOpacity="0" />
				</linearGradient>
			</defs>
			<path d={area} fill={`url(#${gradientId})`} />
			<path
				d={line}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
			<line
				x1={lastX}
				y1="0"
				x2={lastX}
				y2={height}
				stroke="currentColor"
				strokeWidth="1"
				strokeOpacity="0.4"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}
