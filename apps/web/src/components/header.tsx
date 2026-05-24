import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import logoMark from "@/assets/logo-mark.png";

import { LanguageToggle } from "./language-toggle";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

const LINKS = [
	{ to: "/", labelKey: "nav.profile", exact: true },
	{ to: "/match", labelKey: "nav.match", exact: false },
	{ to: "/settings", labelKey: "nav.settings", exact: false },
] as const;

export default function Header() {
	const { t } = useTranslation();

	return (
		<header className="border-border/80 border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
				<div className="flex items-center gap-6">
					<Link to="/" className="group flex items-center gap-2">
						<img
							src={logoMark}
							alt=""
							className="h-6 w-auto transition-transform group-hover:scale-110"
						/>
						<span className="font-extrabold font-sans text-base tracking-tight">
							ValoTrak
						</span>
					</Link>
					<nav className="flex items-center gap-5">
						{LINKS.map(({ to, labelKey, exact }) => (
							<Link
								key={to}
								to={to}
								activeOptions={{ exact }}
								className="relative font-mono text-muted-foreground text-xs uppercase tracking-[0.15em] transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-brand after:transition-all hover:text-foreground hover:after:w-full data-[status=active]:text-foreground data-[status=active]:after:w-full"
							>
								{t(labelKey)}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-2">
					<LanguageToggle />
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
