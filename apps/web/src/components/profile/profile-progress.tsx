import { useTranslation } from "react-i18next";

import { useActiveContract } from "@/lib/valorant/use-contracts";
import { useLeaderboard } from "@/lib/valorant/use-leaderboard";

import { StatTile } from "./stat-tile";

/**
 * Account progression that lives outside the match history: the running
 * contract and, for the top of the ladder, the leaderboard placement.
 */
export function ProfileProgress({ puuid }: { puuid: string }) {
	const { t } = useTranslation();
	const contract = useActiveContract();
	const leaderboard = useLeaderboard(puuid);
	const cutoff = leaderboard?.topTierRrThreshold;

	if (!contract && !leaderboard?.self && cutoff === undefined) {
		return null;
	}

	return (
		<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
			{contract ? (
				<StatTile
					label={t("profile.contractLevel")}
					sub={t("profile.contractProgress", {
						xp: contract.towardsNextLevel,
					})}
					value={String(contract.level)}
				/>
			) : null}
			{leaderboard?.self ? (
				<StatTile
					label={t("profile.leaderboardRank")}
					sub={t("profile.leaderboardOf", {
						total: leaderboard.totalPlayers,
					})}
					value={`#${leaderboard.self.rank}`}
				/>
			) : null}
			{cutoff === undefined ? null : (
				<StatTile
					label={t("profile.topTierCutoff")}
					sub={t("profile.topTierCutoffSub")}
					value={`${cutoff} RR`}
				/>
			)}
		</div>
	);
}
