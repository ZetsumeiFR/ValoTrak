import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Badge } from "@valotrak/ui/components/badge";
import { Button } from "@valotrak/ui/components/button";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { FlaskConical, RefreshCw, TriangleAlert } from "lucide-react";
import { type ReactNode, useMemo } from "react";

import { TrackedList } from "@/components/tracked/tracked-list";
import { authClient } from "@/lib/auth-client";
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

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<h1 className="font-bold text-lg tracking-tight">Profile</h1>
				{profile.data?.isDemo ? <Badge variant="secondary">Demo</Badge> : null}
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
				Refresh
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
		const needRegion =
			isAppError(profile.error) && profile.error.kind === "needRegion";
		const message = isAppError(profile.error)
			? profile.error.message
			: String(profile.error);
		body = (
			<Alert variant="destructive">
				<TriangleAlert />
				<AlertTitle>
					{needRegion ? "Region unknown" : "Couldn't load your profile"}
				</AlertTitle>
				<AlertDescription>
					{needRegion
						? "Your region couldn't be detected from the game log. Launch Valorant, or set it in Settings."
						: message}
				</AlertDescription>
			</Alert>
		);
	} else {
		const data = profile.data;
		const stats = data.stats;
		const winAccent = (stats?.winRate ?? 0) >= 50 ? "win" : "brand";

		body = (
			<div className="flex flex-col gap-8">
				{data.isDemo ? (
					<Alert>
						<FlaskConical />
						<AlertTitle>Demo profile</AlertTitle>
						<AlertDescription>
							Sample data — launch Valorant on Windows to see your real stats.
						</AlertDescription>
					</Alert>
				) : null}

				<ProfileHero profile={data} tiersById={tiersById} />

				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					<StatTile
						label="K / D"
						value={stats ? stats.kd.toFixed(2) : "—"}
						sub="kills / deaths"
					/>
					<StatTile
						label="Combat Score"
						value={stats ? String(Math.round(stats.acs)) : "—"}
						sub="avg per round"
					/>
					<StatTile
						label="Headshot %"
						value={stats ? `${Math.round(stats.hsPercent)}%` : "—"}
						sub="last matches"
					/>
					<StatTile
						label="Win Rate"
						value={stats ? `${Math.round(stats.winRate)}%` : "—"}
						sub={stats ? `${stats.wins}W · ${stats.losses}L` : undefined}
						accent={winAccent}
					/>
				</div>

				<section className="flex flex-col gap-3">
					<SectionHeading>Top agents</SectionHeading>
					<MainsRow stats={stats} agentsById={agentsById} />
				</section>

				<section className="flex flex-col gap-3">
					<SectionHeading>Recent matches</SectionHeading>
					<RecentMatches
							matches={data.recentMatches}
							agentsById={agentsById}
							mapsByUrl={mapsByUrl}
						/>
				</section>

				<section className="flex flex-col gap-3">
					<SectionHeading>Tracked players</SectionHeading>
					{session ? (
						<TrackedList />
					) : (
						<p className="font-mono text-muted-foreground text-xs">
							<Link
								to="/login"
								className="text-brand underline-offset-4 hover:underline"
							>
								Sign in
							</Link>{" "}
							to follow players and build their stat history.
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
