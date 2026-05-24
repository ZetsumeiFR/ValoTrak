import { createFileRoute } from "@tanstack/react-router";

import { MatchRecap } from "@/components/match/match-recap";

export const Route = createFileRoute("/matches/$matchId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { matchId } = Route.useParams();
	return <MatchRecap matchId={matchId} />;
}
