import { Badge } from "@valotrak/ui/components/badge";
import { Button } from "@valotrak/ui/components/button";
import { Input } from "@valotrak/ui/components/input";
import type { SkinLevel } from "@valotrak/valorant";
import { Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SectionHeading } from "@/components/shop/shop-section-heading";
import { searchWatchableSkins } from "@/lib/valorant/shop-alerts";
import { useOwnedSkins, useVpPrices } from "@/lib/valorant/use-inventory";
import {
	toggleWatchedSkin,
	useWatchedSkins,
} from "@/lib/valorant/use-watchlist";

export function ShopWatchlist({
	skinsById,
}: {
	skinsById: Map<string, SkinLevel>;
}) {
	const { t } = useTranslation();
	const watched = useWatchedSkins();
	const owned = useOwnedSkins();
	const prices = useVpPrices();
	const [query, setQuery] = useState("");

	const results = useMemo(
		() => searchWatchableSkins([...skinsById.values()], query, { owned }),
		[skinsById, query, owned],
	);

	const watchedSkins = useMemo(
		() =>
			[...watched].map((skinLevelId) => ({
				skinLevelId,
				name: skinsById.get(skinLevelId)?.displayName,
				vp: prices.get(skinLevelId),
			})),
		[watched, skinsById, prices],
	);

	return (
		<section className="flex flex-col gap-3">
			<SectionHeading>{t("shop.watchlistTitle")}</SectionHeading>
			<p className="font-mono text-[10px] text-muted-foreground">
				{t("shop.watchlistHint")}
			</p>

			<Input
				onChange={(event) => setQuery(event.target.value)}
				placeholder={t("shop.watchlistSearch")}
				value={query}
			/>

			{results.length > 0 ? (
				<div className="flex flex-col gap-1">
					{results.map((skin) => (
						<Button
							className="justify-start"
							key={skin.levelId}
							onClick={() => toggleWatchedSkin(skin.levelId)}
							size="sm"
							type="button"
							variant="ghost"
						>
							<Star
								className={
									watched.has(skin.levelId) ? "fill-current text-brand" : ""
								}
								data-icon="inline-start"
							/>
							{skin.displayName}
						</Button>
					))}
				</div>
			) : null}

			{watchedSkins.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{watchedSkins.map((skin) => (
						<Badge className="gap-1" key={skin.skinLevelId} variant="outline">
							{skin.name ?? skin.skinLevelId}
							{skin.vp === undefined ? null : (
								<span className="text-muted-foreground">
									{t("shop.priceVp", { vp: skin.vp })}
								</span>
							)}
							<button
								aria-label={t("shop.watchlistRemove")}
								onClick={() => toggleWatchedSkin(skin.skinLevelId)}
								type="button"
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			) : (
				<p className="font-mono text-[10px] text-muted-foreground">
					{t("shop.watchlistEmpty")}
				</p>
			)}
		</section>
	);
}
