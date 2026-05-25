import type { RiotShard } from "./endpoints";
import type { RawStorefront } from "./storefront";
import type {
	CurrentMatch,
	EnrichedPlayer,
	MatchSummary,
	Profile,
	RawMatchDetails,
	RawMatchPlayer,
	TrendPoint,
} from "./types";

/**
 * Deterministic fixtures used by:
 *  - unit tests (aggregation correctness),
 *  - the macOS "demo mode" (Valorant is Windows-only, so the live local API is
 *    unavailable while developing the UI).
 */

/** Real agent uuids (from valorant-api.com) for believable demo data. */
export const AGENT = {
	jett: "add6443a-41bd-e414-f6ad-e58d267f4e95",
	sova: "320b2a48-4d9b-a075-30f1-1f93a9b638fa",
	sage: "569fdd95-4d10-43ab-ca70-79becc718b46",
	omen: "8e253930-4c05-31dd-1b6c-968525494517",
	reyna: "a3bfb853-43b2-7238-a4f1-ad90e9e46bcc",
	killjoy: "1e58de9c-4950-5125-93e9-a0aee9f98746",
	phoenix: "eb93336a-449b-9c1b-0a54-a891f7921d69",
	raze: "f94c3b30-42be-e959-889c-5aa313dba261",
	chamber: "22697a3d-45bf-8dd7-4fec-84a9e28c69d7",
	neon: "bb2a4828-46eb-8cd1-e765-15848195d751",
} as const;

export const DEMO_SHARD: RiotShard = { region: "eu", shard: "eu" };

export const SELF_PUUID = "p-self";

interface MatchSeed {
	matchId: string;
	teamId: "Blue" | "Red";
	characterId: string;
	kills: number;
	deaths: number;
	assists: number;
	score: number;
	roundsPlayed: number;
	won: boolean;
	/** Per-round shot tallies for the tracked player. */
	shots: { headshots: number; bodyshots: number; legshots: number }[];
}

function buildMatch(puuid: string, seed: MatchSeed): RawMatchDetails {
	const self: RawMatchPlayer = {
		subject: puuid,
		teamId: seed.teamId,
		characterId: seed.characterId,
		competitiveTier: 18,
		stats: {
			kills: seed.kills,
			deaths: seed.deaths,
			assists: seed.assists,
			score: seed.score,
			roundsPlayed: seed.roundsPlayed,
		},
	};
	const otherTeam = seed.teamId === "Blue" ? "Red" : "Blue";
	return {
		matchInfo: {
			matchId: seed.matchId,
			queueId: "competitive",
			gameStartMillis: 0,
		},
		players: [self],
		teams: [
			{ teamId: seed.teamId, won: seed.won },
			{ teamId: otherTeam, won: !seed.won },
		],
		roundResults: seed.shots.map((s) => ({
			playerStats: [{ subject: puuid, damage: [s] }],
		})),
	};
}

/**
 * Three matches for {@link SELF_PUUID} with known totals:
 *  kills 45 / deaths 45 -> K/D 1.0 ; score 13500 / 66 rounds -> ACS 204.55 ;
 *  HS 20 / (20+20+10)=50 -> 40% ; wins 2 / losses 1 -> 66.67% ;
 *  jett x2 (50% wr), sova x1 (100% wr).
 */
export const FIXTURE_MATCHES: RawMatchDetails[] = [
	buildMatch(SELF_PUUID, {
		matchId: "m1",
		teamId: "Blue",
		characterId: AGENT.jett,
		kills: 20,
		deaths: 10,
		assists: 5,
		score: 6000,
		roundsPlayed: 24,
		won: true,
		shots: [
			{ headshots: 5, bodyshots: 5, legshots: 0 },
			{ headshots: 5, bodyshots: 5, legshots: 0 },
		],
	}),
	buildMatch(SELF_PUUID, {
		matchId: "m2",
		teamId: "Red",
		characterId: AGENT.jett,
		kills: 10,
		deaths: 20,
		assists: 10,
		score: 3000,
		roundsPlayed: 24,
		won: false,
		shots: [
			{ headshots: 0, bodyshots: 5, legshots: 5 },
			{ headshots: 0, bodyshots: 5, legshots: 5 },
		],
	}),
	buildMatch(SELF_PUUID, {
		matchId: "m3",
		teamId: "Blue",
		characterId: AGENT.sova,
		kills: 15,
		deaths: 15,
		assists: 7,
		score: 4500,
		roundsPlayed: 18,
		won: true,
		shots: [
			{ headshots: 5, bodyshots: 0, legshots: 0 },
			{ headshots: 5, bodyshots: 0, legshots: 0 },
		],
	}),
];

