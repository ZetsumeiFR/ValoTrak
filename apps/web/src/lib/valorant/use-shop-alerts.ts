import type { Storefront } from "@valotrak/valorant";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { notify } from "@/lib/valorant-bridge";
import { pendingShopAlerts, shopRotationId } from "./shop-alerts";
import { useWatchedSkins } from "./use-watchlist";

const ALERT_KEY = "valotrak.shop-alerts.v1";

interface AlertState {
	rotation: string;
	alerted: string[];
}

/** Alerts already sent for `rotation`; a new rotation starts from scratch. */
function readAlerted(rotation: string): Set<string> {
	if (typeof localStorage === "undefined") {
		return new Set();
	}
	try {
		const parsed = JSON.parse(
			localStorage.getItem(ALERT_KEY) ?? "null",
		) as AlertState | null;
		if (
			!parsed ||
			parsed.rotation !== rotation ||
			!Array.isArray(parsed.alerted)
		) {
			return new Set();
		}
		return new Set(parsed.alerted);
	} catch {
		return new Set();
	}
}

function writeAlerted(rotation: string, alerted: Set<string>): void {
	if (typeof localStorage === "undefined") {
		return;
	}
	try {
		localStorage.setItem(
			ALERT_KEY,
			JSON.stringify({ rotation, alerted: [...alerted] } satisfies AlertState),
		);
	} catch (error) {
		console.warn("[shop-alerts] could not persist the alert state", error);
	}
}

/**
 * Announce watched skins as soon as the shop that contains them is loaded.
 *
 * Fires once per skin and per rotation, through a desktop notification on the
 * Tauri build and an in-app toast everywhere.
 */
export function useShopAlerts(
	store: Storefront | undefined,
	nameOf: (skinLevelId: string) => string,
): void {
	const { t } = useTranslation();
	const watched = useWatchedSkins();

	useEffect(() => {
		if (!store) {
			return;
		}
		const rotation = shopRotationId(store.dailyRemainingSeconds, Date.now());
		const alerted = readAlerted(rotation);
		const pending = pendingShopAlerts(store, watched, alerted);
		if (pending.length === 0) {
			return;
		}
		for (const skinLevelId of pending) {
			alerted.add(skinLevelId);
		}
		writeAlerted(rotation, alerted);

		const body = pending.map(nameOf).join(", ");
		toast.success(t("shop.alertTitle"), { description: body });
		void notify(t("shop.alertTitle"), body);
	}, [store, watched, nameOf, t]);
}
