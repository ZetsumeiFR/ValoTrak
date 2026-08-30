import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Button } from "@valotrak/ui/components/button";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { type ReactNode, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { RiotLoginCard } from "@/components/riot-login-card";
import { BundleCard } from "@/components/shop/shop-bundle-card";
import { DailyOfferCard } from "@/components/shop/shop-daily-offer-card";
import { NightMarketCard } from "@/components/shop/shop-night-market-card";
import { SectionHeading } from "@/components/shop/shop-section-heading";
import { ShopWatchlist } from "@/components/shop/shop-watchlist";
import {
	bundlesQueryOptions,
	contentTiersQueryOptions,
	indexBundles,
	indexContentTiers,
	indexSkins,
	skinsQueryOptions,
} from "@/lib/valorant/queries";
import { useWallet } from "@/lib/valorant/use-inventory";
import { useShopAlerts } from "@/lib/valorant/use-shop-alerts";
import { useStore } from "@/lib/valorant/use-store";
import { isAppError } from "@/lib/valorant-bridge";

export function ShopPage() {
	const { t } = useTranslation();
	const store = useStore();
	const skinsQuery = useQuery(skinsQueryOptions());
	const tiersQuery = useQuery(contentTiersQueryOptions());
	const bundlesQuery = useQuery(bundlesQueryOptions());
	const wallet = useWallet();

	const skinsById = useMemo(
		() => indexSkins(skinsQuery.data),
		[skinsQuery.data],
	);
	const tiersById = useMemo(
		() => indexContentTiers(tiersQuery.data),
		[tiersQuery.data],
	);
	const bundlesById = useMemo(
		() => indexBundles(bundlesQuery.data),
		[bundlesQuery.data],
	);

	const skinName = useCallback(
		(skinLevelId: string) =>
			skinsById.get(skinLevelId)?.displayName ?? skinLevelId,
		[skinsById],
	);
	useShopAlerts(store.data, skinName);

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<h1 className="font-bold text-lg tracking-tight">{t("shop.title")}</h1>
			</div>
			{wallet.data ? (
				<span className="ml-auto font-mono text-[11px] text-muted-foreground tabular-nums">
					{t("shop.balance", {
						vp: wallet.data.valorantPoints,
						rp: wallet.data.radianitePoints,
					})}
				</span>
			) : null}
			<Button
				variant="outline"
				size="sm"
				onClick={() => store.refetch()}
				disabled={store.isFetching}
			>
				<RefreshCw
					data-icon="inline-start"
					className={store.isFetching ? "animate-spin" : undefined}
				/>
				{t("common.refresh")}
			</Button>
		</div>
	);

	let body: ReactNode;

	if (store.isPending) {
		body = (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-4 w-32" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			</div>
		);
	} else if (store.isError) {
		const errorKind = isAppError(store.error) ? store.error.kind : null;
		if (errorKind === "needLogin") {
			body = <RiotLoginCard />;
		} else {
			const message = isAppError(store.error)
				? store.error.message
				: String(store.error);
			body = (
				<Alert variant="destructive">
					<TriangleAlert />
					<AlertTitle>{t("shop.loadError")}</AlertTitle>
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			);
		}
	} else {
		const data = store.data;
		body = (
			<div className="flex flex-col gap-8">
				<section className="flex flex-col gap-3">
					<SectionHeading remainingSeconds={data.dailyRemainingSeconds}>
						{t("shop.dailyTitle")}
					</SectionHeading>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{data.dailyOffers.map((offer) => (
							<DailyOfferCard
								key={offer.skinLevelId}
								offer={offer}
								skinsById={skinsById}
								tiersById={tiersById}
							/>
						))}
					</div>
				</section>

				{data.nightMarket ? (
					<section className="flex flex-col gap-3">
						<SectionHeading
							remainingSeconds={data.nightMarket.remainingSeconds}
						>
							{t("shop.nightMarketTitle")}
						</SectionHeading>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{data.nightMarket.offers.map((offer) => (
								<NightMarketCard
									key={offer.skinLevelId}
									offer={offer}
									skinsById={skinsById}
									tiersById={tiersById}
								/>
							))}
						</div>
					</section>
				) : null}

				{data.bundles.length > 0 ? (
					<section className="flex flex-col gap-3">
						<SectionHeading>{t("shop.bundlesTitle")}</SectionHeading>
						<div className="flex flex-col gap-3">
							{data.bundles.map((bundle) => {
								const info = bundlesById.get(bundle.dataAssetId);
								return (
									<BundleCard
										key={bundle.dataAssetId}
										bundle={bundle}
										name={info?.displayName ?? t("shop.bundlesTitle")}
										icon={info?.displayIcon ?? null}
									/>
								);
							})}
						</div>
					</section>
				) : null}

				{data.dailyOffers.length === 0 &&
				!data.nightMarket &&
				data.bundles.length === 0 ? (
					<p className="font-mono text-muted-foreground text-xs">
						{t("shop.empty")}
					</p>
				) : null}
			</div>
		);
	}

	return (
		<div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			{header}
			{body}
			<ShopWatchlist skinsById={skinsById} />
		</div>
	);
}