interface DemoSeed {
	name: string;
	tag: string;
	agentId: string;
	tier: number;
	rr: number;
	kd: number;
	acs: number;
	hs: number;
	winRate: number;
	mainAgents: string[];
}

function buildEnriched(
	puuid: string,
	teamId: "Blue" | "Red",
	isSelf: boolean,
	seed: DemoSeed,
): EnrichedPlayer {
	return {
		puuid,
		teamId,
		agentId: seed.agentId,
		isAlly: teamId === "Blue",
		isSelf,
		riotId: { gameName: seed.name, tagLine: seed.tag },
		rank: { tier: seed.tier, rr: seed.rr },
		stats: {
			matchesAnalyzed: 10,
			kd: seed.kd,
			avgKills: Math.round(seed.kd * 14),
			avgDeaths: 14,
			avgAssists: 6,
			acs: seed.acs,
			hsPercent: seed.hs,
			winRate: seed.winRate,
			wins: Math.round(seed.winRate / 10),
			losses: 10 - Math.round(seed.winRate / 10),
			mainAgents: seed.mainAgents.map((agentId, i) => ({
				agentId,
				games: 8 - i * 3,
				winRate: seed.winRate,
			})),
		},
	};
}

const ALLIES: DemoSeed[] = [
	{
		name: "You",
		tag: "EUW",
		agentId: AGENT.jett,
		tier: 18,
		rr: 47,
		kd: 1.24,
		acs: 241,
		hs: 28,
		winRate: 60,
		mainAgents: [AGENT.jett, AGENT.reyna],
	},
	{
		name: "Sage",
		tag: "0001",
		agentId: AGENT.sage,
		tier: 17,
		rr: 12,
		kd: 0.98,
		acs: 178,
		hs: 19,
		winRate: 52,
		mainAgents: [AGENT.sage, AGENT.killjoy],
	},
	{
		name: "Brimstone",
		tag: "EU",
		agentId: AGENT.omen,
		tier: 19,
		rr: 88,
		kd: 1.05,
		acs: 203,
		hs: 22,
		winRate: 55,
		mainAgents: [AGENT.omen],
	},
	{
		name: "Flash",
		tag: "PHX",
		agentId: AGENT.phoenix,
		tier: 16,
		rr: 64,
		kd: 1.31,
		acs: 255,
		hs: 31,
		winRate: 58,
		mainAgents: [AGENT.phoenix, AGENT.raze],
	},
	{
		name: "Lockdown",
		tag: "KJ",
		agentId: AGENT.killjoy,
		tier: 18,
		rr: 33,
		kd: 0.91,
		acs: 165,
		hs: 17,
		winRate: 48,
		mainAgents: [AGENT.killjoy],
	},
];

const ENEMIES: DemoSeed[] = [
	{
		name: "Reyna",
		tag: "DIFF",
		agentId: AGENT.reyna,
		tier: 20,
		rr: 19,
		kd: 1.48,
		acs: 289,
		hs: 34,
		winRate: 64,
		mainAgents: [AGENT.reyna],
	},
	{
		name: "Sentinel",
		tag: "CHM",
		agentId: AGENT.chamber,
		tier: 19,
		rr: 71,
		kd: 1.12,
		acs: 214,
		hs: 26,
		winRate: 56,
		mainAgents: [AGENT.chamber, AGENT.jett],
	},
	{
		name: "Recon",
		tag: "SOVA",
		agentId: AGENT.sova,
		tier: 18,
		rr: 50,
		kd: 1.02,
		acs: 195,
		hs: 21,
		winRate: 51,
		mainAgents: [AGENT.sova],
	},
	{
		name: "Speed",
		tag: "NEON",
		agentId: AGENT.neon,
		tier: 17,
		rr: 40,
		kd: 1.18,
		acs: 230,
		hs: 24,
		winRate: 53,
		mainAgents: [AGENT.neon],
	},
	{
		name: "Smokes",
		tag: "OMEN",
		agentId: AGENT.omen,
		tier: 21,
		rr: 8,
		kd: 1.09,
		acs: 208,
		hs: 23,
		winRate: 59,
		mainAgents: [AGENT.omen, AGENT.sage],
	},
];

