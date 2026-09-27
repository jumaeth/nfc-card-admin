import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the local dev stack: backend on :3311 with
// `pnpm db:seed:dev`, the customer app on :3310 and this console on :3312.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.ADMIN_URL ?? "http://admin.localhost:3312",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
