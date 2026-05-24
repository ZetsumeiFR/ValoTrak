import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quitPregame } from "@valotrak/valorant";
import { toast } from "sonner";

import { tauriTransport } from "@/lib/valorant-bridge";
import type { LobbyData } from "./use-lobby";

/**
 * Dodge the current agent select (pregame) via the Riot pre-game-quit endpoint,
 * without restarting the game. Only valid in a live pregame.
 */
export function useDodge() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (lobby: LobbyData) => {
			if (lobby.isDemo) {
				throw new Error("Dodging isn't available in demo mode.");
			}
			if (lobby.phase !== "pregame") {
				throw new Error("You can only dodge during agent select.");
			}
			if (!lobby.tokens || !lobby.shard || !lobby.matchId) {
				throw new Error("Missing match context.");
			}
			await quitPregame(
				tauriTransport,
				lobby.tokens,
				lobby.shard,
				lobby.matchId,
			);
		},
		onSuccess: () => {
			toast.success("Dodged agent select");
			queryClient.invalidateQueries({ queryKey: ["valorant", "lobby"] });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Failed to dodge");
		},
	});
}
