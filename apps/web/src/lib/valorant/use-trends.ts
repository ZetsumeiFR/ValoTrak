import { useQuery } from "@tanstack/react-query";
import {
	demoProfile,
	demoSnapshots,
	type TrendPoint,
} from "@valotrak/valorant";

import { isDesktop } from "@/lib/valorant-bridge";
import { trpcClient } from "@/utils/trpc";

export interface TrendIdentity {
	gameName?: string;
	tagLine?: string;
	region?: string;
	tier?: number;
	rr?: number;
}

export interface TrendsData {
	points: TrendPoint[];
	identity: TrendIdentity;
	isDemo: boolean;
}

async function loadTrends(puuid: string): Promise<TrendsData> {
	if (!isDesktop()) {
		const profile = demoProfile();
		return {
			points: demoSnapshots(),
			identity: {
				gameName: profile.riotId?.gameName,
				tagLine: profile.riotId?.tagLine,
				region: "eu",
				tier: profile.rank?.tier,
				rr: profile.rank?.rr,
			},
			isDemo: true,
		};
	}

	const rows = await trpcClient.player.getCache.query({ puuid, limit: 60 });
	const points: TrendPoint[] = rows
		.map((row) => ({
			capturedAt: new Date(row.capturedAt).getTime(),
			tier: row.tier,
			rr: row.rr,
			kd: row.kd,
			acs: row.acs,
			hsPercent: row.hsPercent,
			winRate: row.winRate,
		}))
		.reverse(); // getCache is newest-first → chronological for charts

	const latest = rows[0];
	return {
		points,
		identity: {
			gameName: latest?.payload?.riotId?.gameName,
			tagLine: latest?.payload?.riotId?.tagLine,
			region: latest?.region,
			tier: latest?.payload?.rank?.tier,
			rr: latest?.payload?.rank?.rr,
		},
		isDemo: false,
	};
}

export function useTrends(puuid: string) {
	return useQuery({
		queryKey: ["valorant", "trends", puuid] as const,
		queryFn: () => loadTrends(puuid),
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 1000 * 60,
	});
}
