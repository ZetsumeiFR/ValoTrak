import { cn } from "@valorant-tracker/ui/lib/utils";
import type { CompetitiveTier, Profile } from "@valorant-tracker/valorant";

export function ProfileHero({
	profile,
	tiersById,
}: {
	profile: Profile;
	tiersById: Map<number, CompetitiveTier>;
}) {
	const tierInfo =
		profile.rank?.tier !== undefined
			? tiersById.get(profile.rank.tier)
			: undefined;
	const peakInfo =
		profile.rank?.peakTier !== undefined
			? tiersById.get(profile.rank.peakTier)
			: undefined;
	const rr = profile.rank?.rr ?? 0;
	const name = profile.riotId?.gameName ?? "Unknown";
	const tag = profile.riotId?.tagLine;
	const form = profile.recentMatches.slice(0, 8);

	return (
		<div className="clip-corner-lg relative overflow-hidden border-brand border-l-2 bg-card">
			<div className="hero-glow pointer-events-none absolute inset-0" />
			<div className="tactical-grid pointer-events-none absolute inset-0 opacity-50" />
			<div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

			<div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8">
				<div className="flex items-center gap-5">
					{tierInfo?.largeIcon ? (
						<img
							src={tierInfo.largeIcon}
							alt=""
							className="size-24 shrink-0 drop-shadow-[0_0_24px_rgba(0,0,0,0.55)]"
						/>
					) : (
						<div className="flex size-24 shrink-0 items-center justify-center bg-muted font-mono text-muted-foreground text-xs">
							N/A
						</div>
					)}
					<div className="flex min-w-0 flex-col gap-1">
						<span className="font-mono text-[10px] text-brand uppercase tracking-[0.35em]">
							Operator
						</span>
						<h1 className="truncate font-extrabold font-sans text-4xl leading-none tracking-tight">
							{name}
							{tag ? (
								<span className="text-muted-foreground">#{tag}</span>
							) : null}
						</h1>
						<div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs">
							<span
								className="font-semibold"
								style={{ color: tierInfo ? `#${tierInfo.color}` : undefined }}
							>
								{tierInfo?.tierName ?? "UNRANKED"}
							</span>
							<span className="text-muted-foreground">· {rr} RR</span>
							{peakInfo ? (
								<span className="text-muted-foreground">
									· peak {peakInfo.tierName}
								</span>
							) : null}
						</div>
						<div className="mt-2 h-1.5 w-52 max-w-full bg-muted">
							<div
								className="h-full bg-brand"
								style={{ width: `${Math.min(100, Math.max(0, rr))}%` }}
							/>
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-2 sm:ml-auto">
					<span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
						Recent form
					</span>
					<div className="flex gap-1">
						{form.length > 0 ? (
							form.map((match) => (
								<span
									key={match.matchId}
									title={match.won ? "Win" : "Loss"}
									className={cn("size-3.5", match.won ? "bg-win" : "bg-loss")}
								/>
							))
						) : (
							<span className="text-muted-foreground text-xs">—</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
