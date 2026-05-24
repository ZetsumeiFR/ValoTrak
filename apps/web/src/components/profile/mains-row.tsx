import type { Agent, AggregatedStats } from "@valorant-tracker/valorant";

import { AgentAvatar } from "@/components/match/agent-avatar";

export function MainsRow({
	stats,
	agentsById,
}: {
	stats: AggregatedStats | undefined;
	agentsById: Map<string, Agent>;
}) {
	if (!stats || stats.mainAgents.length === 0) {
		return (
			<p className="font-mono text-muted-foreground text-xs">
				No agent data yet.
			</p>
		);
	}

	return (
		<div className="flex flex-wrap gap-2">
			{stats.mainAgents.map((usage) => {
				const agent = agentsById.get(usage.agentId);
				return (
					<div
						key={usage.agentId}
						className="clip-corner flex items-center gap-2.5 bg-card px-3 py-2 ring-1 ring-border"
					>
						<AgentAvatar agent={agent} size="sm" />
						<div className="flex flex-col">
							<span className="font-medium text-xs">
								{agent?.displayName ?? "Unknown"}
							</span>
							<span className="font-mono text-[10px] text-muted-foreground tabular-nums">
								{usage.games} games · {Math.round(usage.winRate)}% WR
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
