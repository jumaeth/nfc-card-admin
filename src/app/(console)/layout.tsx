"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { StaffProvider, useSignOut } from "@/lib/staff";
import { ConsoleShell } from "@/components/console-shell";
import { Button, Card, Spinner } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <Spinner className="size-7" />
    </div>
  );
}

function Denied({ reason, message }: { reason: "forbidden" | "error"; message?: string }) {
  const { data: session } = useSession();
  const switchAccount = useSignOut();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-paper px-4 py-12">
      <Wordmark />
      <Card className="w-full max-w-md text-center">
        <ShieldOff className="mx-auto size-9 text-accent" />
        <h1 className="display mt-4 text-2xl text-ink">
          {reason === "forbidden" ? "No staff access" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {reason === "forbidden"
            ? `${session?.user.email ?? "This account"} has no staff role. Ask an admin to give you access.`
            : (message ?? "The console could not be loaded. Please try again.")}
        </p>
        <Button variant="outline" className="mt-6" onClick={switchAccount}>
          Use another account
        </Button>
      </Card>
    </main>
  );
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/login");
  }, [isPending, session, router]);

  if (isPending) return <FullScreenSpinner />;
  if (!session?.user) return null;

  return (
    <StaffProvider
      loading={<FullScreenSpinner />}
      denied={(reason, message) => <Denied reason={reason} message={message} />}
    >
      <ConsoleShell>{children}</ConsoleShell>
    </StaffProvider>
  );
}
