"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { AdminOrder, OrderStatus } from "@/lib/types";
import { formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/format";
import { formatChf } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge, EmptyState, Select, Spinner } from "@/components/ui";
import { ErrorNote, SearchInput, Table } from "@/components/bits";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <Orders />
    </Suspense>
  );
}

function Orders() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useStaff();

  const q = params.get("q") ?? "";
  const rawStatus = params.get("status") ?? "";
  const status = STATUSES.includes(rawStatus as OrderStatus) ? rawStatus : "";
  const rawHandler = params.get("handler") ?? "";
  const handler = rawHandler === "me" || rawHandler === "none" ? rawHandler : "";

  // Filters live in the URL so a filtered list can be shared and survives reloads.
  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (!v) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `/orders?${qs}` : "/orders");
    },
    [params, router],
  );

  const list = useQuery({
    queryKey: ["admin-orders", { q, status, handler }],
    queryFn: () =>
      api.get<AdminOrder[]>("/admin/orders", {
        q: q || undefined,
        status: status || undefined,
        handler: handler || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const orders = list.data ?? [];
  const filtered = Boolean(q || status || handler);

  return (
    <div>
      <PageHeader
        eyebrow="Shop"
        title="Orders"
        description="Card orders from the website and the app. Claim an order to fulfil it; you become that customer's sales rep."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          className="flex-1"
          value={q}
          onChange={(value) => setParam({ q: value })}
          placeholder="Search by number, name, email or business"
        />
        <Select
          className="bg-white py-2.5 sm:w-52"
          value={status}
          onChange={(e) => setParam({ status: e.target.value })}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          className="bg-white py-2.5 sm:w-44"
          value={handler}
          onChange={(e) => setParam({ handler: e.target.value })}
          aria-label="Claimed by"
        >
          <option value="">Everyone&apos;s</option>
          <option value="none">Unclaimed</option>
          <option value="me">Claimed by me</option>
        </Select>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : list.error ? (
        <ErrorNote error={list.error} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="size-10" />}
          title={filtered ? "No orders match" : "No orders yet"}
          description={
            filtered
              ? "Try a different search or status."
              : "Orders placed on the website or in the app show up here."
          }
        />
      ) : (
        <Table head={["Order", "Customer", "Business", "Items", "Total", "Claimed by", "Status"]}>
          {orders.map((o) => (
            <tr
              key={o.id}
              className="cursor-pointer align-top transition hover:bg-paper/60"
              onClick={() => router.push(`/orders/${o.id}`)}
            >
              <td className="px-5 py-3.5">
                <Link
                  href={`/orders/${o.id}`}
                  className="block font-semibold text-ink tabular-nums"
                  onClick={(e) => e.stopPropagation()}
                >
                  {o.number}
                </Link>
                <span className="block text-xs text-muted">{formatDate(o.createdAt)}</span>
              </td>
              <td className="px-5 py-3.5">
                <span className="block truncate font-semibold text-ink">{o.customerName}</span>
                <span className="block truncate text-xs text-muted">{o.email}</span>
              </td>
              <td className="px-5 py-3.5">
                {o.companyId ? (
                  <Link
                    href={`/customers/${o.companyId}`}
                    className="font-semibold text-ink hover:text-accent"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {o.companyNameInApp ?? o.companyName ?? "Linked"}
                  </Link>
                ) : (
                  <span className="text-muted">Not linked yet</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-ink-soft">
                {o.items.map((i) => (
                  <span key={i.id} className="block whitespace-nowrap">
                    <span className="tabular-nums">{i.quantity} x</span> {i.productName}
                  </span>
                ))}
              </td>
              <td className="px-5 py-3.5 font-semibold whitespace-nowrap text-ink tabular-nums">
                {formatChf(o.totalCents)}
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                {o.handledBy ? (
                  <span className="text-ink">{o.handledBy.id === user.id ? "You" : o.handledBy.name}</span>
                ) : (
                  <span className="text-muted">Unclaimed</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
