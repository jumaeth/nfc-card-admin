# Taplino admin console conventions

- **Staff-only surface.** Everything goes through `/api/v1/admin/*`. Access is decided
  server-side by `User.platformRole` (SALES < SUPPORT < ADMIN < SUPER_ADMIN). The UI
  only hides what the API would refuse anyway: read `useStaff().capabilities` and
  `customer.canManage`, never re-derive permissions from the role in the client.
- **Design language** matches the app and marketing site: `bg-paper`, `text-ink`,
  orange `accent`, `display` headings, `rounded-card`, pill buttons, `eyebrow` labels.
  `src/components/ui.tsx`, `modal.tsx` and `page-header.tsx` are copies of the app's;
  keep them in sync when either side changes.
- **Page builders are copied from the app, never edited here.** `components/builders/*`,
  `components/localized-input.tsx`, `components/ui.tsx`, `lib/page-content.ts`, `lib/i18n.ts`
  and `lib/utils.ts` come from nfc-card-app. Change them there, then run
  `pnpm sync:builders` here (`--check` reports drift).
- **Data** goes through `@/lib/api` and `@tanstack/react-query`. Query keys start with
  `admin-`. After a customer mutation call `useCustomerInvalidation(companyId)`.
- **Auth** via `@/lib/auth-client` (better-auth, same accounts as the app). Sign out
  with `useSignOut()` so the query cache is cleared between accounts.
- **Copy:** never use the em dash character in user-facing text. Use a period or
  comma, or rewrite the sentence.
- **Git:** never commit or push unless explicitly asked in the current request.
