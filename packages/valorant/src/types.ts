import type { RiotShard } from "./endpoints";

/* -------------------------------------------------------------------------- */
/*                              Domain (normalized)                            */
/* -------------------------------------------------------------------------- */

/** Lifecycle phase of the local Valorant client. */
export type MatchPhase = "menus" | "pregame" | "coregame";

/** In-match team. Deathmatch / non-team modes may use other ids. */
export type TeamId = "Blue" | "Red" | (string & {});

export interface RiotId {
	gameName: string;
	tagLine: string;
}

export interface RankInfo {
	/** Competitive tier number (0 = Unranked). Map to a name via the static API. */
	tier: number;
	/** Ranked Rating within the tier (0-100). */
	rr: number;
	/** Highest tier reached, when available. */
	peakTier?: number;
}

export interface AgentUsage {
	agentId: string;
	games: number;
	/** Win rate on this agent over the analyzed matches, 0-100. */
	winRate: number;
}

export interface AggregatedStats {
	matchesAnalyzed: number;
	/** Kills / deaths ratio. */
	kd: number;
	avgKills: number;
	avgDeaths: number;
	avgAssists: number;
	/** Average Combat Score per round. */
	acs: number;
	/** Headshot percentage, 0-100. */
	hsPercent: number;
	/** Win rate, 0-100. */
	winRate: number;
	wins: number;
	losses: number;
	/** Most-played agents over the analyzed matches, highest first. */
	mainAgents: AgentUsage[];
}

/** A player discovered in the current pregame/coregame lobby. */
export interface LobbyPlayer {
	puuid: string;
	teamId: TeamId;
	/** Locked agent uuid (known in coregame, and in pregame once locked). */
	agentId?: string;
	isAlly: boolean;
	isSelf: boolean;
}

/** Result of the Rust `get_current_match` command. */
export interface CurrentMatch {
	phase: MatchPhase;
	matchId?: string;
	players: LobbyPlayer[];
	shard: RiotShard;
}

/** A lobby player enriched with remote + static data, ready for the UI. */
export interface EnrichedPlayer extends LobbyPlayer {
	riotId?: RiotId;
	rank?: RankInfo;
	/** Account level, when Riot's account XP endpoint is available. */
	level?: number;
	stats?: AggregatedStats;
	/** Set when enrichment failed for this player (display a fallback card). */
	error?: string;
}

/** Compact per-match line for the profile timeline. */
export interface MatchSummary {
	matchId: string;
	agentId: string;
	won: boolean;
	kills: number;
	deaths: number;
	assists: number;
	/** Average Combat Score for this match. */
	acs: number;
	/** Headshot percentage for this match, 0-100. */
	hsPercent: number;
	queue?: string;
	/** Raw map asset path (`matchInfo.mapId`); resolve to a name via the static maps API. */
	map?: string;
	startedAt?: number;
}

/** One player's line in a finished match's scoreboard. */
export interface ScoreboardPlayer {
	puuid: string;
	teamId: TeamId;
	agentId: string;
	/** Competitive tier number in this match (0 = Unranked). */
	tier: number;
	kills: number;
	deaths: number;
	assists: number;
	/** Average Combat Score for this match (score / rounds). */
	acs: number;
	/** Headshot percentage for this match, 0-100. */
	hsPercent: number;
	/** Total combat score, used for ordering the scoreboard. */
	score: number;
}

/** A team's result in a finished match. */
export interface ScoreboardTeam {
	teamId: TeamId;
	won: boolean;
	/** Rounds won (the team's score). */
	roundsWon: number;
}

/** A finished match's full scoreboard, for the recap view. */
export interface MatchScoreboard {
	matchId: string;
	/** Raw map asset path (`matchInfo.mapId`); resolve to a name via the static maps API. */
	map?: string;
	queue?: string;
	startedAt?: number;
	teams: ScoreboardTeam[];
	/** All players, highest combat score first. */
	players: ScoreboardPlayer[];
}

