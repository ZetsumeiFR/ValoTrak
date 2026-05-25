import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	getLocalTokens,
	isAppError,
	isDesktop,
	type LocalTokens,
	riotLogin,
	riotLogout,
	riotSilentReauth,
} from "@/lib/valorant-bridge";

/**
 * Riot session: the access/entitlement tokens used by every authenticated
 * pvp.net call (profile, storefront, …).
 *
 * Distinct from the app's own account (`authClient.useSession`, better-auth),
 * which only powers the social "tracked players" feature.
 *
 * Resolution order on desktop:
 *  1. the local Riot Client (game or just the launcher running) — instant, no UI;
 *  2. a persisted remote session (silent cookie re-auth) — works with nothing
 *     running, as long as the user has logged in before;
 *  3. otherwise `null` → the UI offers an interactive {@link riotLogin}.
 */

export const SESSION_QUERY_KEY = ["valorant", "session"] as const;

/** Riot access tokens expire after ~1h; re-resolve a little before that. */
const SESSION_STALE_TIME = 1000 * 60 * 50;

async function trySilentReauth(): Promise<LocalTokens | null> {
	try {
		return await riotSilentReauth();
	} catch (error) {
		// No resumable session (or it expired) — fall back to interactive login.
		if (
			isAppError(error) &&
			(error.kind === "notAvailable" || error.kind === "unauthorized")
		) {
			return null;
		}
		throw error;
	}
}

async function resolveSession(): Promise<LocalTokens | null> {
	if (!isDesktop()) {
		return null;
	}

	// 1. Local client. Region/shard can be empty when the game has never run
	//    this session (no log to parse); in that case prefer a remote session,
	//    which always carries a region, but keep the local tokens as a fallback.
	try {
		const local = await getLocalTokens();
		if (local.region && local.shard) {
			return local;
		}
		return (await trySilentReauth()) ?? local;
	} catch (error) {
		if (!(isAppError(error) && error.kind === "notAvailable")) {
			throw error;
		}
	}

	// 2. Persisted remote session.
	return trySilentReauth();
}

export function useRiotSession() {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: SESSION_QUERY_KEY,
		queryFn: resolveSession,
		staleTime: SESSION_STALE_TIME,
		retry: false,
		refetchOnWindowFocus: false,
	});

	const login = useMutation({
		mutationFn: riotLogin,
		onSuccess: (tokens) => {
			queryClient.setQueryData<LocalTokens | null>(SESSION_QUERY_KEY, tokens);
			// Re-run dependent loaders (profile, storefront) with the new session.
			queryClient.invalidateQueries({ queryKey: ["valorant", "profile"] });
			queryClient.invalidateQueries({ queryKey: ["valorant", "store"] });
		},
	});

	const logout = useMutation({
		mutationFn: riotLogout,
		onSuccess: () => {
			queryClient.setQueryData<LocalTokens | null>(SESSION_QUERY_KEY, null);
			queryClient.invalidateQueries({ queryKey: ["valorant", "profile"] });
			queryClient.invalidateQueries({ queryKey: ["valorant", "store"] });
		},
	});

	return {
		/** Resolved tokens, or `null` when unauthenticated / in browser demo. */
		tokens: query.data ?? null,
		/** Still resolving the session for the first time. */
		isResolving: query.isPending,
		isAuthenticated: Boolean(query.data),
		login: login.mutateAsync,
		isLoggingIn: login.isPending,
		loginError: login.error,
		logout: logout.mutateAsync,
		isLoggingOut: logout.isPending,
	};
}
