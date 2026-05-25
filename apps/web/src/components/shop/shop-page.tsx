import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Badge } from "@valotrak/ui/components/badge";
import { Button } from "@valotrak/ui/components/button";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import type {
	BundleSummary,
	ContentTier,
	NightMarketOffer,
	SkinLevel,
	StoreOffer,
} from "@valotrak/valorant";
import { Clock, FlaskConical, RefreshCw, TriangleAlert } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { RiotLoginCard } from "@/components/riot-login-card";
import {
	bundlesQueryOptions,
	contentTiersQueryOptions,
	indexBundles,
	indexContentTiers,
	indexSkins,
	skinsQueryOptions,
} from "@/lib/valorant/queries";
import { useStore } from "@/lib/valorant/use-store";
import { isAppError } from "@/lib/valorant-bridge";

function SectionHeading({
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

function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const days = Math.floor(s / 86400);
	const hours = Math.floor((s % 86400) / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

function Countdown({ seconds }: { seconds: number }) {
	const [remaining, setRemaining] = useState(seconds);
	useEffect(() => {
		setRemaining(seconds);
		const id = setInterval(() => {
			setRemaining((r) => Math.max(0, r - 1));
		}, 1000);
		return () => clearInterval(id);
	}, [seconds]);
	return <>{formatDuration(remaining)}</>;
}

function OfferCard({
	name,
	icon,
	tierColor,
	children,
}: {
	name: string;
	icon: string | null;
	tierColor?: string;
	children: ReactNode;
}) {
	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40">
			<div
				className="absolute inset-x-0 top-0 h-0.5"
				style={tierColor ? { backgroundColor: tierColor } : undefined}
			/>
			<div className="flex aspect-[16/7] items-center justify-center p-4">
				{icon ? (
					<img
						src={icon}
						alt=""
						className="h-full w-full object-contain transition-transform group-hover:scale-105"
					/>
				) : null}
			</div>
			<div className="flex items-center justify-between gap-2 border-border/60 border-t px-3 py-2">
				<span className="truncate font-medium text-sm">{name}</span>
				{children}
			</div>
		</div>
	);
}

function DailyOfferCard({
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

function NightMarketCard({
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

function BundleCard({
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

export function ShopPage() {
	const { t } = useTranslation();
	const store = useStore();
	const skinsQuery = useQuery(skinsQueryOptions());
	const tiersQuery = useQuery(contentTiersQueryOptions());
	const bundlesQuery = useQuery(bundlesQueryOptions());

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

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<h1 className="font-bold text-lg tracking-tight">{t("shop.title")}</h1>
				{store.data?.isDemo ? (
					<Badge variant="secondary">{t("common.demo")}</Badge>
				) : null}
			</div>
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
				{data.isDemo ? (
					<Alert>
						<FlaskConical />
						<AlertTitle>{t("shop.demoTitle")}</AlertTitle>
						<AlertDescription>{t("shop.demoDesc")}</AlertDescription>
					</Alert>
				) : null}

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
		</div>
	);
}
