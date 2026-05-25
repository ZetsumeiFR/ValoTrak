import { useMutation, useQueryClient } from "@tanstack/react-query";
import { quitPregame } from "@valotrak/valorant";
import { toast } from "sonner";

import i18n from "@/lib/i18n";
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
			if (lobby.phase !== "pregame") {
				throw new Error(i18n.t("dodge.phaseError"));
			}
			if (!lobby.tokens || !lobby.shard || !lobby.matchId) {
				throw new Error(i18n.t("dodge.contextError"));
			}
			await quitPregame(
				tauriTransport,
				lobby.tokens,
				lobby.shard,
				lobby.matchId,
			);
		},
		onSuccess: () => {
			toast.success(i18n.t("dodge.success"));
			queryClient.invalidateQueries({ queryKey: ["valorant", "lobby"] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : i18n.t("dodge.failure"),
			);
		},
	});
}
