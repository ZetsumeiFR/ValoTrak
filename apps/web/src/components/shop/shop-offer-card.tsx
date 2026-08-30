import type { ReactNode } from "react";

export function OfferCard({
	name,
	icon,
	tierColor,
	children,
}: {
	name: string;
	icon: string | null;
	tierColor?: string;
	children: ReactNode;
}) {
	return (
		<div className="group relative flex flex-col overflow-hidden rounded-lg border border-border/80 bg-card/40">
			<div
				className="absolute inset-x-0 top-0 h-0.5"
				style={tierColor ? { backgroundColor: tierColor } : undefined}
			/>
			<div className="flex aspect-[16/7] items-center justify-center p-4">
				{icon ? (
					<img
						src={icon}
						alt=""
						className="h-full w-full object-contain transition-transform group-hover:scale-105"
					/>
				) : null}
			</div>
			<div className="flex items-center justify-between gap-2 border-border/60 border-t px-3 py-2">
				<span className="truncate font-medium text-sm">{name}</span>
				{children}
			</div>
		</div>
	);
}
