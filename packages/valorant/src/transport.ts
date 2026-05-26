import { CLIENT_PLATFORM } from "./constants";

/**
 * Transport-agnostic request/response contract.
 *
 * The pvp.net endpoints do not send CORS headers, so they cannot be called
 * directly from the Tauri webview. The app injects a transport backed by
 * `@tauri-apps/plugin-http` (which routes through Rust and bypasses CORS).
 * Tests and the CORS-friendly `valorant-api.com` calls use {@link fetchTransport}.
 */
export type HttpMethod = "GET" | "POST" | "PUT";

export interface RiotRequest {
	method: HttpMethod;
	url: string;
	headers?: Record<string, string>;
	/** Already-serialized request body (JSON string). */
	body?: string;
}

export interface RiotResponse {
	status: number;
	ok: boolean;
	body: string;
	/** Response headers, lowercased keys. Used to honor `Retry-After` on 429. */
	headers?: Record<string, string>;
}

/** Collect a `Headers` object into a plain record with lowercased keys. */
export function headersToRecord(headers: Headers): Record<string, string> {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		record[key.toLowerCase()] = value;
	});
	return record;
}

export type RiotTransport = (req: RiotRequest) => Promise<RiotResponse>;

/** Auth material required by the authenticated pvp.net endpoints. */
export interface RiotAuth {
	accessToken: string;
	entitlementToken: string;
	/** Game client version, e.g. "release-09.00-shipping-..." */
	clientVersion: string;
}

export class RiotApiError extends Error {
	constructor(
		readonly url: string,
		readonly status: number,
		readonly responseBody: string,
	) {
		super(`Riot API ${status} for ${url}`);
		this.name = "RiotApiError";
	}
}

const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

/** Default transport using the global `fetch` (valorant-api.com + tests). */
export const fetchTransport: RiotTransport = async (req) => {
	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(),
		DEFAULT_FETCH_TIMEOUT_MS,
	);
	try {
		const res = await fetch(req.url, {
			method: req.method,
			headers: req.headers,
			body: req.body,
			signal: controller.signal,
		});
		const body = await res.text();
		return {
			status: res.status,
			ok: res.ok,
			body,
			headers: headersToRecord(res.headers),
		};
	} finally {
		clearTimeout(timer);
	}
};

/** Headers required by the authenticated pvp.net endpoints. */
export function buildAuthHeaders(auth: RiotAuth): Record<string, string> {
	return {
		Authorization: `Bearer ${auth.accessToken}`,
		"X-Riot-Entitlements-JWT": auth.entitlementToken,
		"X-Riot-ClientVersion": auth.clientVersion,
		"X-Riot-ClientPlatform": CLIENT_PLATFORM,
	};
}

/** Run a request through the transport, throwing on non-2xx and parsing JSON. */
export async function riotJson<T>(
	transport: RiotTransport,
	req: RiotRequest,
): Promise<T> {
	const res = await transport(req);
	if (!res.ok) {
		throw new RiotApiError(req.url, res.status, res.body);
	}
	try {
		return JSON.parse(res.body) as T;
	} catch {
		throw new RiotApiError(req.url, res.status, "Invalid JSON response");
	}
}
