import { Link } from "@tanstack/react-router";
import { Button, buttonVariants } from "@valotrak/ui/components/button";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
	title: string;
	description: string;
	/** Rendered as the primary action when provided. */
	onRetry?: () => void;
	retryLabel?: string;
	/** Detail shown only in development — never surfaced to users in a build. */
	detail?: string;
}

/**
 * Full-screen error surface. Without it a thrown render error unmounts the
 * route tree and leaves a blank window, which is indistinguishable from a
 * frozen app.
 */
export function ErrorState({
	title,
	description,
	onRetry,
	retryLabel,
	detail,
}: ErrorStateProps) {
	const { t } = useTranslation();

	return (
		<div
			className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
			data-testid="error-state"
		>
			<AlertTriangle className="size-10 text-destructive" />
			<div className="space-y-1">
				<h2 className="font-semibold text-lg">{title}</h2>
				<p className="max-w-md text-muted-foreground text-sm">{description}</p>
			</div>
			{import.meta.env.DEV && detail ? (
				<pre className="max-w-lg overflow-auto rounded bg-muted p-2 text-left text-muted-foreground text-xs">
					{detail}
				</pre>
			) : null}
			<div className="flex gap-2">
				{onRetry ? (
					<Button onClick={onRetry} type="button">
						{retryLabel ?? t("error.retry")}
					</Button>
				) : null}
				<Link className={buttonVariants({ variant: "outline" })} to="/">
					{t("error.home")}
				</Link>
			</div>
		</div>
	);
}
