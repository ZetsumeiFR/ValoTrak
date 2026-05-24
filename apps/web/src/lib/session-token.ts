/**
 * Bearer session token storage for the desktop client.
 *
 * The Tauri webview can't rely on cross-site secure cookies, so better-auth's
 * bearer plugin returns the session token in a `set-auth-token` header which we
 * persist here and replay as `Authorization: Bearer <token>`.
 */
const STORAGE_KEY = "valotrak.session-token";

export function getSessionToken(): string | null {
	if (typeof localStorage === "undefined") {
		return null;
	}
	return localStorage.getItem(STORAGE_KEY);
}

export function setSessionToken(token: string): void {
	if (typeof localStorage === "undefined") {
		return;
	}
	localStorage.setItem(STORAGE_KEY, token);
}

export function clearSessionToken(): void {
	if (typeof localStorage === "undefined") {
		return;
	}
	localStorage.removeItem(STORAGE_KEY);
}
