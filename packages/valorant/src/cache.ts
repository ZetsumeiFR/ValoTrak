import type { RiotShard } from "./endpoints";
import { getMatchDetails } from "./riot";
import type { RiotAuth, RiotTransport } from "./transport";
import type { RawMatchDetails } from "./types";

/**
 * Match details are immutable once a match ends, yet the lobby re-enriches every
 * player on each refresh (lobby-change events + a 20s stale time). Caching by
 * match id — and deduping in-flight requests — collapses those repeated fetches,
 * which are the bulk of the requests that trip the API's rate limit (429).
 */
const MAX_ENTRIES = 500;
const cache = new Map<string, Promise<RawMatchDetails>>();

/** {@link getMatchDetails} with an immutable-by-id cache and in-flight dedupe. */
export function getMatchDetailsCached(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	matchId: string,
): Promise<RawMatchDetails> {
	const key = `${shard.region}:${shard.shard}:${matchId}`;
	const cached = cache.get(key);
	if (cached) {
		return cached;
	}

	const pending = getMatchDetails(transport, auth, shard, matchId).catch(
		(error) => {
			// Drop failures so a later refresh can retry instead of caching the error.
			cache.delete(key);
			throw error;
		},
	);
	cache.set(key, pending);

	if (cache.size > MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) {
			cache.delete(oldest);
		}
	}

	return pending;
}

/** Clear the match-details cache (e.g. on sign-out or for tests). */
export function clearMatchDetailsCache(): void {
	cache.clear();
}
