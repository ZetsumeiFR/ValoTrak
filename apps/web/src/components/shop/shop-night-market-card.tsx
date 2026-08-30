import { Badge } from "@valotrak/ui/components/badge";
import type {
	ContentTier,
	NightMarketOffer,
	SkinLevel,
} from "@valotrak/valorant";
import { useTranslation } from "react-i18next";

import { OfferCard } from "@/components/shop/shop-offer-card";

export function NightMarketCard({
	offer,
	skinsById,
	tiersById,
}: {
	offer: NightMarketOffer;
	skinsById: Map<string, SkinLevel>;
	tiersById: Map<string, ContentTier>;
}) {
	const { t } = useTranslation();
	const skin = skinsById.get(offer.skinLevelId);
	const tier = skin?.contentTierId
		? tiersById.get(skin.contentTierId)
		: undefined;
	return (
		<div className="relative">
			<Badge className="absolute top-2 right-2 z-10" variant="secondary">
				{t("shop.nightMarketDiscount", { percent: offer.discountPercent })}
			</Badge>
			<OfferCard
				name={skin?.displayName ?? "—"}
				icon={skin?.displayIcon ?? null}
				tierColor={tier ? `#${tier.highlightColor}` : undefined}
			>
				<span className="flex shrink-0 flex-col items-end leading-tight">
					<span className="font-mono text-[10px] text-muted-foreground/70 tabular-nums line-through">
						{offer.vpCost.toLocaleString()}
					</span>
					<span className="font-mono text-brand text-xs tabular-nums">
						{offer.discountedVpCost.toLocaleString()} VP
					</span>
				</span>
			</OfferCard>
		</div>
	);
}
