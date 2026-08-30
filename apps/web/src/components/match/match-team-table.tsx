import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@valotrak/ui/components/table";
import { cn } from "@valotrak/ui/lib/utils";
import type { ScoreboardPlayer, ScoreboardTeam } from "@valotrak/valorant";
import { useTranslation } from "react-i18next";

import { AgentAvatar } from "@/components/match/agent-avatar";
import { RankBadge } from "@/components/match/rank-badge";
import type { indexAgents, indexTiers } from "@/lib/valorant/queries";
import type { MatchDetailData } from "@/lib/valorant/use-match-detail";

export function TeamTable({
	team,
	players,
	names,
	selfPuuid,
	agentsById,
	tiersById,
}: {
	team: ScoreboardTeam;
	players: ScoreboardPlayer[];
	names: MatchDetailData["names"];
	selfPuuid: string;
	agentsById: ReturnType<typeof indexAgents>;
	tiersById: ReturnType<typeof indexTiers>;
}) {
	const { t } = useTranslation();

	return (
		<section className="flex flex-col gap-2">
			<header className="flex items-center gap-2">
				<h2
					className={cn(
						"font-mono font-semibold text-[11px] uppercase tracking-[0.22em]",
						team.won ? "text-win" : "text-loss",
					)}
				>
					{team.won ? t("common.win") : t("common.loss")}
				</h2>
				<span className="font-mono text-muted-foreground text-xs tabular-nums">
					{team.roundsWon}
				</span>
			</header>
			<div className="clip-corner overflow-hidden bg-card ring-1 ring-border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10" />
							<TableHead>{t("match.colPlayer")}</TableHead>
							<TableHead className="text-right">K / D / A</TableHead>
							<TableHead className="text-right">ACS</TableHead>
							<TableHead className="text-right">HS%</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{players.map((player) => {
							const isSelf = player.puuid === selfPuuid;
							const riotId = names.get(player.puuid);
							const agent = agentsById.get(player.agentId);
							return (
								<TableRow
									key={player.puuid}
									className={cn(isSelf && "bg-primary/10")}
								>
									<TableCell>
										<AgentAvatar agent={agent} size="sm" />
									</TableCell>
									<TableCell>
										<div className="flex min-w-0 flex-col">
											<span className="truncate font-medium">
												{riotId?.gameName ?? t("common.unknown")}
												{riotId?.tagLine ? (
													<span className="text-muted-foreground">
														#{riotId.tagLine}
													</span>
												) : null}
												{isSelf ? (
													<span className="ml-1.5 text-brand text-xs">
														({t("match.you")})
													</span>
												) : null}
											</span>
											<RankBadge tier={player.tier} tiersById={tiersById} />
										</div>
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										<span className="text-foreground">{player.kills}</span>
										<span className="text-muted-foreground">
											/{player.deaths}/{player.assists}
										</span>
									</TableCell>
									<TableCell className="text-right font-mono tabular-nums">
										{Math.round(player.acs)}
									</TableCell>
									<TableCell className="text-right font-mono text-muted-foreground tabular-nums">
										{Math.round(player.hsPercent)}%
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</section>
	);
}
