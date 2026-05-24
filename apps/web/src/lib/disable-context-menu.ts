/**
 * Block the native right-click context menu across the whole app.
 *
 * Imported for its side effect from `main.tsx`. Only active in production builds
 * so right-click "Inspect" stays available during development; end users running
 * the packaged desktop app never see the native context menu.
 */
if (import.meta.env.PROD && typeof document !== "undefined") {
	document.addEventListener("contextmenu", (event) => {
		event.preventDefault();
	});
}
