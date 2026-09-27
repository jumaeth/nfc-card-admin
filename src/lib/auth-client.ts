"use client";

import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3311";

/**
 * better-auth web client for the admin console. Same backend and accounts as the
 * customer app; staff access is decided server-side by the user's platform role.
 * Sessions are cookie-based (same-site: admin.taplino.ch and api.taplino.ch), so
 * every request includes credentials.
 */
export const authClient = createAuthClient({
  baseURL: `${API_URL}/api/v1/auth`,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [passkeyClient()],
});

export const { useSession } = authClient;
