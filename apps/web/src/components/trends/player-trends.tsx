import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import {
	type RankedMatch,
	rankedMatchesToTrend,
	type TrendPoint,
} from "@valotrak/valorant";
import { ChartLine } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { MetricTrend } from "./metric-trend";

export function PlayerTrends({
	points,
	rankedMatches = [],
}: {
	points: TrendPoint[];
	/** Riot's ranked history, preferred over stored snapshots for the rating. */
	rankedMatches?: RankedMatch[];
}) {
	const { t } = useTranslation();
	const rankedPoints = useMemo(
		() => rankedMatchesToTrend(rankedMatches),
		[rankedMatches],
	);

	if (points.length === 0 && rankedPoints.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<ChartLine />
					</EmptyMedia>
					<EmptyTitle>{t("trends.noHistoryTitle")}</EmptyTitle>
					<EmptyDescription>{t("trends.noHistoryDesc")}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	// Riot's history is retroactive and exact, so it wins over the snapshots
	// this app accumulates; the snapshots remain the only source for the rest.
	const usesRankedHistory = rankedPoints.length >= 2;
	const rrValues = usesRankedHistory
		? rankedPoints.map((point) => point.rr)
		: points.map((point) => point.rr);
	const lastMatch = rankedMatches[rankedMatches.length - 1];

	return (
		<div className="flex flex-col gap-3">
			{usesRankedHistory ? (
				<p className="font-mono text-[10px] text-muted-foreground">
					{t("trends.rankedSource", { count: rankedPoints.length })}
					{lastMatch
						? ` · ${t("trends.lastMatchRr", {
								change: `${lastMatch.rrChange > 0 ? "+" : ""}${lastMatch.rrChange}`,
							})}`
						: null}
				</p>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<MetricTrend
					format={(value) => String(Math.round(value))}
					label={t("trends.metricRr")}
					values={rrValues}
				/>
				<MetricTrend
					format={(value) => value.toFixed(2)}
					label={t("trends.metricKd")}
					values={points.map((point) => point.kd)}
				/>
				<MetricTrend
					format={(value) => String(Math.round(value))}
					label={t("trends.metricAcs")}
					values={points.map((point) => point.acs)}
				/>
				<MetricTrend
					format={(value) => `${Math.round(value)}%`}
					label={t("trends.metricHs")}
					values={points.map((point) => point.hsPercent)}
				/>
				<MetricTrend
					format={(value) => `${Math.round(value)}%`}
					label={t("trends.metricWin")}
					values={points.map((point) => point.winRate)}
				/>
			</div>
		</div>
	);
}
