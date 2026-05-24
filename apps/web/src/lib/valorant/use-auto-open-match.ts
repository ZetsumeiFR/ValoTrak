import { useNavigate } from "@tanstack/react-router";
import type { MatchPhase } from "@valotrak/valorant";
import { useEffect, useRef } from "react";

import {
	getCurrentMatch,
	getLocalTokens,
	isAppError,
	isDesktop,
	onLobbyChanged,
} from "@/lib/valorant-bridge";

const IN_MATCH: ReadonlySet<MatchPhase> = new Set(["pregame", "coregame"]);

/** Read the current phase, treating "game not running" as menus. */
async function readPhase(): Promise<MatchPhase | undefined> {
	try {
		const tokens = await getLocalTokens();
		const match = await getCurrentMatch(tokens);
		return match.phase;
	} catch (error) {
		return isAppError(error) && error.kind === "notAvailable"
			? "menus"
			: undefined;
	}
}

/**
 * Jump to the Match tab automatically when the local client enters a
 * pregame/coregame, so the live lobby shows up without a manual click.
 *
 * Only fires on the menus -> match transition (a baseline is read on mount
 * without navigating), so it never yanks the user away from a match they're
 * already viewing or re-navigates on every websocket ping. Desktop only.
 */
export function useAutoOpenMatch(): void {
	const navigate = useNavigate();
	const prevPhase = useRef<MatchPhase>("menus");

	useEffect(() => {
		if (!isDesktop()) {
			return;
		}

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let unlisten: (() => void) | undefined;

		// Establish a baseline without navigating (handles "app opened mid-game").
		void readPhase().then((phase) => {
			if (!cancelled && phase) {
				prevPhase.current = phase;
			}
		});

		onLobbyChanged(() => {
			if (timer) {
				clearTimeout(timer);
			}
			// Debounced like the lobby query: the client emits several pings per change.
			timer = setTimeout(async () => {
				const phase = await readPhase();
				if (cancelled || !phase) {
					return;
				}
				const entered = IN_MATCH.has(phase) && !IN_MATCH.has(prevPhase.current);
				prevPhase.current = phase;
				if (entered) {
					navigate({ to: "/match" });
				}
			}, 1500);
		}).then((fn) => {
			unlisten = fn;
		});

		return () => {
			cancelled = true;
			if (timer) {
				clearTimeout(timer);
			}
			unlisten?.();
		};
	}, [navigate]);
}
