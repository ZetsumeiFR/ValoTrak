import { VP_CURRENCY_ID } from "./constants";

/* -------------------------------------------------------------------------- */
/*                  Raw Riot pvp.net shapes (partial, what we use)            */
/* -------------------------------------------------------------------------- */

export interface RawSingleItemStoreOffer {
	OfferID: string;
	Cost: Record<string, number>;
}

export interface RawSkinsPanelLayout {
	SingleItemOffers: string[];
	SingleItemStoreOffers: RawSingleItemStoreOffer[];
	SingleItemOffersRemainingDurationInSeconds: number;
}

export interface RawBundleItem {
	Item: { ItemTypeID: string; ItemID: string; Amount: number };
	BasePrice: number;
	DiscountedPrice: number;
	DiscountPercent: number;
}

export interface RawBundle {
	ID: string;
	DataAssetID: string;
	CurrencyID: string;
	Items: RawBundleItem[];
	TotalBaseCost?: Record<string, number>;
	TotalDiscountedCost?: Record<string, number>;
	DurationRemainingInSeconds: number;
}

export interface RawFeaturedBundle {
	Bundle?: RawBundle;
	Bundles?: RawBundle[];
	BundleRemainingDurationInSeconds?: number;
}

export interface RawBonusStoreOffer {
	BonusOfferID: string;
	Offer: RawSingleItemStoreOffer;
	DiscountPercent: number;
	DiscountCosts: Record<string, number>;
	IsSeen: boolean;
}

export interface RawBonusStore {
	BonusStoreOffers: RawBonusStoreOffer[];
	BonusStoreRemainingDurationInSeconds: number;
}

export interface RawStorefront {
	SkinsPanelLayout: RawSkinsPanelLayout;
	FeaturedBundle?: RawFeaturedBundle;
	BonusStore?: RawBonusStore;
}

/* -------------------------------------------------------------------------- */
/*                              Domain (normalized)                            */
/* -------------------------------------------------------------------------- */

export interface StoreOffer {
	skinLevelId: string;
	vpCost: number;
}

export interface NightMarketOffer {
	skinLevelId: string;
	vpCost: number;
	discountedVpCost: number;
	discountPercent: number;
}

export interface BundleSummary {
	dataAssetId: string;
	totalVp: number;
	baseVp: number;
	remainingSeconds: number;
	itemCount: number;
}

export interface Storefront {
	dailyOffers: StoreOffer[];
	dailyRemainingSeconds: number;
	nightMarket: { offers: NightMarketOffer[]; remainingSeconds: number } | null;
	bundles: BundleSummary[];
}

/**
 * Map a raw v3 storefront into normalized shop data. Pure and total: missing
 * optional sections collapse to empty arrays / null, and VP costs default to 0.
 */
export function mapStorefront(raw: RawStorefront): Storefront {
	const layout = raw.SkinsPanelLayout;

	const costById = new Map<string, number>();
	for (const offer of layout.SingleItemStoreOffers ?? []) {
		costById.set(offer.OfferID, offer.Cost?.[VP_CURRENCY_ID] ?? 0);
	}

	const dailyOffers: StoreOffer[] = (layout.SingleItemOffers ?? []).map(
		(skinLevelId) => ({
			skinLevelId,
			vpCost: costById.get(skinLevelId) ?? 0,
		}),
	);

	const bonus = raw.BonusStore;
	const nightMarket = bonus
		? {
				offers: (bonus.BonusStoreOffers ?? []).map((o) => ({
					skinLevelId: o.Offer.OfferID,
					vpCost: o.Offer.Cost?.[VP_CURRENCY_ID] ?? 0,
					discountedVpCost: o.DiscountCosts?.[VP_CURRENCY_ID] ?? 0,
					discountPercent: o.DiscountPercent,
				})),
				remainingSeconds: bonus.BonusStoreRemainingDurationInSeconds,
			}
		: null;

	const featured = raw.FeaturedBundle;
	const bundlesList = featured?.Bundles;
	const rawBundles =
		bundlesList && bundlesList.length > 0
			? bundlesList
			: featured?.Bundle
				? [featured.Bundle]
				: [];
	const topLevelRemaining = featured?.BundleRemainingDurationInSeconds;
	const bundles: BundleSummary[] = rawBundles.map((b) => ({
		dataAssetId: b.DataAssetID,
		totalVp: b.TotalDiscountedCost?.[VP_CURRENCY_ID] ?? 0,
		baseVp: b.TotalBaseCost?.[VP_CURRENCY_ID] ?? 0,
		remainingSeconds: topLevelRemaining ?? b.DurationRemainingInSeconds,
		itemCount: b.Items?.length ?? 0,
	}));

	return {
		dailyOffers,
		dailyRemainingSeconds: layout.SingleItemOffersRemainingDurationInSeconds,
		nightMarket,
		bundles,
	};
}
