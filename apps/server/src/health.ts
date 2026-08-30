import type { Context } from "hono";

export type HealthProbe = () => Promise<void>;

/**
 * Liveness + database readiness endpoint.
 *
 * Answering `200 OK` from the process alone is useless for a deploy check: a
 * server that cannot reach Neon is not healthy. The probe result decides the
 * status code, and the failure reason stays in the logs.
 */
export function createHealthHandler(probe: HealthProbe) {
	return async (c: Context): Promise<Response> => {
		try {
			await probe();
			return c.json({ status: "ok", database: "up" });
		} catch (error) {
			console.error("[health] database probe failed", error);
			return c.json({ status: "error", database: "down" }, 503);
		}
	};
}
