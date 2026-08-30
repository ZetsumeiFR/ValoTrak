import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Countdown } from "@/components/shop/shop-countdown";

export function SectionHeading({
	children,
	remainingSeconds,
}: {
	children: ReactNode;
	remainingSeconds?: number;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex items-center justify-between gap-3">
			<h2 className="tick font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
				{children}
			</h2>
			{remainingSeconds !== undefined ? (
				<span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
					<Clock className="size-3" />
					{t("shop.renewsIn")} <Countdown seconds={remainingSeconds} />
				</span>
			) : null}
		</div>
	);
}
