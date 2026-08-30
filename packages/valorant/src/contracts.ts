import { pdBase, type RiotShard } from "./endpoints";
import {
	buildAuthHeaders,
	type RiotAuth,
	type RiotTransport,
	riotJson,
} from "./transport";

export interface RawContract {
	ContractDefinitionID?: string;
	ContractProgression?: {
		TotalProgressionEarned?: number;
		TotalProgressionEarnedVersion?: number;
	};
	ProgressionLevelReached?: number;
	ProgressionTowardsNextLevel?: number;
}

export interface RawContracts {
	Version?: number;
	Subject?: string;
	Contracts?: RawContract[];
	ActiveSpecialContract?: string;
}

export interface ContractProgress {
	contractId: string;
	level: number;
	towardsNextLevel: number;
	totalEarned: number;
}

export function mapContracts(raw: RawContracts): ContractProgress[] {
	const contracts: ContractProgress[] = [];
	for (const contract of raw.Contracts ?? []) {
		if (!contract.ContractDefinitionID) {
			continue;
		}
		contracts.push({
			contractId: contract.ContractDefinitionID,
			level: contract.ProgressionLevelReached ?? 0,
			towardsNextLevel: contract.ProgressionTowardsNextLevel ?? 0,
			totalEarned: contract.ContractProgression?.TotalProgressionEarned ?? 0,
		});
	}
	return contracts;
}

/** The contract Riot flags as active, when there is one. */
export function findActiveContract(
	raw: RawContracts,
): ContractProgress | undefined {
	const active = raw.ActiveSpecialContract;
	if (!active) {
		return undefined;
	}
	return mapContracts(raw).find((contract) => contract.contractId === active);
}

export async function getContracts(
	transport: RiotTransport,
	auth: RiotAuth,
	shard: RiotShard,
	puuid: string,
): Promise<RawContracts> {
	return riotJson<RawContracts>(transport, {
		method: "GET",
		url: `${pdBase(shard.shard)}/contracts/v1/contracts/${puuid}`,
		headers: buildAuthHeaders(auth),
	});
}
