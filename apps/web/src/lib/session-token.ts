/**
 * Bearer session token storage for the desktop client.
 *
 * The Tauri webview can't rely on cross-site secure cookies, so better-auth's
 * bearer plugin returns the session token in a `set-auth-token` header. Keep it
 * in session storage only: this avoids leaving a long-lived bearer token at rest
 * while still replaying it as `Authorization: Bearer <token>` during the window
 * session.
 */
const STORAGE_KEY = "valotrak.session-token";
const LEGACY_LOCAL_STORAGE_KEY = STORAGE_KEY;

export function getSessionToken(): string | null {
	if (typeof sessionStorage === "undefined") {
		return null;
	}
	const token = sessionStorage.getItem(STORAGE_KEY);
	if (token || typeof localStorage === "undefined") {
		return token;
	}
	const legacy = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
	if (legacy) {
		sessionStorage.setItem(STORAGE_KEY, legacy);
		localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
	}
	return legacy;
}

export function setSessionToken(token: string): void {
	if (typeof sessionStorage === "undefined") {
		return;
	}
	sessionStorage.setItem(STORAGE_KEY, token);
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
	}
}

export function clearSessionToken(): void {
	if (typeof sessionStorage !== "undefined") {
		sessionStorage.removeItem(STORAGE_KEY);
	}
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
	}
}
