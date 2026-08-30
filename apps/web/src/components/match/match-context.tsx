import type { Agent, CompetitiveTier, LobbyBaseline } from "@valotrak/valorant";
import { createContext, useContext } from "react";

/** Shared lobby data passed down to player cards without prop drilling. */
export interface MatchContextValue {
	agentsById: Map<string, Agent>;
	tiersById: Map<number, CompetitiveTier>;
	/** Region of the current lobby (used when following a player). */
	region: string;
	/**
	 * Lobby-wide reference values, absent while too few players are enriched.
	 * Cards show raw stats only when this is undefined.
	 */
	lobbyBaseline?: LobbyBaseline;
	/**
	 * Probable parties, keyed by puuid and valued by group number. Inferred
	 * from recent co-play, so it is a hint and the UI must say so.
	 */
	premadeGroups: Map<string, number>;
}

const MatchContext = createContext<MatchContextValue | null>(null);

export const MatchProvider = MatchContext.Provider;

export function useMatchContext(): MatchContextValue {
	const value = useContext(MatchContext);
	if (!value) {
		throw new Error("useMatchContext must be used within a MatchProvider");
	}
	return value;
}
