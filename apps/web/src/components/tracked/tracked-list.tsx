import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@valotrak/ui/components/button";
import { Card, CardContent } from "@valotrak/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import { Separator } from "@valotrak/ui/components/separator";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import type { CompetitiveTier } from "@valotrak/valorant";
import { Star, X } from "lucide-react";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { RankBadge } from "@/components/match/rank-badge";
import { TrendChart } from "@/components/trends/trend-chart";
import { indexTiers, tiersQueryOptions } from "@/lib/valorant/queries";
import { trpc } from "@/utils/trpc";

type TrackedPlayer = {
	id: string;
	puuid: string;
	gameName: string;
	tagLine: string;
	region: string;
};

function FollowedPlayerRow({
	player,
	tiersById,
}: {
	player: TrackedPlayer;
	tiersById: Map<number, CompetitiveTier>;
}) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const snapshotQuery = useQuery(
		trpc.player.getCache.queryOptions({ puuid: player.puuid, limit: 20 }),
	);
	const unfollow = useMutation(
		trpc.player.unfollow.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: trpc.player.listFollowed.queryKey(),
				}),
		}),
	);

	const rows = snapshotQuery.data ?? [];
	const latest = rows[0];
	const rrSeries = rows
		.map((row) => row.rr)
		.filter((value): value is number => value != null)
		.reverse();
	const hasTrend = rrSeries.length >= 2;

	return (
		<div className="flex items-center gap-3 py-2">
			<Link
				to="/player/$puuid"
				params={{ puuid: player.puuid }}
				search={{
					name: player.gameName,
					tag: player.tagLine,
					region: player.region,
				}}
				className="group flex min-w-0 flex-1 items-center gap-4"
			>
				<div className="flex min-w-0 flex-col">
					<span className="truncate font-medium transition-colors group-hover:text-brand">
						{player.gameName}
						<span className="text-muted-foreground">#{player.tagLine}</span>
					</span>
					<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
						{player.region}
					</span>
				</div>
				{hasTrend ? (
					<div className="ml-auto hidden w-24 shrink-0 sm:block">
						<TrendChart values={rrSeries} height={28} />
					</div>
				) : null}
				<RankBadge
					tier={latest?.tier ?? undefined}
					rr={latest?.rr ?? undefined}
					tiersById={tiersById}
					className={hasTrend ? undefined : "ml-auto"}
				/>
				<span className="hidden text-muted-foreground tabular-nums md:inline">
					{latest?.kd != null ? `${latest.kd.toFixed(2)} K/D` : "—"}
				</span>
			</Link>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={() => unfollow.mutate({ puuid: player.puuid })}
				disabled={unfollow.isPending}
				aria-label={t("tracked.unfollowNamed", { name: player.gameName })}
			>
				<X />
			</Button>
		</div>
	);
}

export function TrackedList() {
	const { t } = useTranslation();
	const followedQuery = useQuery(trpc.player.listFollowed.queryOptions());
	const tiersQuery = useQuery(tiersQueryOptions());
	const tiersById = useMemo(
		() => indexTiers(tiersQuery.data),
		[tiersQuery.data],
	);

	if (followedQuery.isPending) {
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-12" />
				<Skeleton className="h-12" />
			</div>
		);
	}

	if (followedQuery.isError) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Star />
					</EmptyMedia>
					<EmptyTitle>{t("tracked.loadError")}</EmptyTitle>
					<EmptyDescription>
						{followedQuery.error instanceof Error
							? followedQuery.error.message
							: t("trends.unknownError")}
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	const players = followedQuery.data ?? [];

	if (players.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Star />
					</EmptyMedia>
					<EmptyTitle>{t("tracked.noPlayersTitle")}</EmptyTitle>
					<EmptyDescription>{t("tracked.noPlayersDesc")}</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<Card>
			<CardContent>
				{players.map((player, index) => (
					<Fragment key={player.id}>
						{index > 0 ? <Separator /> : null}
						<FollowedPlayerRow player={player} tiersById={tiersById} />
					</Fragment>
				))}
			</CardContent>
		</Card>
	);
}
