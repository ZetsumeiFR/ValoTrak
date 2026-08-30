import type { BundleSummary } from "@valotrak/valorant";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Countdown } from "@/components/shop/shop-countdown";

export function BundleCard({
	bundle,
	name,
	icon,
}: {
	bundle: BundleSummary;
	name: string;
	icon: string | null;
}) {
	const { t } = useTranslation();
	return (
		<div className="relative flex flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40">
			<div className="relative flex aspect-[16/6] items-end justify-start overflow-hidden">
				{icon ? (
					<img src={icon} alt="" className="h-full w-full object-cover" />
				) : null}
				<div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
				<h3 className="relative z-10 px-4 py-3 font-bold text-base tracking-tight">
					{name}
				</h3>
			</div>
			<div className="flex items-center justify-between gap-2 px-4 py-2.5">
				<span className="flex items-center gap-2 text-muted-foreground text-xs">
					<span className="flex items-center gap-1 font-mono tabular-nums">
						<Clock className="size-3" />
						<Countdown seconds={bundle.remainingSeconds} />
					</span>
					<span>·</span>
					<span>{t("shop.bundleItems", { count: bundle.itemCount })}</span>
				</span>
				<span className="flex items-baseline gap-2">
					{bundle.baseVp > bundle.totalVp ? (
						<span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums line-through">
							{bundle.baseVp.toLocaleString()}
						</span>
					) : null}
					<span className="font-mono text-sm tabular-nums">
						{bundle.totalVp.toLocaleString()} VP
					</span>
				</span>
			</div>
		</div>
	);
}
