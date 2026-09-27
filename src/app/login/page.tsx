"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button, Card, Field, Input } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

// Dev-only convenience: prefill the form with the backend's seeded dev user
// (nfc-card-backend `pnpm db:seed:dev`, a super admin), overridable via .env.local. Gated on NODE_ENV so the values are
// stripped from production bundles.
const DEV_EMAIL =
  process.env.NODE_ENV === "development"
    ? (process.env.NEXT_PUBLIC_DEV_LOGIN_EMAIL ?? "dev@taplino.ch")
    : "";
const DEV_PASSWORD =
  process.env.NODE_ENV === "development"
    ? (process.env.NEXT_PUBLIC_DEV_LOGIN_PASSWORD ?? "taplino-dev")
    : "";

// Dev-only: one seeded account per staff role (nfc-card-backend
// `pnpm db:seed:dev`). Empty outside `next dev`, so neither the emails nor the
// password ship.
const DEV_ACCOUNTS =
  process.env.NODE_ENV === "development"
    ? [
        { email: "superadmin@taplino.ch", label: "Super admin", hint: "Everything, incl. super admins" },
        { email: "admin@taplino.ch", label: "Admin", hint: "Every customer, roles, plans" },
        { email: "support@taplino.ch", label: "Support", hint: "Every customer, read-only" },
        { email: "sales@taplino.ch", label: "Sales", hint: "Bistro Pro, Hotel Managed" },
      ].map((a) => ({ ...a, password: "taplino-dev" }))
    : [];

function DevAccounts({
  current,
  onPick,
}: {
  current: string;
  onPick: (account: (typeof DEV_ACCOUNTS)[number]) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-line p-3">
      <p className="eyebrow px-1 text-muted">Dev accounts</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {DEV_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => onPick(a)}
            className={cn(
              "rounded-xl border px-3 py-2 text-left transition hover:border-accent",
              current === a.email ? "border-accent bg-accent-soft/60" : "border-line bg-white",
            )}
          >
            <span className="block text-sm font-semibold text-ink">{a.label}</span>
            <span className="block truncate text-xs text-muted">{a.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(DEV_EMAIL);
  const [password, setPassword] = useState(DEV_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"password" | "passkey" | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("password");
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(null);
    if (error) {
      setError(error.message ?? "Could not sign in. Please try again.");
      return;
    }
    queryClient.clear();
    router.push("/");
  }

  async function signInWithPasskey() {
    setError(null);
    setLoading("passkey");
    const result = await authClient.signIn.passkey();
    setLoading(null);
    if (result?.error) {
      setError(result.error.message ?? "Passkey sign-in was cancelled.");
      return;
    }
    queryClient.clear();
    router.push("/");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-paper px-4 py-12">
      <Wordmark />
      <Card className="w-full max-w-md">
        <span className="eyebrow text-accent">Staff only</span>
        <h1 className="display mt-2 text-2xl text-ink">Sign in to the console</h1>
        <p className="mt-1.5 text-sm text-muted">
          Use your Taplino account. What you can see depends on your staff role.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@taplino.ch"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>

          {error && <p className="text-sm text-negative">{error}</p>}

          <Button type="submit" loading={loading === "password"} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button
          variant="outline"
          className="w-full"
          loading={loading === "passkey"}
          onClick={signInWithPasskey}
        >
          <KeyRound className="size-4" />
          Sign in with a passkey
        </Button>

        {DEV_ACCOUNTS.length > 0 && (
          <DevAccounts
            current={email}
            onPick={(account) => {
              setEmail(account.email);
              setPassword(account.password);
              setError(null);
            }}
          />
        )}
      </Card>
    </main>
  );
}
