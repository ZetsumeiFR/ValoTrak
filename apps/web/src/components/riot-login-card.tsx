import { Alert, AlertDescription } from "@valotrak/ui/components/alert";
import { Button } from "@valotrak/ui/components/button";
import { LogIn, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useRiotSession } from "@/lib/valorant/use-riot-session";

/**
 * Sign-in prompt shown when there is no Riot session and the local client
 * isn't running. Opens Riot's official hosted login in a WebView window.
 *
 * Shared by the profile and shop pages.
 */
export function RiotLoginCard() {
	const { t } = useTranslation();
	const { login, isLoggingIn, loginError } = useRiotSession();

	return (
		<div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-lg border border-border/80 bg-card/40 px-6 py-10 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
				<LogIn className="size-6" />
			</div>
			<div className="flex flex-col gap-1.5">
				<h2 className="font-bold text-lg tracking-tight">
					{t("riot.needLoginTitle")}
				</h2>
				<p className="text-muted-foreground text-sm">
					{t("riot.needLoginDesc")}
				</p>
			</div>
			<Button
				size="lg"
				onClick={() => {
					// Errors surface via `loginError`; swallow the rejection here.
					login().catch(() => {});
				}}
				disabled={isLoggingIn}
			>
				<LogIn data-icon="inline-start" />
				{isLoggingIn ? t("riot.signingIn") : t("riot.signIn")}
			</Button>
			{loginError ? (
				<p className="font-mono text-destructive text-xs">
					{t("riot.loginFailed")}
				</p>
			) : null}
			<Alert>
				<ShieldAlert />
				<AlertDescription>{t("riot.tosWarning")}</AlertDescription>
			</Alert>
		</div>
	);
}
