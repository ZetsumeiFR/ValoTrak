import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type EnrichedPlayer,
	enrichLobby,
	type MatchPhase,
	type RiotShard,
} from "@valotrak/valorant";
import { useEffect } from "react";

import {
	enrichTransport,
	getCurrentMatch,
	getLocalTokens,
	isAppError,
	isDesktop,
	type LocalTokens,
	onLobbyChanged,
} from "@/lib/valorant-bridge";

export interface LobbyData {
	phase: MatchPhase;
	players: EnrichedPlayer[];
	matchId?: string;
	shard?: RiotShard;
	/** Auth context for live actions (e.g. dodge). Absent outside a live match. */
	tokens?: LocalTokens;
}

const LOBBY_KEY = ["valorant", "lobby"] as const;

/** Empty "not in a match" result (browser, non-Windows, or game not running). */
const NOT_IN_MATCH: LobbyData = { phase: "menus", players: [] };

async function loadLobby(): Promise<LobbyData> {
	// Outside the desktop shell (browser dev) there is no local API.
	if (!isDesktop()) {
		return NOT_IN_MATCH;
	}

	let tokens: LocalTokens;
	try {
		tokens = await getLocalTokens();
	} catch (error) {
		// Not on Windows / game not running → simply "not in a match".
		if (isAppError(error) && error.kind === "notAvailable") {
			return NOT_IN_MATCH;
		}
		throw error;
	}

	const match = await getCurrentMatch(tokens);
	if (match.phase === "menus") {
		return { phase: "menus", players: [], shard: match.shard };
	}

	const players = await enrichLobby(enrichTransport, tokens, match);
	return {
		phase: match.phase,
		players,
		matchId: match.matchId,
		shard: match.shard,
		tokens,
	};
}

export function useLobby() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: LOBBY_KEY,
		queryFn: loadLobby,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 20,
	});

	// Refetch when the local client signals a pregame/coregame change (debounced).
	useEffect(() => {
		if (!isDesktop()) {
			return;
		}
		let unlisten: (() => void) | undefined;
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		onLobbyChanged(() => {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				queryClient.invalidateQueries({ queryKey: LOBBY_KEY });
			}, 1500);
		}).then((fn) => {
			if (cancelled) {
				fn();
				return;
			}
			unlisten = fn;
		});
		return () => {
			cancelled = true;
			if (timer) {
				clearTimeout(timer);
			}
			unlisten?.();
		};
	}, [queryClient]);

	return query;
}
