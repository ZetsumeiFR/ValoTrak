/**
 * Shared constants for the Valorant clients.
 *
 * NOTE: the Riot "local" + "pvp.net" endpoints used by this tracker are
 * **unofficial / undocumented**. They are not supported by Riot and may break
 * at any time. Respect rate limits: cache static data and debounce refetches.
 */

/** Base URL of the community static-asset API (no auth, CORS-friendly, cacheable). */
export const VALORANT_API_BASE = "https://valorant-api.com/v1";

/**
 * Well-known `X-Riot-ClientPlatform` blob. Base64 of:
 * { platformType: "PC", platformOS: "Windows", platformOSVersion: "...", platformChipset: "Unknown" }
 */
export const CLIENT_PLATFORM =
	"ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";

/** Valorant queue identifiers (subset we care about). */
export const QUEUE = {
	competitive: "competitive",
	unrated: "unrated",
	swiftplay: "swiftplay",
	spikerush: "spikerush",
	deathmatch: "deathmatch",
} as const;

export type QueueId = (typeof QUEUE)[keyof typeof QUEUE];

/** Default number of recent matches to aggregate per player. */
export const DEFAULT_MATCH_COUNT = 10;

/** Competitive tier number that represents "Unranked". */
export const UNRANKED_TIER = 0;
