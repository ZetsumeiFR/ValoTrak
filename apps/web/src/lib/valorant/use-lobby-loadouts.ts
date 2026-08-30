import { useQuery } from "@tanstack/react-query";
import {
	getCoreGameLoadouts,
	getPregameLoadouts,
	mapLobbyLoadouts,
} from "@valotrak/valorant";

import { enrichTransport, isDesktop } from "@/lib/valorant-bridge";
import type { LobbyData } from "./use-lobby";

const EMPTY: ReadonlyMap<string, string[]> = new Map();

/**
 * Cosmetics equipped by every player in the current lobby.
 *
 * One request for the whole lobby, not one per player, so it adds a single
 * call to the rate-limited budget.
 */
export function useLobbyLoadouts(
	lobby: LobbyData | undefined,
): ReadonlyMap<string, string[]> {
	const matchId = lobby?.matchId;
	const phase = lobby?.phase;
	const tokens = lobby?.tokens;

	const query = useQuery({
		queryKey: ["valorant", "loadouts", matchId ?? null, phase ?? null] as const,
		queryFn: async (): Promise<ReadonlyMap<string, string[]>> => {
			if (!tokens || !matchId || !phase || phase === "menus") {
				return EMPTY;
			}
			const shard = { region: tokens.region, shard: tokens.shard };
			const raw =
				phase === "coregame"
					? await getCoreGameLoadouts(enrichTransport, tokens, shard, matchId)
					: await getPregameLoadouts(enrichTransport, tokens, shard, matchId);
			return new Map(
				mapLobbyLoadouts(raw).map((loadout) => [
					loadout.puuid,
					loadout.itemIds,
				]),
			);
		},
		enabled: isDesktop() && Boolean(tokens && matchId && phase !== "menus"),
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60,
	});

	return query.data ?? EMPTY;
}
