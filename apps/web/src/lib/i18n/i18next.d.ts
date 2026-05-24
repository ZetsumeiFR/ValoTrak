import "i18next";

import type { Resources } from "./resources";

/**
 * Make `t()` keys type-checked and auto-completed against the English catalogue.
 * `fr` must mirror `en`'s shape (enforced by both being `as const` siblings).
 */
declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "translation";
		resources: Resources;
	}
}
