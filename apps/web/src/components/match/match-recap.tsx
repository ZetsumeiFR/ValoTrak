import { useQuery } from "@tanstack/react-query";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@valotrak/ui/components/empty";
import { Skeleton } from "@valotrak/ui/components/skeleton";
import { FlaskConical, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { BackLink } from "@/components/match/match-back-link";
import { RecapBody } from "@/components/match/match-recap-body";
import {
	agentsQueryOptions,
	indexAgents,
	indexMaps,
	indexTiers,
	mapDisplayName,
	mapsQueryOptions,
	tiersQueryOptions,
} from "@/lib/valorant/queries";
import {
	isRecapUnavailable,
	useMatchDetail,
} from "@/lib/valorant/use-match-detail";

export function MatchRecap({ matchId }: { matchId: string }) {
	const { t } = useTranslation();
	const detail = useMatchDetail(matchId);
	const agentsQuery = useQuery(agentsQueryOptions());
	const tiersQuery = useQuery(tiersQueryOptions());
	const mapsQuery = useQuery(mapsQueryOptions());

	const agentsById = useMemo(
		() => indexAgents(agentsQuery.data),
		[agentsQuery.data],
	);
	const tiersById = useMemo(
		() => indexTiers(tiersQuery.data),
		[tiersQuery.data],
	);
	const mapsByUrl = useMemo(() => indexMaps(mapsQuery.data), [mapsQuery.data]);

	return (
		<div className="container mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			<BackLink label={t("common.back")} />
			<h1 className="font-bold text-2xl tracking-tight">
				{t("match.recapTitle")}
			</h1>

			{detail.isPending ? (
				<div className="flex flex-col gap-4">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			) : detail.isError ? (
				isRecapUnavailable(detail.error) ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FlaskConical />
							</EmptyMedia>
							<EmptyTitle>{t("match.recapUnavailable")}</EmptyTitle>
						</EmptyHeader>
					</Empty>
				) : (
					<Alert variant="destructive">
						<TriangleAlert />
						<AlertTitle>{t("match.recapError")}</AlertTitle>
						<AlertDescription>
							{detail.error instanceof Error
								? detail.error.message
								: t("trends.unknownError")}
						</AlertDescription>
					</Alert>
				)
			) : (
				<RecapBody
					data={detail.data}
					agentsById={agentsById}
					tiersById={tiersById}
					mapName={mapDisplayName(mapsByUrl, detail.data.scoreboard.map)}
				/>
			)}
		</div>
	);
}