/** A full 5v5 enriched lobby for the UI demo mode. */
export function demoLobby(): EnrichedPlayer[] {
	const allies = ALLIES.map((seed, i) =>
		buildEnriched(`ally-${i}`, "Blue", i === 0, seed),
	);
	const enemies = ENEMIES.map((seed, i) =>
		buildEnriched(`enemy-${i}`, "Red", false, seed),
	);
	return [...allies, ...enemies];
}

/** A demo `CurrentMatch` (coregame) mirroring the Rust command output. */
export function demoCurrentMatch(): CurrentMatch {
	return {
		phase: "coregame",
		matchId: "demo-match",
		shard: DEMO_SHARD,
		players: demoLobby().map((p) => ({
			puuid: p.puuid,
			teamId: p.teamId,
			agentId: p.agentId,
			isAlly: p.isAlly,
			isSelf: p.isSelf,
		})),
	};
}

interface MatchLine {
	agentId: string;
	won: boolean;
	kills: number;
	deaths: number;
	assists: number;
	acs: number;
	hs: number;
	map: string;
}

const DEMO_TIMELINE: MatchLine[] = [
	{
		agentId: AGENT.jett,
		won: true,
		kills: 24,
		deaths: 12,
		assists: 4,
		acs: 287,
		hs: 31,
		map: "Ascent",
	},
	{
		agentId: AGENT.jett,
		won: false,
		kills: 16,
		deaths: 18,
		assists: 3,
		acs: 198,
		hs: 24,
		map: "Bind",
	},
	{
		agentId: AGENT.reyna,
		won: true,
		kills: 22,
		deaths: 14,
		assists: 2,
		acs: 263,
		hs: 35,
		map: "Lotus",
	},
	{
		agentId: AGENT.sova,
		won: true,
		kills: 14,
		deaths: 11,
		assists: 9,
		acs: 201,
		hs: 22,
		map: "Haven",
	},
	{
		agentId: AGENT.jett,
		won: true,
		kills: 19,
		deaths: 13,
		assists: 5,
		acs: 245,
		hs: 29,
		map: "Split",
	},
	{
		agentId: AGENT.reyna,
		won: false,
		kills: 12,
		deaths: 17,
		assists: 4,
		acs: 176,
		hs: 19,
		map: "Icebox",
	},
	{
		agentId: AGENT.jett,
		won: true,
		kills: 21,
		deaths: 10,
		assists: 6,
		acs: 268,
		hs: 33,
		map: "Sunset",
	},
	{
		agentId: AGENT.jett,
		won: false,
		kills: 15,
		deaths: 16,
		assists: 3,
		acs: 189,
		hs: 21,
		map: "Breeze",
	},
];

/** A believable self profile for the macOS demo landing page. */
export function demoProfile(): Profile {
	const recentMatches: MatchSummary[] = DEMO_TIMELINE.map((line, index) => ({
		matchId: `demo-${index}`,
		agentId: line.agentId,
		won: line.won,
		kills: line.kills,
		deaths: line.deaths,
		assists: line.assists,
		acs: line.acs,
		hsPercent: line.hs,
		queue: "competitive",
		map: line.map,
		startedAt: Date.now() - index * 1000 * 60 * 90,
	}));

	return {
		puuid: SELF_PUUID,
		riotId: { gameName: "You", tagLine: "EUW" },
		rank: { tier: 24, rr: 47, peakTier: 25 },
		stats: {
			matchesAnalyzed: 8,
			kd: 1.24,
			avgKills: 18,
			avgDeaths: 14,
			avgAssists: 4,
			acs: 241,
			hsPercent: 28,
			winRate: 62.5,
			wins: 5,
			losses: 3,
			mainAgents: [
				{ agentId: AGENT.jett, games: 5, winRate: 60 },
				{ agentId: AGENT.reyna, games: 2, winRate: 50 },
				{ agentId: AGENT.sova, games: 1, winRate: 100 },
			],
		},
		recentMatches,
	};
}

