import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ErrorState } from "@/components/error-state";

/**
 * Rendered instead of a blank window when a route throws (an unhandled Riot
 * error kind, a failed loader, a render crash). Wired as the router-wide
 * default so every route is covered, not just the root.
 */
export function RouteErrorComponent({ error, reset }: ErrorComponentProps) {
	const { t } = useTranslation();
	const router = useRouter();

	return (
		<ErrorState
			description={t("error.description")}
			detail={error instanceof Error ? error.message : String(error)}
			onRetry={() => {
				reset();
				router.invalidate();
			}}
			title={t("error.title")}
		/>
	);
}

export function RouteNotFound() {
	const { t } = useTranslation();

	return (
		<ErrorState
			description={t("error.notFoundDescription")}
			title={t("error.notFoundTitle")}
		/>
	);
}
