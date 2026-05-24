import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import type { TrendPoint } from "@valotrak/valorant";
import { ChartLine } from "lucide-react";

import { MetricTrend } from "./metric-trend";

export function PlayerTrends({ points }: { points: TrendPoint[] }) {
	if (points.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ChartLine />
					</EmptyMedia>
					<EmptyTitle>No history yet</EmptyTitle>
					<EmptyDescription>
						Snapshots accumulate each time you refresh the live lobby while this
						player is followed.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<MetricTrend
				label="Rank Rating"
				values={points.map((point) => point.rr)}
				format={(value) => String(Math.round(value))}
			/>
			<MetricTrend
				label="K/D"
				values={points.map((point) => point.kd)}
				format={(value) => value.toFixed(2)}
			/>
			<MetricTrend
				label="Combat Score"
				values={points.map((point) => point.acs)}
				format={(value) => String(Math.round(value))}
			/>
			<MetricTrend
				label="Headshot %"
				values={points.map((point) => point.hsPercent)}
				format={(value) => `${Math.round(value)}%`}
			/>
			<MetricTrend
				label="Win Rate"
				values={points.map((point) => point.winRate)}
				format={(value) => `${Math.round(value)}%`}
			/>
		</div>
	);
}
