/**
 * Region / shard aware base URLs for the Riot pvp.net endpoints.
 *
 * - `pd`     -> player data (mmr, match-history, match-details, name-service)
 * - `glz`    -> game lifecycle (pregame, core-game)
 * - `shared` -> shared services (content, etc.)
 *
 * `region` examples: "eu", "na", "ap", "kr", "latam", "br".
 * `shard`  examples: "eu", "na", "ap", "kr". (often equal to region)
 */
export interface RiotShard {
	region: string;
	shard: string;
}

export function pdBase(shard: string): string {
	return `https://pd.${shard}.a.pvp.net`;
}

export function glzBase({ region, shard }: RiotShard): string {
	return `https://glz-${region}-1.${shard}.a.pvp.net`;
}

export function sharedBase(shard: string): string {
	return `https://shared.${shard}.a.pvp.net`;
}
