"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";

/** Invalidate everything that shows this customer after a change. */
export function useCustomerInvalidation(companyId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-customer", companyId] });
    queryClient.invalidateQueries({ queryKey: ["admin-customer-cards", companyId] });
    queryClient.invalidateQueries({ queryKey: ["admin-customer-pages", companyId] });
    queryClient.invalidateQueries({ queryKey: ["admin-customer-deleted-pages", companyId] });
    queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}
