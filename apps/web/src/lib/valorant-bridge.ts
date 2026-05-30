import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
	type CurrentMatch,
	headersToRecord,
	type RiotAuth,
	type RiotRequest,
	type RiotResponse,
	type RiotShard,
	type RiotTransport,
	rateLimited,
} from "@valotrak/valorant";

/**
 * Frontend boundary to the Tauri (Rust) Valorant integration.
 *
 * - Local self-signed-cert calls go through Rust commands (`invoke`).
 * - Authenticated pvp.net enrichment uses {@link tauriTransport}, a
 *   `RiotTransport` backed by `@tauri-apps/plugin-http` (routes through Rust,
 *   bypassing CORS).
 * - Lobby changes are pushed from the local websocket via a Tauri event.
 */

/** Auth context returned by `get_local_tokens` (mirrors the Rust struct). */
export interface LocalTokens extends RiotAuth {
	puuid: string;
	region: string;
	shard: string;
}

export interface LockfileInfo {
	name: string;
	pid: number;
	port: number;
	protocol: string;
}

/** Discriminated error payload thrown by the Rust commands. */
export interface AppErrorPayload {
	kind:
		| "notAvailable"
		| "needRegion"
		| "notInMatch"
		| "unauthorized"
		| "http"
		| "parse"
		// Frontend-synthesized: no Riot session and the local client isn't
		// running, so the user must sign in (see `use-riot-session`).
		| "needLogin";
	message: string;
}

export function isAppError(value: unknown): value is AppErrorPayload {
	return (
		typeof value === "object" &&
		value !== null &&
		"kind" in value &&
		"message" in value
	);
}

/** Whether we are running inside the Tauri desktop shell (vs. a plain browser). */
export function isDesktop(): boolean {
	return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function readLockfile(): Promise<LockfileInfo> {
	return invoke<LockfileInfo>("read_lockfile");
}

export function getLocalTokens(): Promise<LocalTokens> {
	return invoke<LocalTokens>("get_local_tokens");
}

/**
 * Interactive remote login via Riot's hosted page (opens a WebView window).
 * Resolves with a full token set even when no game/launcher is running.
 */
export function riotLogin(): Promise<LocalTokens> {
	return invoke<LocalTokens>("riot_login");
}

/** Silent re-auth from the persisted Riot session cookie (no UI). */
export function riotSilentReauth(): Promise<LocalTokens> {
	return invoke<LocalTokens>("riot_silent_reauth");
}

/** Forget the persisted Riot session (logout). */
export function riotLogout(): Promise<void> {
	return invoke<void>("riot_logout");
}

export function getCurrentMatch(tokens: LocalTokens): Promise<CurrentMatch> {
	return invoke<CurrentMatch>("get_current_match", { tokens });
}

export function detectRegion(): Promise<RiotShard> {
	return invoke<RiotShard>("detect_region");
}

/** `RiotTransport` backed by the Rust-proxied HTTP plugin (CORS-free). */
export const tauriTransport: RiotTransport = async (
	req: RiotRequest,
): Promise<RiotResponse> => {
	const res = await tauriFetch(req.url, {
		method: req.method,
		headers: req.headers,
		body: req.body,
	});
	const body = await res.text();
	return {
		status: res.status,
		ok: res.ok,
		body,
		headers: headersToRecord(res.headers),
	};
};

/**
 * Rate-limited transport for the fan-out enrichment calls (lobby + profile).
 * Caps concurrency and retries 429 / 5xx with backoff so a busy lobby doesn't
 * trip Riot's rate limit. Single-shot actions (e.g. dodge) use {@link tauriTransport}.
 */
export const enrichTransport: RiotTransport = rateLimited(tauriTransport, {
	concurrency: 2,
	minIntervalMs: 350,
	maxRetries: 5,
	baseDelayMs: 1000,
	maxDelayMs: 30_000,
});

/** Subscribe to local lobby/presence changes. Returns an unlisten function. */
export function onLobbyChanged(callback: () => void): Promise<UnlistenFn> {
	return listen("valorant://lobby-changed", () => callback());
}
