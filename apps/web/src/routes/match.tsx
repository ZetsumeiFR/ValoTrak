import { createFileRoute } from "@tanstack/react-router";

import { LobbyView } from "@/components/match/lobby-view";

export const Route = createFileRoute("/match")({
	component: LobbyView,
});
