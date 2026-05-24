import { Badge } from "@valorant-tracker/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
} from "@valorant-tracker/ui/components/card";
import { Skeleton } from "@valorant-tracker/ui/components/skeleton";
import { cn } from "@valorant-tracker/ui/lib/utils";
import type { EnrichedPlayer } from "@valorant-tracker/valorant";

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
	const { agentsById, tiersById, region, isDemo } = useMatchContext();
	const agent = player.agentId ? agentsById.get(player.agentId) : undefined;
	const name = player.riotId?.gameName ?? "Unknown";
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
									You
								</Badge>
							) : null}
						</div>
						<RankBadge
							tier={player.rank?.tier}
							rr={player.rank?.rr}
							tiersById={tiersById}
						/>
					</div>
					{isDemo ? null : (
						<div className="ml-auto">
							<FavoriteButton player={player} region={region} />
						</div>
					)}
				</div>
			</CardHeader>

			<CardContent>
				{player.error ? (
					<p className="text-muted-foreground text-xs">
						Stats unavailable: {player.error}
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
									Mains
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
									{stats.wins}-{stats.losses} · {stats.matchesAnalyzed} games
								</span>
							</div>
						) : null}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
