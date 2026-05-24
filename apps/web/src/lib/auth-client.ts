import { env } from "@valotrak/env/web";
import { createAuthClient } from "better-auth/react";

import { getSessionToken, setSessionToken } from "./session-token";

export const authClient = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	fetchOptions: {
		// Send the stored bearer token on every auth request.
		auth: {
			type: "Bearer",
			token: () => getSessionToken() ?? "",
		},
		// Capture the rotated token returned by better-auth's bearer plugin.
		onSuccess: (ctx) => {
			const token = ctx.response.headers.get("set-auth-token");
			if (token) {
				setSessionToken(token);
			}
		},
	},
});
