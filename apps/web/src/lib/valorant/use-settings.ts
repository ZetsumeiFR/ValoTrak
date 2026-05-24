import type { MatchPhase } from "@valotrak/valorant";
import { useSyncExternalStore } from "react";

/**
 * How aggressively enemy data is revealed in the live lobby.
 *
 * Revealing client-obfuscated enemy data (especially in pregame) is against
 * Riot's policy and has led to temporary bans — hence the conservative default
 * and the explicit warning shown next to the toggle.
 */
export type EnemyRevealMode = "off" | "coregame" | "pregame";

const STORAGE_KEY = "valotrak.enemy-reveal-mode";
const DEFAULT_MODE: EnemyRevealMode = "coregame";

const listeners = new Set<() => void>();

function isMode(value: string | null): value is EnemyRevealMode {
	return value === "off" || value === "coregame" || value === "pregame";
}

function read(): EnemyRevealMode {
	if (typeof localStorage === "undefined") {
		return DEFAULT_MODE;
	}
	const stored = localStorage.getItem(STORAGE_KEY);
	return isMode(stored) ? stored : DEFAULT_MODE;
}

export function setEnemyRevealMode(mode: EnemyRevealMode): void {
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(STORAGE_KEY, mode);
	}
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(callback: () => void): () => void {
	listeners.add(callback);
	return () => {
		listeners.delete(callback);
	};
}

export function useEnemyRevealMode(): EnemyRevealMode {
	return useSyncExternalStore(subscribe, read, () => DEFAULT_MODE);
}

/** Whether enemy cards should be shown given the current phase and mode. */
export function shouldRevealEnemies(
	phase: MatchPhase,
	mode: EnemyRevealMode,
): boolean {
	if (mode === "off") {
		return false;
	}
	if (mode === "coregame") {
		return phase === "coregame";
	}
	return phase === "coregame" || phase === "pregame";
}
