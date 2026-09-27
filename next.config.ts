import type { NextConfig } from "next";

// Backend base URL, no trailing slash. Read at build time (rewrites are baked
// into the build). NEXT_PUBLIC_API_URL is the old name, kept so existing
// deployments keep working.
const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3311";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Dev runs on admin.localhost so its session cookie is separate from the
  // customer app's, which lives on localhost (cookies ignore ports).
  allowedDevOrigins: ["admin.localhost"],
  // Proxy the API through this origin. The browser only ever talks to the admin
  // host, so better-auth's session cookie is scoped to it and the admin console
  // and the customer app keep separate sessions.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
