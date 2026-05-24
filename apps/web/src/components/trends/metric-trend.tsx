import { cn } from "@valotrak/ui/lib/utils";
import { useTranslation } from "react-i18next";

import { TrendChart } from "./trend-chart";

export function MetricTrend({
	label,
	values,
	format,
	color = "brand",
}: {
	label: string;
	values: (number | null)[];
	format: (value: number) => string;
	color?: "brand" | "win" | "loss";
}) {
	const { t } = useTranslation();
	const series = values.filter((value): value is number => value != null);
	const enough = series.length >= 2;
	const current = series.length > 0 ? series[series.length - 1] : undefined;
	const first = series[0];
	const delta =
		enough && current != null && first != null ? current - first : 0;
	const deltaColor =
		delta > 0 ? "text-win" : delta < 0 ? "text-loss" : "text-muted-foreground";

	return (
		<div className="clip-corner flex flex-col gap-2 bg-card p-4 ring-1 ring-border">
			<div className="flex items-baseline justify-between gap-2">
				<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
					{label}
				</span>
				{enough ? (
					<span className={cn("font-mono text-xs tabular-nums", deltaColor)}>
						{delta > 0 ? "+" : ""}
						{format(delta)}
					</span>
				) : null}
			</div>
			<div className="font-bold font-sans text-2xl tabular-nums leading-none">
				{current != null ? format(current) : "—"}
			</div>
			{enough ? (
				<TrendChart values={series} color={color} height={56} />
			) : (
				<p className="font-mono text-[10px] text-muted-foreground">
					{t("trends.notEnoughHistory")}
				</p>
			)}
		</div>
	);
}
