import type { Update } from "@tauri-apps/plugin-updater";
import { useEffect } from "react";
import { toast } from "sonner";

import i18n from "@/lib/i18n";
import { isDesktop } from "@/lib/valorant-bridge";

/**
 * Download, install and relaunch into a pending update, surfacing progress as a
 * toast. Errors are reported but non-fatal — the app keeps running on failure.
 */
async function installUpdate(update: Update) {
	const { relaunch } = await import("@tauri-apps/plugin-process");
	const id = toast.loading(
		i18n.t("updater.downloading", { version: update.version, pct: "" }),
	);

	try {
		let downloaded = 0;
		let total = 0;
		await update.downloadAndInstall((event) => {
			if (event.event === "Started") {
				total = event.data.contentLength ?? 0;
			} else if (event.event === "Progress") {
				downloaded += event.data.chunkLength;
				const pct = total ? ` ${Math.round((downloaded / total) * 100)}%` : "";
				toast.loading(
					i18n.t("updater.downloading", { version: update.version, pct }),
					{ id },
				);
			} else if (event.event === "Finished") {
				toast.loading(i18n.t("updater.installing"), { id });
			}
		});
		toast.success(i18n.t("updater.installed"), { id });
		await relaunch();
	} catch (error) {
		toast.error(i18n.t("updater.failed", { error: String(error) }), { id });
	}
}

/**
 * Check GitHub for a newer signed release. Desktop-only; a no-op in the browser
 * build. When `silent`, stays quiet unless an update is actually found.
 */
export async function checkForUpdates({
	silent = false,
}: {
	silent?: boolean;
} = {}) {
	if (!isDesktop()) {
		if (!silent) toast.info(i18n.t("updater.onlyDesktop"));
		return;
	}

	const { check } = await import("@tauri-apps/plugin-updater");

	let update: Update | null;
	try {
		update = await check();
	} catch (error) {
		if (!silent)
			toast.error(i18n.t("updater.checkFailed", { error: String(error) }));
		return;
	}

	if (!update) {
		if (!silent) toast.success(i18n.t("updater.upToDate"));
		return;
	}

	const pending = update;
	toast.info(i18n.t("updater.available", { version: pending.version }), {
		duration: Number.POSITIVE_INFINITY,
		action: {
			label: i18n.t("updater.installRestart"),
			onClick: () => {
				void installUpdate(pending);
			},
		},
	});
}

/** Silently check for an update once when the app mounts (desktop only). */
export function useAutoUpdate() {
	useEffect(() => {
		void checkForUpdates({ silent: true });
	}, []);
}
