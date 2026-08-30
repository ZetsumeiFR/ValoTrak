/**
 * Translation catalogue for the app. English (`en`) is the source of truth and
 * the fallback language; `fr` must mirror its shape exactly so the typed `t()`
 * keys stay in sync (see `i18next.d.ts`).
 *
 * Universal Valorant abbreviations (K/D, ACS, HS%, RR, WR) are intentionally
 * left untranslated since players use them identically in both languages.
 *
 * Each namespace lives in its own module under `./resources/<namespace>.ts`;
 * this file only reassembles them into the shape consumed by i18next.
 */
import * as auth from "./resources/auth";
import * as common from "./resources/common";
import * as dodge from "./resources/dodge";
import * as error from "./resources/error";
import * as language from "./resources/language";
import * as match from "./resources/match";
import * as nav from "./resources/nav";
import * as profile from "./resources/profile";
import * as profileData from "./resources/profileData";
import * as riot from "./resources/riot";
import * as settings from "./resources/settings";
import * as shop from "./resources/shop";
import * as theme from "./resources/theme";
import * as tracked from "./resources/tracked";
import * as trends from "./resources/trends";
import * as updater from "./resources/updater";

const en = {
	common: common.en,
	nav: nav.en,
	language: language.en,
	theme: theme.en,
	auth: auth.en,
	riot: riot.en,
	profile: profile.en,
	shop: shop.en,
	match: match.en,
	settings: settings.en,
	tracked: tracked.en,
	trends: trends.en,
	dodge: dodge.en,
	error: error.en,
	profileData: profileData.en,
	updater: updater.en,
} as const;

const fr = {
	common: common.fr,
	nav: nav.fr,
	language: language.fr,
	theme: theme.fr,
	auth: auth.fr,
	riot: riot.fr,
	profile: profile.fr,
	shop: shop.fr,
	match: match.fr,
	settings: settings.fr,
	tracked: tracked.fr,
	trends: trends.fr,
	dodge: dodge.fr,
	error: error.fr,
	profileData: profileData.fr,
	updater: updater.fr,
} as const;

export const resources = {
	en: { translation: en },
	fr: { translation: fr },
} as const;

export type Resources = (typeof resources)["en"];
