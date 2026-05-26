import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@valotrak/ui/components/button";
import { cn } from "@valotrak/ui/lib/utils";
import type { EnrichedPlayer } from "@valotrak/valorant";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

/**
 * Star toggle to follow/unfollow a player. Hidden when logged out, disabled
 * without a Riot ID / region (the follow mutation requires them).
 */
export function FavoriteButton({
	player,
	region,
}: {
	player: EnrichedPlayer;
	region: string;
}) {
	const { t } = useTranslation();
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();

	const followedQuery = useQuery({
		...trpc.player.listFollowed.queryOptions(),
		enabled: !!session,
	});

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: trpc.player.listFollowed.queryKey(),
		});
	const follow = useMutation(
		trpc.player.follow.mutationOptions({ onSuccess: invalidate }),
	);
	const unfollow = useMutation(
		trpc.player.unfollow.mutationOptions({ onSuccess: invalidate }),
	);

	if (!session) {
		return null;
	}

	const isFollowed =
		followedQuery.data?.some((row) => row.puuid === player.puuid) ?? false;
	const canFollow = !!player.riotId && !!region;
	const pending = follow.isPending || unfollow.isPending;
	const stateUnknown = followedQuery.isPending || followedQuery.isError;

	const toggle = () => {
		if (stateUnknown) {
			return;
		}
		if (isFollowed) {
			unfollow.mutate({ puuid: player.puuid });
			return;
		}
		if (player.riotId) {
			follow.mutate({
				puuid: player.puuid,
				gameName: player.riotId.gameName,
				tagLine: player.riotId.tagLine,
				region,
			});
		}
	};

	return (
		<Button
			variant="ghost"
			size="icon-sm"
			onClick={toggle}
			disabled={pending || stateUnknown || (!isFollowed && !canFollow)}
			aria-pressed={isFollowed}
			aria-label={isFollowed ? t("match.unfollow") : t("match.follow")}
		>
			<Star className={cn(isFollowed && "fill-current text-primary")} />
		</Button>
	);
}
