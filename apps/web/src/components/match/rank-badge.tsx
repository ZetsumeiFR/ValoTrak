import { cn } from "@valotrak/ui/lib/utils";
import type { CompetitiveTier } from "@valotrak/valorant";
import { useTranslation } from "react-i18next";

export function RankBadge({
	tier,
	rr,
	tiersById,
	className,
}: {
	tier?: number;
	rr?: number;
	tiersById: Map<number, CompetitiveTier>;
	className?: string;
}) {
	const { t } = useTranslation();
	const info = tier !== undefined ? tiersById.get(tier) : undefined;

	if (!tier || !info) {
		return (
			<span className={cn("text-muted-foreground text-xs", className)}>
				{t("common.unranked")}
			</span>
		);
	}

	return (
		<span className={cn("inline-flex items-center gap-1.5", className)}>
			{info.smallIcon ? (
				<img src={info.smallIcon} alt="" className="size-5 shrink-0" />
			) : null}
			<span className="font-medium" style={{ color: `#${info.color}` }}>
				{info.tierName}
			</span>
			{rr !== undefined ? (
				<span className="text-muted-foreground tabular-nums">{rr} RR</span>
			) : null}
		</span>
	);
}
