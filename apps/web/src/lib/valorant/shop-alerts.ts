import type { SkinLevel, Storefront } from "@valotrak/valorant";

/**
 * Identity of the current shop rotation, derived from when it ends rather than
 * from the current day: a rotation that ends after midnight is still the same
 * rotation, and must not alert twice.
 */
export function shopRotationId(remainingSeconds: number, now: number): string {
	return new Date(now + remainingSeconds * 1000).toISOString().slice(0, 10);
}

/**
 * Watched skins on sale right now that have not been announced yet for this
 * rotation. Daily offers and night market are both eligible; a skin present in
 * both is reported once.
 */
export function pendingShopAlerts(
	store: Storefront,
	watched: ReadonlySet<string>,
	alreadyAlerted: ReadonlySet<string>,
): string[] {
	if (watched.size === 0) {
		return [];
	}
	const onSale = [
		...store.dailyOffers.map((offer) => offer.skinLevelId),
		...(store.nightMarket?.offers.map((offer) => offer.skinLevelId) ?? []),
	];
	const seen = new Set<string>();
	const pending: string[] = [];
	for (const skinLevelId of onSale) {
		if (
			!watched.has(skinLevelId) ||
			alreadyAlerted.has(skinLevelId) ||
			seen.has(skinLevelId)
		) {
			continue;
		}
		seen.add(skinLevelId);
		pending.push(skinLevelId);
	}
	return pending;
}

/**
 * Skins offerable to the watchlist for a search query.
 *
 * The static API lists every upgrade level of every skin; the shop only ever
 * offers the first level, so anything else would be unwatchable noise.
 */
const MIN_QUERY_LENGTH = 2;
const DEFAULT_SEARCH_LIMIT = 8;

export interface SkinSearchOptions {
	limit?: number;
	/**
	 * Ids the player already owns. Matched against both the level id and the
	 * skin id, because entitlements are expressed in terms of one or the other
	 * depending on the category.
	 */
	owned?: ReadonlySet<string>;
}

export function searchWatchableSkins(
	levels: SkinLevel[],
	query: string,
	options: SkinSearchOptions = {},
): SkinLevel[] {
	const needle = query.trim().toLowerCase();
	if (needle.length < MIN_QUERY_LENGTH) {
		return [];
	}
	const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
	const owned = options.owned;
	const firstLevelBySkin = new Map<string, SkinLevel>();
	for (const level of levels) {
		if (!firstLevelBySkin.has(level.skinId)) {
			firstLevelBySkin.set(level.skinId, level);
		}
	}
	const found: SkinLevel[] = [];
	for (const skin of firstLevelBySkin.values()) {
		if (!skin.displayName.toLowerCase().includes(needle)) {
			continue;
		}
		// Watching a skin you own would only ever produce noise.
		if (owned?.has(skin.levelId) || owned?.has(skin.skinId)) {
			continue;
		}
		found.push(skin);
		if (found.length >= limit) {
			break;
		}
	}
	return found;
}
