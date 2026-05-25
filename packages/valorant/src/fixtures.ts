import type { RawStorefront } from "./storefront";
import type { RawMatchDetails, RawMatchPlayer } from "./types";

/**
 * Deterministic fixtures for unit tests (stat aggregation and storefront
 * mapping correctness).
 */

/** Real agent uuids (from valorant-api.com). */
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
