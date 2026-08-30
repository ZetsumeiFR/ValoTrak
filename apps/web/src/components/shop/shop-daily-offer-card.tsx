import type { ContentTier, SkinLevel, StoreOffer } from "@valotrak/valorant";

import { OfferCard } from "@/components/shop/shop-offer-card";

export function DailyOfferCard({
	offer,
	skinsById,
	tiersById,
}: {
	offer: StoreOffer;
	skinsById: Map<string, SkinLevel>;
	tiersById: Map<string, ContentTier>;
}) {
	const skin = skinsById.get(offer.skinLevelId);
	const tier = skin?.contentTierId
		? tiersById.get(skin.contentTierId)
		: undefined;
	return (
		<OfferCard
			name={skin?.displayName ?? "—"}
			icon={skin?.displayIcon ?? null}
			tierColor={tier ? `#${tier.highlightColor}` : undefined}
		>
			<span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
				{offer.vpCost.toLocaleString()} VP
			</span>
		</OfferCard>
	);
}
