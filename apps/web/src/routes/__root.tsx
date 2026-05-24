import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@valotrak/ui/components/sonner";
import { TooltipProvider } from "@valotrak/ui/components/tooltip";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { useAutoUpdate } from "@/lib/updater";
import { useAutoOpenMatch } from "@/lib/valorant/use-auto-open-match";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "ValoTrak",
			},
			{
				name: "description",
				content: "ValoTrak is a web application",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootComponent() {
	useAutoUpdate();
	useAutoOpenMatch();

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<TooltipProvider>
					<div className="tactical-grid pointer-events-none fixed inset-0 -z-10 opacity-[0.4]" />
					<div className="grid h-svh grid-rows-[auto_1fr]">
						<Header />
						<main className="overflow-y-auto">
							<Outlet />
						</main>
					</div>
				</TooltipProvider>
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
