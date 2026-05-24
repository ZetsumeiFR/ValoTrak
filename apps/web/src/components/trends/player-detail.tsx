import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Badge } from "@valotrak/ui/components/badge";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { ArrowLeft, FlaskConical, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { RankBadge } from "@/components/match/rank-badge";
import { indexTiers, tiersQueryOptions } from "@/lib/valorant/queries";
import { useTrends } from "@/lib/valorant/use-trends";

import { PlayerTrends } from "./player-trends";

export function PlayerDetail({
	puuid,
	name,
	tag,
	region,
}: {
	puuid: string;
	name?: string;
	tag?: string;
	region?: string;
}) {
	const trends = useTrends(puuid);
	const tiersQuery = useQuery(tiersQueryOptions());
	const tiersById = useMemo(
		() => indexTiers(tiersQuery.data),
		[tiersQuery.data],
	);

	const identity = trends.data?.identity;
	const displayName = name ?? identity?.gameName ?? "Player";
	const displayTag = tag ?? identity?.tagLine;
	const displayRegion = (region ?? identity?.region)?.toUpperCase();

	return (
		<div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			<Link
				to="/"
				className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.15em] transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-3.5" />
				Back
			</Link>

			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<h1 className="font-bold text-2xl tracking-tight">
					{displayName}
					{displayTag ? (
						<span className="text-muted-foreground">#{displayTag}</span>
					) : null}
				</h1>
				{displayRegion ? (
					<Badge variant="outline">{displayRegion}</Badge>
				) : null}
				{trends.data?.isDemo ? <Badge variant="secondary">Demo</Badge> : null}
				<RankBadge
					tier={identity?.tier}
					rr={identity?.rr}
					tiersById={tiersById}
					className="ml-auto"
				/>
			</div>

			<div className="flex items-center gap-2">
				<h2 className="tick font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
					Trends
				</h2>
				{trends.data ? (
					<span className="font-mono text-[10px] text-muted-foreground">
						{trends.data.points.length} snapshots
					</span>
				) : null}
			</div>

			{trends.isPending ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
			) : trends.isError ? (
				<Alert variant="destructive">
					<TriangleAlert />
					<AlertTitle>Couldn't load trends</AlertTitle>
					<AlertDescription>
						{trends.error instanceof Error
							? trends.error.message
							: "Unknown error"}
					</AlertDescription>
				</Alert>
			) : (
				<div className="flex flex-col gap-4">
					{trends.data.isDemo ? (
						<Alert>
							<FlaskConical />
							<AlertTitle>Demo trends</AlertTitle>
							<AlertDescription>
								Sample history. Real snapshots are recorded for followed players
								as you refresh the live lobby on Windows.
							</AlertDescription>
						</Alert>
					) : null}
					<PlayerTrends points={trends.data.points} />
				</div>
			)}
		</div>
	);
}
