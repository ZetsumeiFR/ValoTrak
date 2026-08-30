import type { MatchSummary } from "@valotrak/valorant";

export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export const MAX_CACHED_MATCHES = 20;
export const MAX_CACHED_PLAYERS = 8;

export interface CachedMatchHistory {
	savedAt: number;
	matches: MatchSummary[];
}

export interface CacheOptions {
	storage?: KeyValueStorage;
	now?: () => number;
}

const VERSION = 1;
const PREFIX = "valotrak.match-history.v1";
const INDEX_KEY = `${PREFIX}.index`;

interface StoredEntry {
	version: number;
	savedAt: number;
	matches: MatchSummary[];
}

function defaultStorage(): KeyValueStorage | undefined {
	return typeof localStorage === "undefined" ? undefined : localStorage;
}

function entryKey(puuid: string): string {
	return `${PREFIX}.${puuid}`;
}

/** Storage is user-writable and survives upgrades: never trust its contents. */
function parse<T>(raw: string | null): T | undefined {
	if (!raw) {
		return undefined;
	}
	try {
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
}

function readIndex(storage: KeyValueStorage): string[] {
	const parsed = parse<unknown>(storage.getItem(INDEX_KEY));
	if (!Array.isArray(parsed)) {
		return [];
	}
	return parsed.filter((value): value is string => typeof value === "string");
}

/**
 * Last known match history for a player, or `undefined` when nothing usable is
 * stored. Riot's match history needs a live session; this is what the profile
 * falls back to when that session is gone.
 */
export function readCachedMatches(
	puuid: string,
	options: CacheOptions = {},
): CachedMatchHistory | undefined {
	const storage = options.storage ?? defaultStorage();
	if (!storage) {
		return undefined;
	}
	const entry = parse<StoredEntry>(storage.getItem(entryKey(puuid)));
	if (!entry || entry.version !== VERSION || !Array.isArray(entry.matches)) {
		return undefined;
	}
	return { savedAt: entry.savedAt, matches: entry.matches };
}

/**
 * Persist a player's match history, newest first.
 *
 * Bounded on both axes — matches per player and number of players — because
 * localStorage is a few megabytes shared with the rest of the app.
 */
export function writeCachedMatches(
	puuid: string,
	matches: MatchSummary[],
	options: CacheOptions = {},
): void {
	const storage = options.storage ?? defaultStorage();
	if (!storage) {
		return;
	}
	if (matches.length === 0) {
		// A partial or failed enrichment must not wipe a good history.
		return;
	}
	const now = options.now ?? Date.now;
	const entry: StoredEntry = {
		version: VERSION,
		savedAt: now(),
		matches: matches.slice(0, MAX_CACHED_MATCHES),
	};
	try {
		storage.setItem(entryKey(puuid), JSON.stringify(entry));
		const index = readIndex(storage).filter((id) => id !== puuid);
		index.push(puuid);
		while (index.length > MAX_CACHED_PLAYERS) {
			const evicted = index.shift();
			if (evicted) {
				storage.removeItem(entryKey(evicted));
			}
		}
		storage.setItem(INDEX_KEY, JSON.stringify(index));
	} catch (error) {
		// Full or disabled storage must not break the profile screen; the next
		// load simply has no fallback.
		console.warn("[match-history] local cache write failed", error);
	}
}

/**
 * History of the last player written to the cache.
 *
 * The fallback matters most when the Riot session is gone, and in that state
 * the app has no puuid to look up — so the cache has to be reachable without
 * one.
 */
export function readLatestCachedMatches(
	options: CacheOptions = {},
): CachedMatchHistory | undefined {
	const storage = options.storage ?? defaultStorage();
	if (!storage) {
		return undefined;
	}
	const index = readIndex(storage);
	const latest = index[index.length - 1];
	return latest ? readCachedMatches(latest, options) : undefined;
}
