import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import {
	selectSnapshotEntries,
	snapshotBatchSignature,
} from "./snapshot-entries";
import type { LobbyData } from "./use-lobby";

/**
 * Persist a stats snapshot for followed players on each live refresh, building
 * the historical trend in `player_stats_cache`.
 *
 * The whole lobby goes out in a single `saveCacheMany` call, keyed by
 * `matchId`. Duplicates are rejected by the database (unique index on
 * `user_id, puuid, match_id`), so a remount, token refresh or follow-list
 * invalidation cannot skew trend history. The local ref only avoids redundant
 * round trips: it re-sends whenever the set of covered players changes.
 */
export function useFollowedSnapshots(data: LobbyData | undefined): void {
	const { data: session } = authClient.useSession();
	const followedQuery = useQuery({
		...trpc.player.listFollowed.queryOptions(),
		enabled: !!session,
	});
	const saveCacheMany = useMutation(
		trpc.player.saveCacheMany.mutationOptions(),
	);
	const sentSignatures = useRef<Map<string, string>>(new Map());

	useEffect(() => {
		if (!data || !session) {
			return;
		}
		const region = data.shard?.region ?? "";
		const followed = followedQuery.data;
		const matchId = data.matchId;
		if (!region || !matchId || !followed || followed.length === 0) {
			return;
		}
		const entries = selectSnapshotEntries(
			data.players,
			new Set(followed.map((row) => row.puuid)),
		);
		if (entries.length === 0) {
			return;
		}
		const signature = snapshotBatchSignature(entries);
		if (sentSignatures.current.get(matchId) === signature) {
			return;
		}
		sentSignatures.current.set(matchId, signature);
		saveCacheMany.mutate({ region, matchId, entries });
	}, [data, session, followedQuery.data, saveCacheMany]);
}
