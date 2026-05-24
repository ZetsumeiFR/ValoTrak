import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import type { TrendPoint } from "@valotrak/valorant";
import { ChartLine } from "lucide-react";
import { useTranslation } from "react-i18next";

import { MetricTrend } from "./metric-trend";

export function PlayerTrends({ points }: { points: TrendPoint[] }) {
	const { t } = useTranslation();
	if (points.length === 0) {
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

	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<MetricTrend
				label={t("trends.metricRr")}
				values={points.map((point) => point.rr)}
				format={(value) => String(Math.round(value))}
			/>
			<MetricTrend
				label={t("trends.metricKd")}
				values={points.map((point) => point.kd)}
				format={(value) => value.toFixed(2)}
			/>
			<MetricTrend
				label={t("trends.metricAcs")}
				values={points.map((point) => point.acs)}
				format={(value) => String(Math.round(value))}
			/>
			<MetricTrend
				label={t("trends.metricHs")}
				values={points.map((point) => point.hsPercent)}
				format={(value) => `${Math.round(value)}%`}
			/>
			<MetricTrend
				label={t("trends.metricWin")}
				values={points.map((point) => point.winRate)}
				format={(value) => `${Math.round(value)}%`}
			/>
		</div>
	);
}
