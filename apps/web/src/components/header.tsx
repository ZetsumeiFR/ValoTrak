import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const LINKS = [
	{ to: "/", label: "Profile", exact: true },
	{ to: "/match", label: "Match", exact: false },
	{ to: "/settings", label: "Settings", exact: false },
] as const;

export default function Header() {
	return (
		<header className="border-border/80 border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
				<div className="flex items-center gap-6">
					<Link to="/" className="group flex items-center gap-2.5">
						<span className="clip-corner size-5 bg-brand transition-transform group-hover:rotate-12" />
						<span className="font-extrabold font-sans text-sm uppercase tracking-[0.18em]">
							Valorant
							<span className="text-brand">·</span>
							<span className="text-muted-foreground">Tracker</span>
						</span>
					</Link>
					<nav className="flex items-center gap-5">
						{LINKS.map(({ to, label, exact }) => (
							<Link
								key={to}
								to={to}
								activeOptions={{ exact }}
								className="relative font-mono text-muted-foreground text-xs uppercase tracking-[0.15em] transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand after:transition-all hover:text-foreground hover:after:w-full data-[status=active]:text-foreground data-[status=active]:after:w-full"
							>
								{label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
