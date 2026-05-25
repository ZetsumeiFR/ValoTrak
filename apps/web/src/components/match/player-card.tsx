import { Badge } from "@valotrak/ui/components/badge";
import { Card, CardContent, CardHeader } from "@valotrak/ui/components/card";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { cn } from "@valotrak/ui/lib/utils";
import type { EnrichedPlayer } from "@valotrak/valorant";
import { useTranslation } from "react-i18next";

import { AgentAvatar } from "./agent-avatar";
import { FavoriteButton } from "./favorite-button";
import { useMatchContext } from "./match-context";
import { RankBadge } from "./rank-badge";

function StatCell({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</span>
			<span className="font-medium tabular-nums">{value}</span>
		</div>
	);
}

export function PlayerCard({ player }: { player: EnrichedPlayer }) {
	const { t } = useTranslation();
	const { agentsById, tiersById, region } = useMatchContext();
	const agent = player.agentId ? agentsById.get(player.agentId) : undefined;
	const name = player.riotId?.gameName ?? t("common.unknown");
	const tag = player.riotId?.tagLine;
	const stats = player.stats;
	const isLoading = !stats && !player.error;

	return (
		<Card size="sm" className={cn(player.isSelf && "ring-2 ring-primary/40")}>
			<CardHeader>
				<div className="flex items-center gap-2">
					<AgentAvatar agent={agent} />
					<div className="flex min-w-0 flex-col">
						<div className="flex items-center gap-1.5">
							<span className="truncate font-medium">{name}</span>
							{tag ? (
								<span className="text-muted-foreground">#{tag}</span>
							) : null}
							{player.isSelf ? (
								<Badge variant="outline" className="h-4 px-1 text-[10px]">
									{t("match.you")}
								</Badge>
							) : null}
						</div>
						<RankBadge
							tier={player.rank?.tier}
							rr={player.rank?.rr}
							tiersById={tiersById}
						/>
					</div>
					<div className="ml-auto">
						<FavoriteButton player={player} region={region} />
					</div>
				</div>
			</CardHeader>

			<CardContent>
				{player.error ? (
					<p className="text-muted-foreground text-xs">
						{t("match.statsUnavailable", { error: player.error })}
					</p>
				) : (
					<div className="flex flex-col gap-3">
						<div className="grid grid-cols-4 gap-2">
							{isLoading ? (
								<>
									<Skeleton className="h-7" />
									<Skeleton className="h-7" />
									<Skeleton className="h-7" />
									<Skeleton className="h-7" />
								</>
							) : stats ? (
								<>
									<StatCell label="K/D" value={stats.kd.toFixed(2)} />
									<StatCell label="ACS" value={String(Math.round(stats.acs))} />
									<StatCell
										label="HS%"
										value={`${Math.round(stats.hsPercent)}%`}
									/>
									<StatCell
										label="Win%"
										value={`${Math.round(stats.winRate)}%`}
									/>
								</>
							) : null}
						</div>

						{stats && stats.mainAgents.length > 0 ? (
							<div className="flex items-center gap-2">
								<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
									{t("match.mains")}
								</span>
								<div className="flex items-center gap-1">
									{stats.mainAgents.slice(0, 3).map((usage) => (
										<AgentAvatar
											key={usage.agentId}
											agent={agentsById.get(usage.agentId)}
											size="sm"
										/>
									))}
								</div>
								<span className="ml-auto text-muted-foreground">
									{t("match.cardRecord", {
										wins: stats.wins,
										losses: stats.losses,
										count: stats.matchesAnalyzed,
									})}
								</span>
							</div>
						) : null}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