/** The signed-in user's own Valorant profile, for the landing page. */
export interface Profile {
	puuid: string;
	riotId?: RiotId;
	rank?: RankInfo;
	/** Account level, when Riot's account XP endpoint is available. */
	level?: number;
	stats?: AggregatedStats;
	recentMatches: MatchSummary[];
}

/** One historical data point for the trend charts (from player_stats_cache). */
export interface TrendPoint {
	/** Epoch milliseconds. */
	capturedAt: number;
	tier: number | null;
	rr: number | null;
	kd: number | null;
	acs: number | null;
	hsPercent: number | null;
	winRate: number | null;
}

/* -------------------------------------------------------------------------- */
/*                       Static assets (valorant-api.com)                      */
/* -------------------------------------------------------------------------- */

export interface Agent {
	uuid: string;
	displayName: string;
	displayIcon: string | null;
	role: string | null;
}

export interface CompetitiveTier {
	tier: number;
	tierName: string;
	divisionName: string;
	color: string;
	backgroundColor: string;
	smallIcon: string | null;
	largeIcon: string | null;
}

/** A Valorant map from the static API (valorant-api.com), keyed by `mapUrl`. */
export interface MapInfo {
	uuid: string;
	displayName: string;
	/** Internal asset path Riot returns as `matchInfo.mapId`, e.g. `/Game/Maps/Ascent/Ascent`. */
	mapUrl: string;
}

export interface ClientVersion {
	version: string;
	riotClientVersion: string;
	riotClientBuild: string;
	buildDate: string;
}

/** One purchasable skin level from the static API (valorant-api.com). */
export interface SkinLevel {
	levelId: string;
	skinId: string;
	displayName: string;
	displayIcon: string | null;
	contentTierId: string | null;
}

/** A skin rarity tier (e.g. Select, Deluxe, Ultra) from the static API. */
export interface ContentTier {
	uuid: string;
	displayName: string;
	highlightColor: string;
	displayIcon: string | null;
}

/** A bundle's display data from the static API, keyed by its DataAssetID. */
export interface BundleInfo {
	uuid: string;
	displayName: string;
	displayIcon: string | null;
}

/* -------------------------------------------------------------------------- */
/*                  Raw Riot pvp.net shapes (partial, what we use)            */
/* -------------------------------------------------------------------------- */

export interface RawCompetitiveUpdate {
	TierAfterUpdate?: number;
	RankedRatingAfterUpdate?: number;
}

export interface RawMmr {
	LatestCompetitiveUpdate?: RawCompetitiveUpdate;
	QueueSkills?: Record<string, unknown>;
}

export interface RawAccountXp {
	Progress?: {
		Level?: number;
		XP?: number;
	};
	Level?: number;
	AccountLevel?: number;
}

export interface RawMatchHistoryEntry {
	MatchID: string;
	GameStartTime: number;
	QueueID: string;
}

export interface RawMatchHistory {
	History?: RawMatchHistoryEntry[];
}

export interface RawPlayerStats {
	kills: number;
	deaths: number;
	assists: number;
	score: number;
	roundsPlayed: number;
}

export interface RawMatchPlayer {
	subject: string;
	teamId: string;
	characterId: string;
	competitiveTier: number;
	stats?: RawPlayerStats;
}

export interface RawDamage {
	headshots: number;
	bodyshots: number;
	legshots: number;
}

export interface RawRoundPlayerStats {
	subject: string;
	damage?: RawDamage[];
}

export interface RawRoundResult {
	playerStats?: RawRoundPlayerStats[];
}

export interface RawTeam {
	teamId: string;
	won: boolean;
	roundsPlayed?: number;
	/** Rounds won by this team (the team's score). */
	numPoints?: number;
}

export interface RawMatchInfo {
	matchId: string;
	queueId?: string;
	gameStartMillis?: number;
	mapId?: string;
}

export interface RawMatchDetails {
	matchInfo: RawMatchInfo;
	players: RawMatchPlayer[];
	roundResults?: RawRoundResult[];
	teams?: RawTeam[];
}

export interface RawNameServiceEntry {
	Subject: string;
	GameName: string;
	TagLine: string;
}
