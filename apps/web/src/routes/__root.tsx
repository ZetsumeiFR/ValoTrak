import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { Toaster } from "@valotrak/ui/components/sonner";
import { TooltipProvider } from "@valotrak/ui/components/tooltip";
import { lazy, Suspense } from "react";

import Header from "@/components/header";
import { RouteErrorComponent, RouteNotFound } from "@/components/route-error";
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
	errorComponent: RouteErrorComponent,
	notFoundComponent: RouteNotFound,
	head: () => ({
		meta: [
			{
				title: "ValoTrak",
			},
			{
				name: "description",
				content:
					"ValoTrak — live Valorant lobby, profile, shop and rank-trend tracker.",
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

const Devtools = import.meta.env.DEV
	? lazy(async () => {
			const [{ ReactQueryDevtools }, { TanStackRouterDevtools }] =
				await Promise.all([
					import("@tanstack/react-query-devtools"),
					import("@tanstack/react-router-devtools"),
				]);

			return {
				default: function DevtoolsPanel() {
					return (
						<>
							<TanStackRouterDevtools position="bottom-left" />
							<ReactQueryDevtools
								position="bottom"
								buttonPosition="bottom-right"
							/>
						</>
					);
				},
			};
		})
	: null;

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
			{Devtools ? (
				<Suspense fallback={null}>
					<Devtools />
				</Suspense>
			) : null}
		</>
	);
}
