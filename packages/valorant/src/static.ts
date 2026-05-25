import { VALORANT_API_BASE } from "./constants";
import { fetchTransport, type RiotTransport, riotJson } from "./transport";
import type {
	Agent,
	BundleInfo,
	ClientVersion,
	CompetitiveTier,
	ContentTier,
	MapInfo,
	SkinLevel,
} from "./types";

/**
 * Clients for the community static-asset API (valorant-api.com).
 *
 * These have no auth, send permissive CORS headers, and rarely change — cache
 * the results aggressively (e.g. TanStack Query with a long `staleTime`).
 */

interface ValorantApiEnvelope<T> {
	status: number;
	data: T;
}

interface RawAgent {
	uuid: string;
	displayName: string;
	displayIcon: string | null;
	isPlayableCharacter: boolean;
	role: { displayName: string } | null;
}

interface RawTier {
	tier: number;
	tierName: string;
	divisionName: string;
	color: string;
	backgroundColor: string;
	smallIcon: string | null;
	largeIcon: string | null;
}

interface RawTierSet {
	tiers: RawTier[];
}

interface RawMap {
	uuid: string;
	displayName: string | null;
	mapUrl: string | null;
}

export async function getAgents(
	transport: RiotTransport = fetchTransport,
): Promise<Agent[]> {
	const res = await riotJson<ValorantApiEnvelope<RawAgent[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/agents?isPlayableCharacter=true`,
	});
	return res.data.map((a) => ({
		uuid: a.uuid,
		displayName: a.displayName,
		displayIcon: a.displayIcon,
		role: a.role?.displayName ?? null,
	}));
}

export async function getCompetitiveTiers(
	transport: RiotTransport = fetchTransport,
): Promise<CompetitiveTier[]> {
	const res = await riotJson<ValorantApiEnvelope<RawTierSet[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/competitivetiers`,
	});
	// The last tier set is the current episode's ranking system.
	const current = res.data.at(-1);
	if (!current) {
		return [];
	}
	return current.tiers.map((t) => ({
		tier: t.tier,
		tierName: t.tierName,
		divisionName: t.divisionName,
		color: t.color,
		backgroundColor: t.backgroundColor,
		smallIcon: t.smallIcon,
		largeIcon: t.largeIcon,
	}));
}

export async function getMaps(
	transport: RiotTransport = fetchTransport,
): Promise<MapInfo[]> {
	const res = await riotJson<ValorantApiEnvelope<RawMap[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/maps`,
	});
	return res.data
		.filter((m): m is RawMap & { displayName: string; mapUrl: string } =>
			Boolean(m.displayName && m.mapUrl),
		)
		.map((m) => ({
			uuid: m.uuid,
			displayName: m.displayName,
			mapUrl: m.mapUrl,
		}));
}

export async function getVersion(
	transport: RiotTransport = fetchTransport,
): Promise<ClientVersion> {
	const res = await riotJson<ValorantApiEnvelope<ClientVersion>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/version`,
	});
	return res.data;
}

interface RawSkinChroma {
	uuid: string;
	fullRender: string | null;
}

interface RawSkinLevel {
	uuid: string;
	displayName: string | null;
	displayIcon: string | null;
}

interface RawSkin {
	uuid: string;
	displayName: string;
	displayIcon: string | null;
	contentTierUuid: string | null;
	chromas: RawSkinChroma[];
	levels: RawSkinLevel[];
}

interface RawContentTier {
	uuid: string;
	displayName: string;
	highlightColor: string;
	displayIcon: string | null;
}

/**
 * All weapon skin *levels*, flattened to one entry per level. Used to resolve
 * the storefront's skin-level UUIDs to a display name, icon and rarity tier.
 */
export async function getWeaponSkins(
	transport: RiotTransport = fetchTransport,
): Promise<SkinLevel[]> {
	const res = await riotJson<ValorantApiEnvelope<RawSkin[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/weapons/skins`,
	});
	const levels: SkinLevel[] = [];
	for (const skin of res.data) {
		const fallbackIcon =
			skin.displayIcon ?? skin.chromas[0]?.fullRender ?? null;
		for (const level of skin.levels) {
			levels.push({
				levelId: level.uuid,
				skinId: skin.uuid,
				displayName: level.displayName ?? skin.displayName,
				displayIcon: level.displayIcon ?? fallbackIcon,
				contentTierId: skin.contentTierUuid,
			});
		}
	}
	return levels;
}

/** Skin rarity tiers (for the colored corner + price-tier icon). */
export async function getContentTiers(
	transport: RiotTransport = fetchTransport,
): Promise<ContentTier[]> {
	const res = await riotJson<ValorantApiEnvelope<RawContentTier[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/contenttiers`,
	});
	return res.data.map((t) => ({
		uuid: t.uuid,
		displayName: t.displayName,
		highlightColor: t.highlightColor,
		displayIcon: t.displayIcon,
	}));
}

interface RawBundleAsset {
	uuid: string;
	displayName: string | null;
	displayIcon: string | null;
}

/** Bundle display data, keyed by `uuid` (the storefront's DataAssetID). */
export async function getBundles(
	transport: RiotTransport = fetchTransport,
): Promise<BundleInfo[]> {
	const res = await riotJson<ValorantApiEnvelope<RawBundleAsset[]>>(transport, {
		method: "GET",
		url: `${VALORANT_API_BASE}/bundles`,
	});
	return res.data
		.filter((b): b is RawBundleAsset & { displayName: string } =>
			Boolean(b.displayName),
		)
		.map((b) => ({
			uuid: b.uuid,
			displayName: b.displayName,
			displayIcon: b.displayIcon,
		}));
}
