import type { Agent, CompetitiveTier } from "@valotrak/valorant";
import { createContext, useContext } from "react";

/** Shared lobby data passed down to player cards without prop drilling. */
export interface MatchContextValue {
	agentsById: Map<string, Agent>;
	tiersById: Map<number, CompetitiveTier>;
	/** Region of the current lobby (used when following a player). */
	region: string;
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
