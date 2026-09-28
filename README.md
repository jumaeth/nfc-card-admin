# Taplino admin

Internal console for Taplino staff. Next.js 16 (App Router, React 19) + Tailwind v4,
same design language and backend as the customer app (`nfc-card-app`).

## Roles

Staff access comes from `User.platformRole` in the backend. Every rule is enforced by
the API (`/api/v1/admin/*`); the console only mirrors it.

| Role          | Customers                     | Users            | Plans |
|---------------|-------------------------------|------------------|-------|
| `SALES`       | Own customers: view + manage, can create (assigned to self) | none | view |
| `SUPPORT`     | All customers, read-only      | view             | view  |
| `ADMIN`       | All customers: manage, assign sales reps, archive | view | edit |
| `SUPER_ADMIN` | Like ADMIN | view, change roles | edit |

A customer (company) belongs to a sales rep via `Company.salesRepId`. Unassigned
customers are only visible to SUPPORT and above.

"Manage" covers: company details, plan and status (manual subscription), members and
invitations (including OWNER), cards (provision, status, destination, delete) and
publishing pages. Page content itself is edited by the customer in the app.

## Local setup

```bash
cp .env.local.example .env.local   # API_URL -> backend
pnpm install
pnpm dev                           # http://admin.localhost:3312
```

The console proxies `/api/v1` to the backend, so its session cookie belongs to the
admin host and stays separate from the customer app's. That only works on a
different hostname (cookies ignore ports), which is why dev runs on
`admin.localhost`; plain `localhost:3312` redirects there.

### Dev logins

`pnpm db:seed:dev` in the backend seeds one account per staff role. In `pnpm dev`
the login form is prefilled with `dev@taplino.ch` and shows a **Dev accounts**
picker to switch roles. Password for all: `taplino-dev`.

| Email                   | Role        | Sees |
|-------------------------|-------------|------|
| `superadmin@taplino.ch` | Super admin | Everything, including user roles |
| `admin@taplino.ch`      | Admin       | Every customer, plans |
| `support@taplino.ch`    | Support     | Every customer, read-only |
| `sales@taplino.ch`      | Sales       | Only Bistro Pro and Hotel Managed (its assigned customers) |
| `dev@taplino.ch`        | Super admin | Default prefill; also a Starter customer in the app |

The customer accounts from the app (`starter@`, `pro@`, `managed@`) have no staff
role and get the "No staff access" screen here. The prefill and picker exist only
under `next dev`; production builds contain neither the emails nor the password.

### Granting staff roles

Outside dev, the first staff account has to be granted from the backend, because
only a SUPER_ADMIN can hand out roles in the console:

```bash
cd ../nfc-card-backend
pnpm staff:grant you@taplino.ch SUPER_ADMIN   # the user must have signed up already
```

## Deploying

Add the console's origin (e.g. `https://admin.taplino.ch`) to the backend's
`FRONTEND_URL` **after** the app origin. `FRONTEND_URL` drives CORS and trusted auth
origins, and its first entry is used for links in emails (verification, invitations).
Add it to `PASSKEY_ORIGINS` too if staff sign in with passkeys.
