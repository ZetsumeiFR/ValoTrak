import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@valotrak/api/routers/index";
import { env } from "@valotrak/env/web";
import { toast } from "sonner";

import { getSessionToken } from "@/lib/session-token";

const EXPECTED_ERROR_KINDS = new Set([
	"needLogin",
	"needRegion",
	"notAvailable",
	"unavailable",
]);

function isExpectedControlFlowError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}
	const kind = (error as { kind?: unknown }).kind;
	return typeof kind === "string" && EXPECTED_ERROR_KINDS.has(kind);
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (isExpectedControlFlowError(error)) {
				return;
			}
			if (query.meta?.suppressErrorToast) {
				return;
			}
			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
});

declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: {
			suppressErrorToast?: boolean;
		};
	}
}

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${env.VITE_SERVER_URL}/trpc`,
			headers() {
				const token = getSessionToken();
				return token ? { Authorization: `Bearer ${token}` } : {};
			},
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
