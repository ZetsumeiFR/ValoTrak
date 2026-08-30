/// <reference types="bun" />
import { expect, test } from "bun:test";
import { resources } from "./resources";

function flattenKeys(obj: unknown, prefix = ""): string[] {
	if (typeof obj !== "object" || obj === null) {
		return [prefix];
	}
	const keys: string[] = [];
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === "object" && value !== null) {
			keys.push(...flattenKeys(value, path));
		} else {
			keys.push(path);
		}
	}
	return keys;
}

test("en and fr translation resources expose the exact same key set", () => {
	const enKeys = new Set(flattenKeys(resources.en.translation));
	const frKeys = new Set(flattenKeys(resources.fr.translation));

	const missingInFr = [...enKeys].filter((key) => !frKeys.has(key));
	const missingInEn = [...frKeys].filter((key) => !enKeys.has(key));

	expect({ missingInFr, missingInEn }).toEqual({
		missingInFr: [],
		missingInEn: [],
	});
});
