import { Badge } from "@valorant-tracker/ui/components/badge";
import type { EnrichedPlayer } from "@valorant-tracker/valorant";
import type { ReactNode } from "react";

import { PlayerCard } from "./player-card";

export function TeamColumn({
	title,
	icon,
	tone,
	players,
}: {
	title: string;
	icon: ReactNode;
	tone: "ally" | "enemy";
	players: EnrichedPlayer[];
}) {
	return (
		<section className="flex flex-col gap-2">
			<header className="flex items-center gap-2">
				{icon}
				<h2 className="font-medium text-sm">{title}</h2>
				<Badge variant={tone === "ally" ? "secondary" : "destructive"}>
					{players.length}
				</Badge>
			</header>
			<div className="flex flex-col gap-2">
				{players.map((player) => (
					<PlayerCard key={player.puuid} player={player} />
				))}
			</div>
		</section>
	);
}