const DEMO_TREND = {
	rr: [38, 52, 67, 45, 60, 78, 64, 83, 91, 22, 40, 47],
	tier: [23, 23, 23, 23, 23, 23, 23, 23, 23, 24, 24, 24],
	kd: [1.05, 1.18, 1.22, 0.96, 1.1, 1.31, 1.08, 1.27, 1.4, 1.12, 1.19, 1.24],
	acs: [210, 235, 244, 198, 221, 268, 215, 252, 281, 226, 238, 241],
	hs: [24, 27, 29, 22, 25, 32, 24, 30, 34, 26, 27, 28],
	wr: [50, 55, 58, 48, 53, 62, 54, 60, 66, 56, 60, 62],
} as const;

/** Sample stat-cache history for the macOS demo trends UI (oldest first). */
export function demoSnapshots(): TrendPoint[] {
	const day = 1000 * 60 * 60 * 24;
	const now = Date.now();
	const count = DEMO_TREND.rr.length;
	return DEMO_TREND.rr.map((rr, i) => ({
		capturedAt: now - (count - 1 - i) * day,
		tier: DEMO_TREND.tier[i] ?? null,
		rr,
		kd: DEMO_TREND.kd[i] ?? null,
		acs: DEMO_TREND.acs[i] ?? null,
		hsPercent: DEMO_TREND.hs[i] ?? null,
		winRate: DEMO_TREND.wr[i] ?? null,
	}));
}

/* -------------------------------------------------------------------------- */
/*                          Storefront (shop) fixtures                         */
/* -------------------------------------------------------------------------- */

/** Plausible skin-level UUIDs for the storefront fixtures. */
const SKIN_LEVEL = {
	one: "skin-lvl-0001",
	two: "skin-lvl-0002",
	three: "skin-lvl-0003",
	four: "skin-lvl-0004",
} as const;

const VP = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";

const DAILY_OFFERS = [
	{ OfferID: SKIN_LEVEL.one, Cost: { [VP]: 1775 } },
	{ OfferID: SKIN_LEVEL.two, Cost: { [VP]: 2175 } },
	{ OfferID: SKIN_LEVEL.three, Cost: { [VP]: 1275 } },
	{ OfferID: SKIN_LEVEL.four, Cost: { [VP]: 875 } },
];

const FIXTURE_BUNDLE = {
	ID: "bundle-0001",
	DataAssetID: "bundle-asset-0001",
	CurrencyID: VP,
	Items: [
		{
			Item: { ItemTypeID: "type-skin", ItemID: SKIN_LEVEL.one, Amount: 1 },
			BasePrice: 2175,
			DiscountedPrice: 1740,
			DiscountPercent: 20,
		},
		{
			Item: { ItemTypeID: "type-skin", ItemID: SKIN_LEVEL.two, Amount: 1 },
			BasePrice: 2175,
			DiscountedPrice: 1740,
			DiscountPercent: 20,
		},
	],
	TotalBaseCost: { [VP]: 7100 },
	TotalDiscountedCost: { [VP]: 5680 },
	DurationRemainingInSeconds: 200_000,
};

/** A raw v3 storefront with no Night Market (BonusStore absent). */
export function fixtureStorefront(): RawStorefront {
	return {
		SkinsPanelLayout: {
			SingleItemOffers: [
				SKIN_LEVEL.one,
				SKIN_LEVEL.two,
				SKIN_LEVEL.three,
				SKIN_LEVEL.four,
			],
			SingleItemStoreOffers: DAILY_OFFERS,
			SingleItemOffersRemainingDurationInSeconds: 50_000,
		},
		FeaturedBundle: {
			Bundle: FIXTURE_BUNDLE,
			Bundles: [FIXTURE_BUNDLE],
			BundleRemainingDurationInSeconds: 200_000,
		},
	};
}

/** A raw v3 storefront with an active Night Market (BonusStore present). */
export function fixtureStorefrontWithNightMarket(): RawStorefront {
	return {
		...fixtureStorefront(),
		BonusStore: {
			BonusStoreOffers: [
				{
					BonusOfferID: "bonus-0001",
					Offer: { OfferID: SKIN_LEVEL.one, Cost: { [VP]: 1775 } },
					DiscountPercent: 47,
					DiscountCosts: { [VP]: 940 },
					IsSeen: false,
				},
				{
					BonusOfferID: "bonus-0002",
					Offer: { OfferID: SKIN_LEVEL.two, Cost: { [VP]: 2175 } },
					DiscountPercent: 30,
					DiscountCosts: { [VP]: 1522 },
					IsSeen: true,
				},
			],
			BonusStoreRemainingDurationInSeconds: 80_000,
		},
	};
}
