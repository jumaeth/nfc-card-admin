"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { authClient } from "./auth-client";
import type { StaffMe } from "./types";

interface StaffContextValue extends StaffMe {
  refetch: () => void;
}

const StaffContext = createContext<StaffContextValue | null>(null);

/**
 * Loads the signed-in staff member and their capabilities from /admin/me.
 * Renders `fallback(error)` while loading or when the account has no staff role,
 * so console pages can always rely on `useStaff()`.
 */
export function StaffProvider({
  children,
  loading,
  denied,
}: {
  children: ReactNode;
  loading: ReactNode;
  denied: (reason: "forbidden" | "error", message?: string) => ReactNode;
}) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["admin-me"],
    queryFn: () => api.get<StaffMe>("/admin/me"),
  });

  if (isLoading) return <>{loading}</>;
  if (error || !data) {
    const forbidden = error instanceof ApiError && error.status === 403;
    return <>{denied(forbidden ? "forbidden" : "error", error?.message)}</>;
  }

  return <StaffContext.Provider value={{ ...data, refetch }}>{children}</StaffContext.Provider>;
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}

/** Signs out and drops every cached query, so the next account starts clean. */
export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await authClient.signOut();
    queryClient.clear();
    router.push("/login");
  };
}
