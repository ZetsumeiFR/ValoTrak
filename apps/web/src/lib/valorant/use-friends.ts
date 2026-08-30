import { useQuery } from "@tanstack/react-query";

import {
	type Friend,
	type FriendPresence,
	getFriends,
	getPresences,
	isAppError,
	isDesktop,
} from "@/lib/valorant-bridge";

export interface FriendActivity {
	friend: Friend;
	presence: FriendPresence;
}

/**
 * Friends currently playing Valorant.
 *
 * The friend list itself includes offline players; only those with a presence
 * are reported, which is exactly the set worth showing.
 */
async function loadFriends(): Promise<FriendActivity[]> {
	if (!isDesktop()) {
		return [];
	}
	try {
		const [friends, presences] = await Promise.all([
			getFriends(),
			getPresences(),
		]);
		const byPuuid = new Map(friends.map((friend) => [friend.puuid, friend]));
		const activities: FriendActivity[] = [];
		for (const presence of presences) {
			const friend = byPuuid.get(presence.puuid);
			if (friend) {
				activities.push({ friend, presence });
			}
		}
		return activities;
	} catch (error) {
		// The client not running is a normal state, not a failure.
		if (isAppError(error) && error.kind === "notAvailable") {
			return [];
		}
		throw error;
	}
}

export function useFriends(): FriendActivity[] {
	const query = useQuery({
		queryKey: ["valorant", "friends"] as const,
		queryFn: loadFriends,
		enabled: isDesktop(),
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 30,
	});
	return query.data ?? [];
}
