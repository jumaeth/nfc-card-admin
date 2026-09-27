import { expect, test, type Page } from "@playwright/test";

// The admin console and the customer app must keep separate sessions: signing
// into one must never sign the other in, out, or into a different account.
// Each test uses ONE browser context, so both apps share a cookie jar like a
// real browser.
//
// The backend allows 10 email sign-ins per minute per IP, and this file uses 4,
// so run it at most twice a minute.

const APP_URL = process.env.APP_URL ?? "http://localhost:3310";
const API_URL = process.env.API_URL ?? "http://localhost:3311";
const PASSWORD = "taplino-dev";
const STAFF = "admin@taplino.ch"; // seeded by the backend's `pnpm db:seed:dev`
const CUSTOMER = "starter@taplino.ch";

async function signIn(page: Page, loginUrl: string, email: string) {
  await page.goto(loginUrl);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/sign-in/email")),
    page.locator('button[type="submit"]').click(),
  ]);
  if (res.status() === 429) throw new Error("Sign-in rate limited (10/min per IP). Wait a minute.");
  expect(res.status(), `sign-in as ${email}`).toBe(200);
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Email of the user the admin console is signed in as (via its own proxy). */
function adminUser(page: Page) {
  return page.evaluate(async () => {
    const res = await fetch("/api/v1/auth/get-session");
    return ((await res.json()) as { user?: { email: string } } | null)?.user?.email ?? null;
  });
}

/** Email of the user the customer app is signed in as (it calls the API directly). */
function appUser(page: Page) {
  return page.evaluate(async (api) => {
    const res = await fetch(`${api}/api/v1/auth/get-session`, { credentials: "include" });
    return ((await res.json()) as { user?: { email: string } } | null)?.user?.email ?? null;
  }, API_URL);
}

test("admin first: signing into the app keeps the admin session, and signing out of it too", async ({
  context,
}) => {
  const admin = await context.newPage();
  await signIn(admin, "/login", STAFF);
  expect(await adminUser(admin)).toBe(STAFF);

  const app = await context.newPage();
  await signIn(app, `${APP_URL}/login`, CUSTOMER);
  expect(await appUser(app)).toBe(CUSTOMER);

  // Each surface still sees its own user, and the admin UI survives a reload.
  expect(await adminUser(admin)).toBe(STAFF);
  await admin.reload();
  await expect(admin).not.toHaveURL(/\/login/);

  // Each session cookie belongs to its own host.
  const sessionCookieHosts = (await context.cookies())
    .filter((c) => c.name.endsWith("session_token"))
    .map((c) => c.domain)
    .sort();
  expect(sessionCookieHosts).toEqual(["admin.localhost", "localhost"]);

  // Signing out of the app leaves the admin signed in.
  await app.evaluate(async (api) => {
    await fetch(`${api}/api/v1/auth/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  }, API_URL);
  expect(await appUser(app)).toBeNull();
  expect(await adminUser(admin)).toBe(STAFF);
});

test("app first: signing into the admin keeps the app on its own user", async ({ context }) => {
  const app = await context.newPage();
  await signIn(app, `${APP_URL}/login`, CUSTOMER);

  const admin = await context.newPage();
  await signIn(admin, "/login", STAFF);

  expect(await appUser(app)).toBe(CUSTOMER);
  await app.reload();
  await expect(app).toHaveURL(/\/app/);
  await expect(app.getByText("Create your first business")).toHaveCount(0);
});
