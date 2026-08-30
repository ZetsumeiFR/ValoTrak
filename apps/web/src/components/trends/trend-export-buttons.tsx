import { Button } from "@valotrak/ui/components/button";
import { type TrendPoint, trendsToCsv } from "@valotrak/valorant";
import { Download, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
	buildTrendSvg,
	downloadBlob,
	exportFilename,
	svgToPngBlob,
	type TrendSeries,
	trendSvgHeight,
	trendSvgWidth,
} from "@/lib/trend-export";

export interface TrendExportIdentity {
	gameName?: string;
	tagLine?: string;
	region?: string;
}

export function TrendExportButtons({
	points,
	identity,
	title,
}: {
	points: TrendPoint[];
	identity: TrendExportIdentity;
	title: string;
}) {
	const { t } = useTranslation();
	const [rendering, setRendering] = useState(false);
	const disabled = points.length === 0;

	function exportCsv() {
		const blob = new Blob([trendsToCsv(points)], {
			type: "text/csv;charset=utf-8",
		});
		downloadBlob(blob, exportFilename("csv", identity, new Date()));
	}

	async function exportPng() {
		setRendering(true);
		try {
			const series: TrendSeries[] = [
				{ label: t("trends.metricRr"), values: points.map((p) => p.rr) },
				{ label: t("trends.metricKd"), values: points.map((p) => p.kd) },
				{ label: t("trends.metricAcs"), values: points.map((p) => p.acs) },
				{ label: t("trends.metricHs"), values: points.map((p) => p.hsPercent) },
				{ label: t("trends.metricWin"), values: points.map((p) => p.winRate) },
			];
			const svg = buildTrendSvg({
				title,
				subtitle: t("trends.exportSubtitle", { points: points.length }),
				series,
			});
			const blob = await svgToPngBlob(
				svg,
				trendSvgWidth(),
				trendSvgHeight(series.length),
			);
			downloadBlob(blob, exportFilename("png", identity, new Date()));
		} catch (error) {
			toast.error(t("trends.exportFailed"), {
				description: error instanceof Error ? error.message : undefined,
			});
		} finally {
			setRendering(false);
		}
	}

	return (
		<div className="ml-auto flex items-center gap-2">
			<Button
				disabled={disabled}
				onClick={exportCsv}
				size="sm"
				variant="outline"
			>
				<Download data-icon="inline-start" />
				{t("trends.exportCsv")}
			</Button>
			<Button
				disabled={disabled || rendering}
				onClick={exportPng}
				size="sm"
				variant="outline"
			>
				<ImageIcon data-icon="inline-start" />
				{t("trends.exportPng")}
			</Button>
		</div>
	);
}
