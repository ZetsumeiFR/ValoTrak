import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { Badge } from "@valotrak/ui/components/badge";
import { Button } from "@valotrak/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import {
	EyeOff,
	Gamepad2,
	RefreshCw,
	Swords,
	TriangleAlert,
	Users,
} from "lucide-react";
import { useMemo } from "react";
import {
	agentsQueryOptions,
	indexAgents,
	indexTiers,
	tiersQueryOptions,
} from "@/lib/valorant/queries";
import { useLobby } from "@/lib/valorant/use-lobby";
import {
	shouldRevealEnemies,
	useEnemyRevealMode,
} from "@/lib/valorant/use-settings";
import { useFollowedSnapshots } from "@/lib/valorant/use-snapshot";
import { isAppError } from "@/lib/valorant-bridge";

import { DemoBanner } from "./demo-banner";
import { DodgeButton } from "./dodge-button";
import { MatchProvider } from "./match-context";
import { TeamColumn } from "./team-column";

const PHASE_LABEL: Record<string, string> = {
	menus: "In menus",
	pregame: "Agent select",
	coregame: "In game",
};

function LoadingGrid() {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			{["a", "b"].map((col) => (
				<div key={col} className="flex flex-col gap-2">
					<Skeleton className="h-5 w-24" />
					{["1", "2", "3", "4", "5"].map((row) => (
						<Skeleton key={row} className="h-20" />
					))}
				</div>
			))}
		</div>
	);
}

export function LobbyView() {
	const lobby = useLobby();
	const agentsQuery = useQuery(agentsQueryOptions());
	const tiersQuery = useQuery(tiersQueryOptions());
	const mode = useEnemyRevealMode();
	useFollowedSnapshots(lobby.data);

	const agentsById = useMemo(
		() => indexAgents(agentsQuery.data),
		[agentsQuery.data],
	);
	const tiersById = useMemo(
		() => indexTiers(tiersQuery.data),
		[tiersQuery.data],
	);

	const contextValue = useMemo(
		() => ({
			agentsById,
			tiersById,
			region: lobby.data?.shard?.region ?? "",
			isDemo: lobby.data?.isDemo ?? false,
		}),
		[agentsById, tiersById, lobby.data?.shard?.region, lobby.data?.isDemo],
	);

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<h1 className="font-semibold text-lg">Match</h1>
				{lobby.data ? (
					<Badge variant="outline">{PHASE_LABEL[lobby.data.phase]}</Badge>
				) : null}
				{lobby.data?.isDemo ? <Badge variant="secondary">Demo</Badge> : null}
			</div>
			<div className="flex items-center gap-2">
				{lobby.data && !lobby.data.isDemo && lobby.data.phase === "pregame" ? (
					<DodgeButton lobby={lobby.data} />
				) : null}
				<Button
					variant="outline"
					size="sm"
					onClick={() => lobby.refetch()}
					disabled={lobby.isFetching}
				>
					<RefreshCw
						data-icon="inline-start"
						className={lobby.isFetching ? "animate-spin" : undefined}
					/>
					Refresh
				</Button>
			</div>
		</div>
	);

	let body: React.ReactNode;

	if (lobby.isPending) {
		body = <LoadingGrid />;
	} else if (lobby.isError) {
		const needRegion =
			isAppError(lobby.error) && lobby.error.kind === "needRegion";
		const message = isAppError(lobby.error)
			? lobby.error.message
			: String(lobby.error);
		body = (
			<Alert variant="destructive">
				<TriangleAlert />
				<AlertTitle>
					{needRegion ? "Region unknown" : "Couldn't read the match"}
				</AlertTitle>
				<AlertDescription>
					{needRegion
						? "Your region couldn't be detected from the game log. Set it in Settings."
						: message}
				</AlertDescription>
			</Alert>
		);
	} else if (lobby.data.phase === "menus") {
		body = (
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Gamepad2 />
					</EmptyMedia>
					<EmptyTitle>Not in a match</EmptyTitle>
					<EmptyDescription>
						Join an agent select or a game and players will appear here
						automatically.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	} else {
		const { phase, players, isDemo } = lobby.data;
		const allies = players.filter((player) => player.isAlly);
		const enemies = players.filter((player) => !player.isAlly);
		const revealEnemies = shouldRevealEnemies(phase, mode);

		body = (
			<MatchProvider value={contextValue}>
				<div className="flex flex-col gap-4">
					{isDemo ? <DemoBanner /> : null}
					{revealEnemies && phase === "pregame" ? (
						<Alert variant="destructive">
							<TriangleAlert />
							<AlertTitle>Enemy reveal during agent select</AlertTitle>
							<AlertDescription>
								Showing enemy data in pregame is against Riot's policy and may
								lead to a ban. Use at your own risk.
							</AlertDescription>
						</Alert>
					) : null}

					<div className="grid gap-4 md:grid-cols-2">
						<TeamColumn
							title="Allies"
							icon={<Users className="size-4 text-muted-foreground" />}
							tone="ally"
							players={allies}
						/>
						{revealEnemies ? (
							<TeamColumn
								title="Enemies"
								icon={<Swords className="size-4 text-muted-foreground" />}
								tone="enemy"
								players={enemies}
							/>
						) : (
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<EyeOff />
									</EmptyMedia>
									<EmptyTitle>Enemies hidden</EmptyTitle>
									<EmptyDescription>
										Reveal mode is "{mode}". Change it in Settings to show
										enemies.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
					</div>
				</div>
			</MatchProvider>
		);
	}

	return (
		<div className="container mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
			{header}
			{body}
		</div>
	);
}
