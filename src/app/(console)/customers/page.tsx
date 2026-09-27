"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { CustomerListItem, Paged, SalesRep } from "@/lib/types";
import {
  formatDate,
  slugify,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_TONE,
} from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { Badge, Button, EmptyState, Field, Input, Select, Spinner } from "@/components/ui";
import { CompanyMark, ErrorNote, Pagination, SearchInput, Table } from "@/components/bits";

const PAGE_SIZE = 25;

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <Customers />
    </Suspense>
  );
}

function Customers() {
  const router = useRouter();
  const params = useSearchParams();
  const { capabilities } = useStaff();

  const q = params.get("q") ?? "";
  const rep = params.get("rep") ?? "";
  const status = params.get("status") === "archived" ? "archived" : "active";
  const page = Number(params.get("page") ?? 1) || 1;

  // Filters live in the URL so a filtered list can be shared and survives reloads.
  const setParam = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || (k === "page" && v === 1)) next.delete(k);
        else next.set(k, String(v));
      }
      if (!("page" in updates)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/customers?${qs}` : "/customers");
    },
    [params, router],
  );

  const [creating, setCreating] = useState(false);

  const list = useQuery({
    queryKey: ["admin-customers", { q, rep, status, page }],
    queryFn: () =>
      api.get<Paged<CustomerListItem>>("/admin/companies", {
        q: q || undefined,
        salesRepId: rep || undefined,
        status,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const reps = useQuery({
    queryKey: ["admin-sales-reps"],
    queryFn: () => api.get<SalesRep[]>("/admin/sales-reps"),
    enabled: capabilities.seesAllCustomers,
  });

  const items = list.data?.items ?? [];
  const filtered = Boolean(q || rep || status === "archived");

  return (
    <div>
      <PageHeader
        eyebrow={capabilities.seesAllCustomers ? "All customers" : "Your customers"}
        title="Customers"
        description="Businesses using Taplino, their plan, cards and team."
        actions={
          capabilities.createsCustomers ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New customer
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          className="flex-1"
          value={q}
          onChange={(value) => setParam({ q: value })}
          placeholder="Search by name, slug or billing email"
        />
        {capabilities.seesAllCustomers && (
          <Select
            className="bg-white py-2.5 sm:w-52"
            value={rep}
            onChange={(e) => setParam({ rep: e.target.value })}
            aria-label="Sales rep"
          >
            <option value="">All sales reps</option>
            <option value="none">Unassigned</option>
            {reps.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.email}
              </option>
            ))}
          </Select>
        )}
        <Select
          className="bg-white py-2.5 sm:w-40"
          value={status}
          onChange={(e) => setParam({ status: e.target.value === "active" ? null : e.target.value })}
          aria-label="Status"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : list.error ? (
        <ErrorNote error={list.error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-10" />}
          title={filtered ? "No customers match" : "No customers yet"}
          description={
            filtered
              ? "Try a different search or filter."
              : capabilities.createsCustomers
                ? "Create a customer to start provisioning cards."
                : capabilities.seesAllCustomers
                  ? undefined
                  : "Customers assigned to you will show up here."
          }
        />
      ) : (
        <>
          <Table head={["Customer", "Plan", "Sales rep", "Cards", "Users", "Created"]}>
            {items.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer transition hover:bg-paper/60"
                onClick={() => router.push(`/customers/${c.id}`)}
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`/customers/${c.id}`}
                    className="flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CompanyMark name={c.name} color={c.brandColor} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{c.name}</span>
                      <span className="block truncate text-xs text-muted">{c.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  {c.subscription ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge>{c.subscription.plan.name}</Badge>
                      {c.subscription.status !== "ACTIVE" && (
                        <Badge tone={SUBSCRIPTION_STATUS_TONE[c.subscription.status]}>
                          {SUBSCRIPTION_STATUS_LABEL[c.subscription.status]}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted">None</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-soft">
                  {c.salesRep ? c.salesRep.name || c.salesRep.email : <span className="text-muted">Unassigned</span>}
                </td>
                <td className="px-5 py-3.5 tabular-nums">{c._count.cards}</td>
                <td className="px-5 py-3.5 tabular-nums">{c._count.members}</td>
                <td className="px-5 py-3.5 text-muted">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={list.data?.total ?? 0}
            onPage={(p) => setParam({ page: p })}
          />
        </>
      )}

      {creating && (
        <CreateCustomerModal
          reps={capabilities.assignsSalesReps ? (reps.data ?? []) : null}
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/customers/${id}`)}
        />
      )}
    </div>
  );
}

function CreateCustomerModal({
  reps,
  onClose,
  onCreated,
}: {
  /** null = this staff member cannot pick a rep (SALES owns what it creates). */
  reps: SalesRep[] | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [salesRepId, setSalesRepId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const create = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>("/admin/companies", {
        name: name.trim(),
        slug: effectiveSlug,
        ownerEmail: ownerEmail.trim() || undefined,
        salesRepId: reps && salesRepId ? salesRepId : undefined,
      }),
    onSuccess: (company) => onCreated(company.id),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not create the customer."),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="New customer"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={create.isPending}
            disabled={!name.trim() || effectiveSlug.length < 2}
            onClick={() => {
              setError(null);
              create.mutate();
            }}
          >
            Create customer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Business name">
          <Input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Café Baumann" />
        </Field>
        <Field label="Slug" hint="Used in the customer's public page URLs.">
          <Input
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="cafe-baumann"
          />
        </Field>
        <Field
          label="Owner email"
          hint="Optional. We email them an invitation to take over the account as owner."
        >
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@cafe-baumann.ch"
          />
        </Field>
        {reps ? (
          <Field label="Sales rep">
            <Select value={salesRepId} onChange={(e) => setSalesRepId(e.target.value)}>
              <option value="">Unassigned</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.email}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="rounded-2xl bg-paper-2 px-4 py-3 text-sm text-muted">
            The customer will be assigned to you.
          </p>
        )}
        {error && <p className="text-sm text-negative">{error}</p>}
      </div>
    </Modal>
  );
}
