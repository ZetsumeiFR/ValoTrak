import { describe, expect, it } from "bun:test";

import { findActiveContract, getContracts, mapContracts } from "./contracts";
import type { RiotRequest, RiotResponse, RiotTransport } from "./transport";

const auth = {
	accessToken: "access",
	entitlementToken: "entitlement",
	clientVersion: "release-01",
};

const shard = { region: "eu", shard: "eu" };

const raw = {
	ActiveSpecialContract: "agent-contract",
	Contracts: [
		{
			ContractDefinitionID: "battlepass",
			ContractProgression: { TotalProgressionEarned: 120_000 },
			ProgressionLevelReached: 42,
			ProgressionTowardsNextLevel: 1500,
		},
		{
			ContractDefinitionID: "agent-contract",
			ContractProgression: { TotalProgressionEarned: 40_000 },
			ProgressionLevelReached: 7,
			ProgressionTowardsNextLevel: 200,
		},
	],
};

describe("mapContracts", () => {
	it("normalises level and progress for every contract", () => {
		const [first] = mapContracts(raw);

		expect(first).toEqual({
			contractId: "battlepass",
			level: 42,
			towardsNextLevel: 1500,
			totalEarned: 120_000,
		});
	});

	it("defaults missing progression to zero rather than dropping the contract", () => {
		const [only] = mapContracts({
			Contracts: [{ ContractDefinitionID: "empty" }],
		});

		expect(only).toEqual({
			contractId: "empty",
			level: 0,
			towardsNextLevel: 0,
			totalEarned: 0,
		});
	});

	it("survives an empty payload", () => {
		expect(mapContracts({})).toEqual([]);
	});
});

describe("findActiveContract", () => {
	it("returns the contract Riot marks as active", () => {
		expect(findActiveContract(raw)?.contractId).toBe("agent-contract");
	});

	it("returns nothing when no contract is marked active", () => {
		expect(findActiveContract({ Contracts: raw.Contracts })).toBeUndefined();
	});
});

describe("getContracts", () => {
	it("queries the contracts endpoint for the player", async () => {
		const requests: RiotRequest[] = [];
		const transport: RiotTransport = async (
			req: RiotRequest,
		): Promise<RiotResponse> => {
			requests.push(req);
			return { status: 200, ok: true, body: JSON.stringify({ Contracts: [] }) };
		};

		await getContracts(transport, auth, shard, "puuid-1");

		expect(String(requests[0]?.url)).toBe(
			"https://pd.eu.a.pvp.net/contracts/v1/contracts/puuid-1",
		);
	});
});
