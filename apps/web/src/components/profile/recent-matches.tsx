import { cn } from "@valotrak/ui/lib/utils";
import type { Agent, MapInfo, MatchSummary } from "@valotrak/valorant";

import { AgentAvatar } from "@/components/match/agent-avatar";
import { mapDisplayName } from "@/lib/valorant/queries";

function MatchRow({
	match,
	agent,
	mapsByUrl,
}: {
	match: MatchSummary;
	agent?: Agent;
	mapsByUrl: Map<string, MapInfo>;
}) {
	const kd = match.deaths > 0 ? match.kills / match.deaths : match.kills;
	const mapName = mapDisplayName(mapsByUrl, match.map);

	return (
		<div className="clip-corner relative flex items-center gap-3 bg-card py-2 pr-3 pl-4 ring-1 ring-border">
			<div
				className={cn(
					"absolute inset-y-0 left-0 w-1",
					match.won ? "bg-win" : "bg-loss",
				)}
			/>
			<AgentAvatar agent={agent} size="sm" />
			<span
				className={cn(
					"w-9 font-mono font-semibold text-[10px] uppercase",
					match.won ? "text-win" : "text-loss",
				)}
			>
				{match.won ? "Win" : "Loss"}
			</span>
			{mapName ? (
				<span className="hidden font-medium text-xs sm:inline">
					{mapName}
				</span>
			) : null}
			<div className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums sm:gap-5">
				<span>
					<span className="text-foreground">{match.kills}</span>
					<span className="text-muted-foreground">
						/{match.deaths}/{match.assists}
					</span>
				</span>
				<span className="text-muted-foreground">{kd.toFixed(2)} KD</span>
				<span className="hidden text-muted-foreground sm:inline">
					{Math.round(match.acs)} ACS
				</span>
				<span className="hidden text-muted-foreground md:inline">
					{Math.round(match.hsPercent)}% HS
				</span>
			</div>
		</div>
	);
}

export function RecentMatches({
	matches,
	agentsById,
	mapsByUrl,
}: {
	matches: MatchSummary[];
	agentsById: Map<string, Agent>;
	mapsByUrl: Map<string, MapInfo>;
}) {
	if (matches.length === 0) {
		return (
			<p className="font-mono text-muted-foreground text-xs">
				No recent competitive matches.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{matches.map((match) => (
				<MatchRow
					key={match.matchId}
					match={match}
					agent={agentsById.get(match.agentId)}
					mapsByUrl={mapsByUrl}
				/>
			))}
		</div>
	);
}
