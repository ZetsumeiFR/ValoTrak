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
import { useTranslation } from "react-i18next";
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

const PHASE_LABEL_KEY = {
	menus: "match.phaseMenus",
	pregame: "match.phasePregame",
	coregame: "match.phaseCoregame",
} as const;

const MODE_SHORT_KEY = {
	off: "settings.modeShortOff",
	coregame: "settings.modeShortCoregame",
	pregame: "settings.modeShortPregame",
} as const;

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
	const { t } = useTranslation();
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
				<h1 className="font-semibold text-lg">{t("match.title")}</h1>
				{lobby.data ? (
					<Badge variant="outline">
						{t(PHASE_LABEL_KEY[lobby.data.phase])}
					</Badge>
				) : null}
				{lobby.data?.isDemo ? (
					<Badge variant="secondary">{t("common.demo")}</Badge>
				) : null}
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
					{t("common.refresh")}
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
					{needRegion ? t("match.regionUnknown") : t("match.readError")}
				</AlertTitle>
				<AlertDescription>
					{needRegion ? t("match.regionUnknownDesc") : message}
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
					<EmptyTitle>{t("match.notInMatch")}</EmptyTitle>
					<EmptyDescription>{t("match.notInMatchDesc")}</EmptyDescription>
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
							<AlertTitle>{t("match.enemyRevealTitle")}</AlertTitle>
							<AlertDescription>{t("match.enemyRevealDesc")}</AlertDescription>
						</Alert>
					) : null}

					<div className="grid gap-4 md:grid-cols-2">
						<TeamColumn
							title={t("match.allies")}
							icon={<Users className="size-4 text-muted-foreground" />}
							tone="ally"
							players={allies}
						/>
						{revealEnemies ? (
							<TeamColumn
								title={t("match.enemies")}
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
									<EmptyTitle>{t("match.enemiesHidden")}</EmptyTitle>
									<EmptyDescription>
										{t("match.enemiesHiddenDesc", {
											mode: t(MODE_SHORT_KEY[mode]),
										})}
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
