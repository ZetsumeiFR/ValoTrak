import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	demoCurrentMatch,
	demoLobby,
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
	isDemo: boolean;
	matchId?: string;
	shard?: RiotShard;
	/** Auth context for live actions (e.g. dodge). Absent in demo. */
	tokens?: LocalTokens;
}

const LOBBY_KEY = ["valorant", "lobby"] as const;

function demoResult(): LobbyData {
	const match = demoCurrentMatch();
	return {
		phase: match.phase,
		players: demoLobby(),
		isDemo: true,
		matchId: match.matchId,
		shard: match.shard,
	};
}

async function loadLobby(): Promise<LobbyData> {
	// Outside the desktop shell (browser dev) there is no local API → demo.
	if (!isDesktop()) {
		return demoResult();
	}

	let tokens: LocalTokens;
	try {
		tokens = await getLocalTokens();
	} catch (error) {
		// Not on Windows / game not running → show the demo lobby instead of failing.
		if (isAppError(error) && error.kind === "notAvailable") {
			return demoResult();
		}
		throw error;
	}

	const match = await getCurrentMatch(tokens);
	if (match.phase === "menus") {
		return { phase: "menus", players: [], isDemo: false, shard: match.shard };
	}

	const players = await enrichLobby(enrichTransport, tokens, match);
	return {
		phase: match.phase,
		players,
		isDemo: false,
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
		let timer: ReturnType<typeof setTimeout> | undefined;
		onLobbyChanged(() => {
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				queryClient.invalidateQueries({ queryKey: LOBBY_KEY });
			}, 1500);
		}).then((fn) => {
			unlisten = fn;
		});
		return () => {
			if (timer) {
				clearTimeout(timer);
			}
			unlisten?.();
		};
	}, [queryClient]);

	return query;
}
