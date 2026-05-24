import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Badge } from "@valotrak/ui/components/badge";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import { Skeleton } from "@valotrak/ui/components/skeleton";
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
import { ArrowLeft, FlaskConical, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { AgentAvatar } from "@/components/match/agent-avatar";
import { RankBadge } from "@/components/match/rank-badge";
import {
	agentsQueryOptions,
	indexAgents,
	indexMaps,
	indexTiers,
	mapDisplayName,
	mapsQueryOptions,
	tiersQueryOptions,
} from "@/lib/valorant/queries";
import {
	isRecapUnavailable,
	type MatchDetailData,
	useMatchDetail,
} from "@/lib/valorant/use-match-detail";

function BackLink({ label }: { label: string }) {
	return (
		<Link
			to="/"
			className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.15em] transition-colors hover:text-foreground"
		>
			<ArrowLeft className="size-3.5" />
			{label}
		</Link>
	);
}

export function MatchRecap({ matchId }: { matchId: string }) {
	const { t } = useTranslation();
	const detail = useMatchDetail(matchId);
	const agentsQuery = useQuery(agentsQueryOptions());
	const tiersQuery = useQuery(tiersQueryOptions());
	const mapsQuery = useQuery(mapsQueryOptions());

	const agentsById = useMemo(
		() => indexAgents(agentsQuery.data),
		[agentsQuery.data],
	);
	const tiersById = useMemo(
		() => indexTiers(tiersQuery.data),
		[tiersQuery.data],
	);
	const mapsByUrl = useMemo(() => indexMaps(mapsQuery.data), [mapsQuery.data]);

	return (
		<div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			<BackLink label={t("common.back")} />
			<h1 className="font-bold text-2xl tracking-tight">
				{t("match.recapTitle")}
			</h1>

			{detail.isPending ? (
				<div className="flex flex-col gap-4">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			) : detail.isError ? (
				isRecapUnavailable(detail.error) ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FlaskConical />
							</EmptyMedia>
							<EmptyTitle>{t("match.recapUnavailable")}</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<Alert variant="destructive">
						<TriangleAlert />
						<AlertTitle>{t("match.recapError")}</AlertTitle>
						<AlertDescription>
							{detail.error instanceof Error
								? detail.error.message
								: t("trends.unknownError")}
						</AlertDescription>
					</Alert>
				)
			) : (
				<RecapBody
					data={detail.data}
					agentsById={agentsById}
					tiersById={tiersById}
					mapName={mapDisplayName(mapsByUrl, detail.data.scoreboard.map)}
				/>
			)}
		</div>
	);
}

function RecapBody({
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

function TeamTable({
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
