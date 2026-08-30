import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Button } from "@valotrak/ui/components/button";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { RiotLoginCard } from "@/components/riot-login-card";
import { TrackedList } from "@/components/tracked/tracked-list";
import { authClient } from "@/lib/auth-client";
import { readLatestCachedMatches } from "@/lib/valorant/match-history-cache";
import {
	agentsQueryOptions,
	indexAgents,
	indexMaps,
	indexTiers,
	mapsQueryOptions,
	tiersQueryOptions,
} from "@/lib/valorant/queries";
import { useProfile } from "@/lib/valorant/use-profile";
import { isAppError } from "@/lib/valorant-bridge";

import { MainsRow } from "./mains-row";
import { ProfileHero } from "./profile-hero";
import { RecentMatches } from "./recent-matches";
import { StatTile } from "./stat-tile";

function SectionHeading({ children }: { children: ReactNode }) {
	return (
		<h2 className="tick font-mono font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
			{children}
		</h2>
	);
}

export function ProfilePage() {
	const { t, i18n } = useTranslation();
	const profile = useProfile();
	const agentsQuery = useQuery(agentsQueryOptions());
	const tiersQuery = useQuery(tiersQueryOptions());
	const mapsQuery = useQuery(mapsQueryOptions());
	const { data: session } = authClient.useSession();

	const agentsById = useMemo(
		() => indexAgents(agentsQuery.data),
		[agentsQuery.data],
	);
	const tiersById = useMemo(
		() => indexTiers(tiersQuery.data),
		[tiersQuery.data],
	);
	const mapsByUrl = useMemo(() => indexMaps(mapsQuery.data), [mapsQuery.data]);
	const cachedHistory = useMemo(
		() => (profile.isError ? readLatestCachedMatches() : undefined),
		[profile.isError],
	);

	/** Last known matches, shown only when the live load failed. */
	function cachedSection(): ReactNode {
		if (!cachedHistory || cachedHistory.matches.length === 0) {
			return null;
		}
		return (
			<section className="flex flex-col gap-3">
				<SectionHeading>{t("profile.recentMatches")}</SectionHeading>
				<p className="font-mono text-[10px] text-muted-foreground">
					{t("profile.cachedNotice", {
						date: new Date(cachedHistory.savedAt).toLocaleString(i18n.language),
					})}
				</p>
				<RecentMatches
					matches={cachedHistory.matches}
					agentsById={agentsById}
					mapsByUrl={mapsByUrl}
				/>
			</section>
		);
	}

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<h1 className="font-bold text-lg tracking-tight">
					{t("profile.title")}
				</h1>
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={() => profile.refetch()}
				disabled={profile.isFetching}
			>
				<RefreshCw
					data-icon="inline-start"
					className={profile.isFetching ? "animate-spin" : undefined}
				/>
				{t("common.refresh")}
			</Button>
		</div>
	);

	let body: ReactNode;

	if (profile.isPending) {
		body = (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-40" />
				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</div>
				<Skeleton className="h-32" />
			</div>
		);
	} else if (profile.isError) {
		const errorKind = isAppError(profile.error) ? profile.error.kind : null;
		if (errorKind === "needLogin") {
			body = (
				<div className="flex flex-col gap-8">
					<RiotLoginCard />
					{cachedSection()}
				</div>
			);
		} else {
			const needRegion = errorKind === "needRegion";
			const message = isAppError(profile.error)
				? profile.error.message
				: String(profile.error);
			body = (
				<div className="flex flex-col gap-8">
					<Alert variant="destructive">
						<TriangleAlert />
						<AlertTitle>
							{needRegion ? t("profile.regionUnknown") : t("profile.loadError")}
						</AlertTitle>
						<AlertDescription>
							{needRegion ? t("profile.regionUnknownDesc") : message}
						</AlertDescription>
					</Alert>
					{cachedSection()}
				</div>
			);
		}
	} else {
		const data = profile.data;
		const stats = data.stats;
		const winAccent = (stats?.winRate ?? 0) >= 50 ? "win" : "brand";

		body = (
			<div className="flex flex-col gap-8">
				<ProfileHero profile={data} tiersById={tiersById} />

				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					<StatTile
						label={t("profile.statKd")}
						value={stats ? stats.kd.toFixed(2) : "—"}
						sub={t("profile.statKdSub")}
					/>
					<StatTile
						label={t("profile.statAcs")}
						value={stats ? String(Math.round(stats.acs)) : "—"}
						sub={t("profile.statAcsSub")}
					/>
					<StatTile
						label={t("profile.statHs")}
						value={stats ? `${Math.round(stats.hsPercent)}%` : "—"}
						sub={t("profile.statHsSub")}
					/>
					<StatTile
						label={t("profile.statWin")}
						value={stats ? `${Math.round(stats.winRate)}%` : "—"}
						sub={
							stats
								? t("profile.statWinSub", {
										wins: stats.wins,
										losses: stats.losses,
									})
								: undefined
						}
						accent={winAccent}
					/>
				</div>

				<section className="flex flex-col gap-3">
					<SectionHeading>{t("profile.topAgents")}</SectionHeading>
					<MainsRow stats={stats} agentsById={agentsById} />
				</section>

				<section className="flex flex-col gap-3">
					<SectionHeading>{t("profile.recentMatches")}</SectionHeading>
					<RecentMatches
						matches={data.recentMatches}
						agentsById={agentsById}
						mapsByUrl={mapsByUrl}
					/>
				</section>

				<section className="flex flex-col gap-3">
					<SectionHeading>{t("profile.trackedPlayers")}</SectionHeading>
					{session ? (
						<TrackedList />
					) : (
						<p className="font-mono text-muted-foreground text-xs">
							<Link
								to="/login"
								className="text-brand underline-offset-4 hover:underline"
							>
								{t("profile.signIn")}
							</Link>{" "}
							{t("profile.followHint")}
						</p>
					)}
				</section>
			</div>
		);
	}

	return (
		<div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			{header}
			{body}
		</div>
	);
}
