import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import type { LobbyData } from "./use-lobby";

/**
 * Persist a stats snapshot for followed players on each live refresh, building
 * the historical trend in `player_stats_cache`. Demo lobbies are ignored so
 * fake data never reaches the database.
 */
export function useFollowedSnapshots(data: LobbyData | undefined): void {
	const { data: session } = authClient.useSession();
	const followedQuery = useQuery({
		...trpc.player.listFollowed.queryOptions(),
		enabled: !!session,
	});
	const saveCache = useMutation(trpc.player.saveCache.mutationOptions());

	useEffect(() => {
		if (!data || !session) {
			return;
		}
		const region = data.shard?.region ?? "";
		const followed = followedQuery.data;
		if (!region || !followed || followed.length === 0) {
			return;
		}
		const followedPuuids = new Set(followed.map((row) => row.puuid));
		for (const player of data.players) {
			if (
				!followedPuuids.has(player.puuid) ||
				(!player.rank && !player.stats)
			) {
				continue;
			}
			saveCache.mutate({
				puuid: player.puuid,
				region,
				snapshot: {
					riotId: player.riotId,
					rank: player.rank,
					stats: player.stats,
				},
			});
		}
	}, [data, session, followedQuery.data, saveCache]);
}
