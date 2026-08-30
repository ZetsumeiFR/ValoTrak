import { useSyncExternalStore } from "react";

/**
 * Skins the user wants to be told about when they hit the shop, stored as
 * `skinLevelId`s — the same identifier the storefront offers use.
 */
const STORAGE_KEY = "valotrak.watched-skins";
const EMPTY: ReadonlySet<string> = new Set();

const listeners = new Set<() => void>();

// useSyncExternalStore compares snapshots by identity, so the parsed set has to
// be cached and only rebuilt when the stored string actually changes.
let cachedRaw: string | null = null;
let cachedSet: ReadonlySet<string> = EMPTY;

function parse(raw: string | null): ReadonlySet<string> {
	if (!raw) {
		return EMPTY;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return EMPTY;
		}
		return new Set(parsed.filter((v): v is string => typeof v === "string"));
	} catch {
		return EMPTY;
	}
}

function read(): ReadonlySet<string> {
	if (typeof localStorage === "undefined") {
		return EMPTY;
	}
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw !== cachedRaw) {
		cachedRaw = raw;
		cachedSet = parse(raw);
	}
	return cachedSet;
}

function subscribe(callback: () => void): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}

export function useWatchedSkins(): ReadonlySet<string> {
	return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleWatchedSkin(skinLevelId: string): void {
	const next = new Set(read());
	if (next.has(skinLevelId)) {
		next.delete(skinLevelId);
	} else {
		next.add(skinLevelId);
	}
	const raw = JSON.stringify([...next]);
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(STORAGE_KEY, raw);
	}
	cachedRaw = raw;
	cachedSet = next;
	for (const listener of listeners) {
		listener();
	}
}
