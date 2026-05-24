import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@valorant-tracker/ui/components/button";
import { Card, CardContent } from "@valorant-tracker/ui/components/card";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valorant-tracker/ui/components/empty";
import { Separator } from "@valorant-tracker/ui/components/separator";
import { Skeleton } from "@valorant-tracker/ui/components/skeleton";
import type { CompetitiveTier } from "@valorant-tracker/valorant";
import { Star, X } from "lucide-react";
import { Fragment, useMemo } from "react";

import { RankBadge } from "@/components/match/rank-badge";
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
	const queryClient = useQueryClient();
	const snapshotQuery = useQuery(
		trpc.player.getCache.queryOptions({ puuid: player.puuid, limit: 1 }),
	);
	const unfollow = useMutation(
		trpc.player.unfollow.mutationOptions({
			onSuccess: () =>
				queryClient.invalidateQueries({
					queryKey: trpc.player.listFollowed.queryKey(),
				}),
		}),
	);

	const latest = snapshotQuery.data?.[0];

	return (
		<div className="flex items-center gap-3 py-2">
			<div className="flex min-w-0 flex-col">
				<span className="truncate font-medium">
					{player.gameName}
					<span className="text-muted-foreground">#{player.tagLine}</span>
				</span>
				<span className="text-[10px] text-muted-foreground uppercase tracking-wide">
					{player.region}
				</span>
			</div>
			<div className="ml-auto flex items-center gap-4">
				<RankBadge
					tier={latest?.tier ?? undefined}
					rr={latest?.rr ?? undefined}
					tiersById={tiersById}
				/>
				<span className="text-muted-foreground tabular-nums">
					{latest?.kd != null ? `${latest.kd.toFixed(2)} K/D` : "—"}
				</span>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => unfollow.mutate({ puuid: player.puuid })}
					disabled={unfollow.isPending}
					aria-label={`Unfollow ${player.gameName}`}
				>
					<X />
				</Button>
			</div>
		</div>
	);
}

export function TrackedList() {
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

	const players = followedQuery.data ?? [];

	if (players.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Star />
					</EmptyMedia>
					<EmptyTitle>No tracked players yet</EmptyTitle>
					<EmptyDescription>
						Star a player in the Match view to follow them and build their stat
						history.
					</EmptyDescription>
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
