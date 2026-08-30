import { Badge } from "@valotrak/ui/components/badge";
import { Card, CardContent, CardHeader } from "@valotrak/ui/components/card";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { cn } from "@valotrak/ui/lib/utils";
import { comparePlayerToLobby, type EnrichedPlayer } from "@valotrak/valorant";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AgentAvatar } from "./agent-avatar";
import { FavoriteButton } from "./favorite-button";
import { useMatchContext } from "./match-context";
import { RankBadge } from "./rank-badge";

type DeltaTone = "win" | "loss" | "neutral";

const TONE_CLASS: Record<DeltaTone, string> = {
	win: "text-win",
	loss: "text-loss",
	neutral: "text-muted-foreground",
};

interface StatDelta {
	text: string;
	tone: DeltaTone;
}

/**
 * Distance from the lobby baseline, rendered in the stat's own unit. Every
 * stat here is "higher is better", so the sign maps directly onto the tone.
 */
function formatDelta(value: number, digits: number): StatDelta {
	const rounded = Number(value.toFixed(digits));
	if (rounded === 0) {
		return { text: "=", tone: "neutral" };
	}
	return {
		text: `${rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}`,
		tone: rounded > 0 ? "win" : "loss",
	};
}

function StatCell({
	label,
	value,
	delta,
}: {
	label: string;
	value: string;
	delta?: StatDelta;
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
				{label}
			</span>
			<span className="font-medium tabular-nums">{value}</span>
			{delta ? (
				<span
					className={cn(
						"font-mono text-[10px] tabular-nums",
						TONE_CLASS[delta.tone],
					)}
				>
					{delta.text}
				</span>
			) : null}
		</div>
	);
}

export function PlayerCard({ player }: { player: EnrichedPlayer }) {
	const { t } = useTranslation();
	const { agentsById, tiersById, region, lobbyBaseline, premadeGroups } =
		useMatchContext();
	const premadeGroup = premadeGroups.get(player.puuid);
	const agent = player.agentId ? agentsById.get(player.agentId) : undefined;
	const name = player.riotId?.gameName ?? t("common.unknown");
	const tag = player.riotId?.tagLine;
	const stats = player.stats;
	const isLoading = !stats && !player.error;
	const peakInfo =
		player.rank?.peakTier !== undefined
			? tiersById.get(player.rank.peakTier)
			: undefined;
	const deltas =
		stats && lobbyBaseline
			? comparePlayerToLobby(stats, lobbyBaseline)
			: undefined;

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
							{premadeGroup ? (
								<Badge
									className="h-4 gap-1 px-1 text-[10px]"
									title={t("match.premadeTitle")}
									variant="outline"
								>
									<Users className="size-2.5" />
									{t("match.premadeGroup", { group: premadeGroup })}
								</Badge>
							) : null}
						</div>
						<RankBadge
							tier={player.rank?.tier}
							rr={player.rank?.rr}
							tiersById={tiersById}
						/>
						{player.level !== undefined || peakInfo ? (
							<div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-muted-foreground uppercase">
								{player.level !== undefined ? (
									<span>{t("match.level", { level: player.level })}</span>
								) : null}
								{peakInfo ? (
									<span>{t("match.peak", { tier: peakInfo.tierName })}</span>
								) : null}
							</div>
						) : null}
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
									<StatCell
										label="K/D"
										value={stats.kd.toFixed(2)}
										delta={deltas ? formatDelta(deltas.kd, 2) : undefined}
									/>
									<StatCell
										label="ACS"
										value={String(Math.round(stats.acs))}
										delta={deltas ? formatDelta(deltas.acs, 0) : undefined}
									/>
									<StatCell
										label="HS%"
										value={`${Math.round(stats.hsPercent)}%`}
										delta={
											deltas ? formatDelta(deltas.hsPercent, 0) : undefined
										}
									/>
									<StatCell
										label="Win%"
										value={`${Math.round(stats.winRate)}%`}
										delta={deltas ? formatDelta(deltas.winRate, 0) : undefined}
									/>
								</>
							) : null}
						</div>

						{deltas && lobbyBaseline ? (
							<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
								{t("match.vsLobby", { players: lobbyBaseline.sampleSize })}
							</span>
						) : null}

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
