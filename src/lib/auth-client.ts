"use client";

import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";

/**
 * better-auth web client for the admin console. Same backend and accounts as the
 * customer app; staff access is decided server-side by the user's platform role.
 * Requests go same-origin through the /api/v1 proxy in next.config.ts, so the
 * session cookie is scoped to the admin host (admin.taplino.ch, admin.localhost
 * in dev) and signing in here never touches the customer app's session.
 */
export const authClient = createAuthClient({
  basePath: "/api/v1/auth",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [passkeyClient()],
});

export const { useSession } = authClient;
