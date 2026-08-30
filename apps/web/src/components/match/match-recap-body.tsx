import { Badge } from "@valotrak/ui/components/badge";
import { useTranslation } from "react-i18next";

import { TeamTable } from "@/components/match/match-team-table";
import type { indexAgents, indexTiers } from "@/lib/valorant/queries";
import type { MatchDetailData } from "@/lib/valorant/use-match-detail";

export function RecapBody({
	data,
	agentsById,
	tiersById,
	mapName,
}: {
	data: MatchDetailData;
	agentsById: ReturnType<typeof indexAgents>;
	tiersById: ReturnType<typeof indexTiers>;
	mapName: string | undefined;
}) {
	const { t, i18n } = useTranslation();
	const { scoreboard, names, selfPuuid } = data;

	const selfTeamId = scoreboard.players.find(
		(player) => player.puuid === selfPuuid,
	)?.teamId;

	// Self's team first.
	const teams = [...scoreboard.teams].sort((a, b) => {
		if (a.teamId === selfTeamId) return -1;
		if (b.teamId === selfTeamId) return 1;
		return 0;
	});

	const selfTeam = scoreboard.teams.find((team) => team.teamId === selfTeamId);
	const otherTeam = scoreboard.teams.find((team) => team.teamId !== selfTeamId);
	const startedAt = scoreboard.startedAt
		? new Date(scoreboard.startedAt).toLocaleDateString(i18n.language, {
				dateStyle: "medium",
			})
		: undefined;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				{mapName ? (
					<span className="font-bold text-xl tracking-tight">{mapName}</span>
				) : null}
				{selfTeam ? (
					<Badge variant={selfTeam.won ? "secondary" : "destructive"}>
						{selfTeam.won ? t("common.win") : t("common.loss")}
					</Badge>
				) : null}
				{selfTeam && otherTeam ? (
					<span className="font-mono font-semibold text-lg tabular-nums">
						<span className={selfTeam.won ? "text-win" : "text-loss"}>
							{selfTeam.roundsWon}
						</span>
						<span className="text-muted-foreground"> - </span>
						<span>{otherTeam.roundsWon}</span>
					</span>
				) : null}
				{startedAt ? (
					<span className="ml-auto font-mono text-muted-foreground text-xs">
						{startedAt}
					</span>
				) : null}
			</div>

			{teams.map((team) => (
				<TeamTable
					key={team.teamId}
					team={team}
					players={scoreboard.players.filter(
						(player) => player.teamId === team.teamId,
					)}
					names={names}
					selfPuuid={selfPuuid}
					agentsById={agentsById}
					tiersById={tiersById}
				/>
			))}
		</div>
	);
}
