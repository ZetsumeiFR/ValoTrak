import { useTranslation } from "react-i18next";

import { useFriends } from "@/lib/valorant/use-friends";

const STATE_KEY = {
	MENUS: "profile.stateMenus",
	PREGAME: "profile.statePregame",
	INGAME: "profile.stateInGame",
} as const;

/** The client publishes a free-form state; anything unknown reads as menus. */
function stateLabelKey(state: string | undefined) {
	return state && state in STATE_KEY
		? STATE_KEY[state as keyof typeof STATE_KEY]
		: STATE_KEY.MENUS;
}

/** Friends currently in Valorant, from the local client. Desktop only. */
export function FriendsOnline() {
	const { t } = useTranslation();
	const friends = useFriends();

	if (friends.length === 0) {
		return null;
	}

	return (
		<section className="flex flex-col gap-3">
			<h2 className="tick font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
				{t("profile.friendsOnline")}
			</h2>
			<div className="flex flex-col gap-1.5">
				{friends.map(({ friend, presence }) => (
					<div
						className="clip-corner flex items-center gap-3 bg-card py-2 pr-3 pl-4 ring-1 ring-border"
						key={friend.puuid}
					>
						<span className="truncate font-medium text-sm">
							{friend.gameName ?? friend.puuid}
							{friend.tagLine ? (
								<span className="text-muted-foreground">#{friend.tagLine}</span>
							) : null}
						</span>
						{presence.partySize ? (
							<span className="font-mono text-[10px] text-muted-foreground">
								{t("profile.partySize", {
									size: presence.partySize,
									max: presence.maxPartySize ?? 5,
								})}
							</span>
						) : null}
						<span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase">
							{t(stateLabelKey(presence.sessionLoopState))}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
