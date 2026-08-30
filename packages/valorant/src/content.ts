import { type RiotShard, sharedBase } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

export interface RawSeason {
	ID: string;
	Name: string;
	Type: "episode" | "act";
	/** ISO 8601. */
	StartTime: string;
	/** ISO 8601. */
	EndTime: string;
	IsActive: boolean;
}

export interface RawContent {
	DisabledIDs?: unknown[];
	Seasons?: RawSeason[];
	Events?: { ID: string; Name: string; IsActive: boolean }[];
}

/** An episode or act, with its window as epoch milliseconds. */
export interface SeasonInfo {
	id: string;
	name: string;
	type: "episode" | "act";
	startedAt: number;
	endedAt: number;
	isActive: boolean;
}

export function mapSeasons(raw: RawContent): SeasonInfo[] {
	return (raw.Seasons ?? []).map((season) => ({
		id: season.ID,
		name: season.Name,
		type: season.Type,
		startedAt: Date.parse(season.StartTime),
		endedAt: Date.parse(season.EndTime),
		isActive: season.IsActive,
	}));
}

/** The running act. An episode is also "active" and is deliberately skipped. */
export function findActiveAct(seasons: SeasonInfo[]): SeasonInfo | undefined {
	return seasons.find((season) => season.type === "act" && season.isActive);
}

/** The act a past timestamp belongs to, for labelling historical data. */
export function findSeasonAt(
	seasons: SeasonInfo[],
	at: number,
): SeasonInfo | undefined {
	return seasons.find(
		(season) =>
			season.type === "act" && at >= season.startedAt && at < season.endedAt,
	);
}

export async function getContent(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
): Promise<RawContent> {
	return riotJson<RawContent>(transport, {
		method: "GET",
		url: `${sharedBase(shard.shard)}/content-service/v3/content`,
		headers: buildAuthHeaders(auth),
	});
}
