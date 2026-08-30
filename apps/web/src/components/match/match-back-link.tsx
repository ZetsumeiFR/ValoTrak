import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackLink({ label }: { label: string }) {
	return (
		<Link
			to="/"
			className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.15em] transition-colors hover:text-foreground"
		>
			<ArrowLeft className="size-3.5" />
			{label}
		</Link>
	);
}
