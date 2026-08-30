import {
	KINGDOM_CURRENCY_ID,
	RADIANITE_CURRENCY_ID,
	VP_CURRENCY_ID,
} from "./constants";
import { pdBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

/** Entitlement categories, from the Riot docs table. */
export const ITEM_TYPE = {
	agents: "01bb38e1-da47-4e6a-9b3d-945fe4655707",
	contracts: "f85cb6f7-33e5-4dc8-b609-ec7212301948",
	sprays: "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475",
	buddies: "dd3bf334-87f3-40bd-b043-682a57a8dc3a",
	cards: "3f296c07-64c3-494c-923b-fe692a4fa1bd",
	skins: "e7c63390-eda7-46e0-bb7a-a6abdacd2433",
	skinVariants: "3ad1b2b2-acdb-4524-852f-954a76ddae0a",
	titles: "de7caa6b-adf7-4588-bbd1-143831e786c6",
} as const;

export interface RawWallet {
	Balances?: Record<string, number>;
}

export interface Wallet {
	valorantPoints: number;
	radianitePoints: number;
	kingdomCredits: number;
}

export interface RawEntitlement {
	TypeID?: string;
	ItemID?: string;
	InstanceID?: string;
}

export interface RawEntitlementsByType {
	ItemTypeID?: string;
	Entitlements?: RawEntitlement[];
}

export interface RawEntitlements {
	ItemTypeID?: string;
	Entitlements?: RawEntitlement[];
	EntitlementsByTypes?: RawEntitlementsByType[];
}

export interface RawPriceOffer {
	OfferID?: string;
	Cost?: Record<string, number>;
	Rewards?: { ItemTypeID?: string; ItemID?: string; Quantity?: number }[];
}

export interface RawPrices {
	Offers?: RawPriceOffer[];
}

/** Current balance of the three spendable currencies. */
export async function getWallet(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
): Promise<RawWallet> {
	return riotJson<RawWallet>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/store/v1/wallet/${puuid}`,
		headers: buildAuthHeaders(auth),
	});
}

export function mapWallet(raw: RawWallet): Wallet {
	const balances = raw.Balances ?? {};
	return {
		valorantPoints: balances[VP_CURRENCY_ID] ?? 0,
		radianitePoints: balances[RADIANITE_CURRENCY_ID] ?? 0,
		kingdomCredits: balances[KINGDOM_CURRENCY_ID] ?? 0,
	};
}

/** Item ids the player owns in a category (skins, sprays, agents...). */
export async function getOwnedItems(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
	itemTypeId: string,
): Promise<string[]> {
	const raw = await riotJson<RawEntitlements>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/store/v1/entitlements/${puuid}/${itemTypeId}`,
		headers: buildAuthHeaders(auth),
	});
	return mapOwnedItemIds(raw);
}

/**
 * Riot answers a single-category request with a flat payload and an
 * all-categories request with a grouped one; both shapes are accepted.
 */
export function mapOwnedItemIds(raw: RawEntitlements): string[] {
	const groups = raw.EntitlementsByTypes ?? [
		{ ItemTypeID: raw.ItemTypeID, Entitlements: raw.Entitlements },
	];
	const ids: string[] = [];
	for (const group of groups) {
		for (const entitlement of group.Entitlements ?? []) {
			if (entitlement.ItemID) {
				ids.push(entitlement.ItemID);
			}
		}
	}
	return ids;
}

/** Catalogue-wide prices, independent of what is in the shop today. */
export async function getPrices(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
): Promise<RawPrices> {
	return riotJson<RawPrices>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/store/v1/offers/`,
		headers: buildAuthHeaders(auth),
	});
}

/**
 * Valorant Point prices, reachable by offer id and by granted item id: the
 * shop refers to offers, the watchlist to the items they grant.
 */
export function mapVpPrices(raw: RawPrices): Map<string, number> {
	const prices = new Map<string, number>();
	for (const offer of raw.Offers ?? []) {
		const cost = offer.Cost?.[VP_CURRENCY_ID];
		if (cost === undefined) {
			continue;
		}
		if (offer.OfferID) {
			prices.set(offer.OfferID, cost);
		}
		for (const reward of offer.Rewards ?? []) {
			if (reward.ItemID) {
				prices.set(reward.ItemID, cost);
			}
		}
	}
	return prices;
}
