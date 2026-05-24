import { cn } from "@valorant-tracker/ui/lib/utils";

export function StatTile({
	label,
	value,
	sub,
	accent = "brand",
}: {
	label: string;
	value: string;
	sub?: string;
	accent?: "brand" | "win" | "muted";
}) {
	return (
		<div className="clip-corner group relative bg-card p-4 ring-1 ring-border transition-colors hover:ring-brand/40">
			<div
				className={cn(
					"absolute inset-y-0 left-0 w-0.5",
					accent === "win" && "bg-win/70",
					accent === "brand" && "bg-brand/70",
					accent === "muted" && "bg-muted-foreground/40",
				)}
			/>
			<div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
				{label}
			</div>
			<div className="mt-1.5 font-bold font-sans text-3xl tabular-nums leading-none">
				{value}
			</div>
			{sub ? (
				<div className="mt-1.5 font-mono text-muted-foreground text-xs">
					{sub}
				</div>
			) : null}
		</div>
	);
}
