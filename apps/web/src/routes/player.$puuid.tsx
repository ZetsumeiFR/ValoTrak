import { createFileRoute } from "@tanstack/react-router";

import { PlayerDetail } from "@/components/trends/player-detail";

interface PlayerSearch {
	name?: string;
	tag?: string;
	region?: string;
}

export const Route = createFileRoute("/player/$puuid")({
	validateSearch: (search: Record<string, unknown>): PlayerSearch => ({
		name: typeof search.name === "string" ? search.name : undefined,
		tag: typeof search.tag === "string" ? search.tag : undefined,
		region: typeof search.region === "string" ? search.region : undefined,
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { puuid } = Route.useParams();
	const { name, tag, region } = Route.useSearch();
	return <PlayerDetail puuid={puuid} name={name} tag={tag} region={region} />;
}
