import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { resources } from "./resources";

export const SUPPORTED_LANGUAGES = ["en", "fr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** localStorage key, kept under the `valotrak.*` namespace like other settings. */
const STORAGE_KEY = "valotrak.language";

i18next
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "en",
		supportedLngs: SUPPORTED_LANGUAGES,
		// Treat regional variants (e.g. "fr-FR" from the OS) as the base language.
		nonExplicitSupportedLngs: true,
		load: "languageOnly",
		detection: {
			// Persisted choice wins; otherwise fall back to the OS/browser language.
			order: ["localStorage", "navigator", "htmlTag"],
			lookupLocalStorage: STORAGE_KEY,
			caches: ["localStorage"],
		},
		interpolation: {
			// React already escapes values, so i18next escaping would double-encode.
			escapeValue: false,
		},
	});

/** Mirror the active language onto <html lang> for accessibility / correctness. */
function syncHtmlLang(lng: string): void {
	if (typeof document !== "undefined") {
		document.documentElement.lang = lng;
	}
}

syncHtmlLang(i18next.resolvedLanguage ?? "en");
i18next.on("languageChanged", syncHtmlLang);

export default i18next;
