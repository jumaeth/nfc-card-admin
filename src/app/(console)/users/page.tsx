"use client";

import { Suspense, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, Paged, PlatformRole } from "@/lib/types";
import { formatDate, PLATFORM_ROLE_LABEL, PLATFORM_ROLE_TONE } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Badge, EmptyState, Select, Spinner } from "@/components/ui";
import { Avatar, ErrorNote, Pagination, SearchInput, Table } from "@/components/bits";

const PAGE_SIZE = 25;
const STAFF_ROLES = (Object.keys(PLATFORM_ROLE_LABEL) as PlatformRole[]).filter((r) => r !== "USER");

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <UsersList />
    </Suspense>
  );
}

function UsersList() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const staffRole = params.get("role") ?? "";
  const staffPage = Number(params.get("staffPage") ?? 1) || 1;
  const page = Number(params.get("page") ?? 1) || 1;

  const setParam = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || ((k === "page" || k === "staffPage") && v === 1)) next.delete(k);
        else next.set(k, String(v));
      }
      // A new search resets both tables; a role change resets the staff table.
      if ("q" in updates) {
        next.delete("page");
        next.delete("staffPage");
      }
      if ("role" in updates) next.delete("staffPage");
      const qs = next.toString();
      router.replace(qs ? `/users?${qs}` : "/users");
    },
    [params, router],
  );

  const staff = useUsers({ q, role: staffRole || "STAFF", page: staffPage });
  const appUsers = useUsers({ q, role: "USER", page });

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        description="Staff with console access, and everyone using the Taplino app."
      />

      <SearchInput
        className="mb-8"
        value={q}
        onChange={(value) => setParam({ q: value })}
        placeholder="Search by name or email"
      />

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="display text-xl text-ink">Staff</h2>
          <Select
            className="bg-white py-2.5 sm:w-52"
            value={staffRole}
            onChange={(e) => setParam({ role: e.target.value })}
            aria-label="Staff role"
          >
            <option value="">All staff</option>
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {PLATFORM_ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
        <UserTable
          query={staff}
          page={staffPage}
          onPage={(p) => setParam({ staffPage: p })}
          empty={<EmptyState icon={<ShieldCheck className="size-10" />} title="No staff match" />}
          head={["User", "Role", "Customers", "Joined"]}
          row={(u) => (
            <>
              <td className="px-5 py-3.5">
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone={PLATFORM_ROLE_TONE[u.platformRole]}>
                    {PLATFORM_ROLE_LABEL[u.platformRole]}
                  </Badge>
                  <StatusBadges user={u} />
                </span>
              </td>
              <td className="px-5 py-3.5 tabular-nums">
                {u.platformRole === "SALES" || u._count.salesCustomers > 0 ? (
                  u._count.salesCustomers
                ) : (
                  <span className="text-muted">·</span>
                )}
              </td>
            </>
          )}
        />
      </section>

      <section className="mt-12">
        <h2 className="display mb-4 text-xl text-ink">App users</h2>
        <UserTable
          query={appUsers}
          page={page}
          onPage={(p) => setParam({ page: p })}
          empty={<EmptyState icon={<Users className="size-10" />} title="No app users match" />}
          head={["User", "Status", "Businesses", "Joined"]}
          row={(u) => (
            <>
              <td className="px-5 py-3.5">
                <span className="flex flex-wrap gap-1.5">
                  {u.deletedAt || !u.emailVerified ? (
                    <StatusBadges user={u} />
                  ) : (
                    <Badge tone="positive">Active</Badge>
                  )}
                </span>
              </td>
              <td className="px-5 py-3.5 tabular-nums">{u._count.companyMembers}</td>
            </>
          )}
        />
      </section>
    </div>
  );
}

function useUsers({ q, role, page }: { q: string; role: string; page: number }) {
  return useQuery({
    queryKey: ["admin-users", { q, role, page }],
    queryFn: () =>
      api.get<Paged<AdminUser>>("/admin/users", {
        q: q || undefined,
        role,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
}

function StatusBadges({ user }: { user: AdminUser }) {
  return (
    <>
      {user.deletedAt && <Badge tone="muted">Archived</Badge>}
      {!user.emailVerified && <Badge tone="muted">Unverified</Badge>}
    </>
  );
}

/** Shared shell for both tables: the user cell, the joined date and paging. */
function UserTable({
  query,
  page,
  onPage,
  empty,
  head,
  row,
}: {
  query: ReturnType<typeof useUsers>;
  page: number;
  onPage: (page: number) => void;
  empty: ReactNode;
  head: string[];
  row: (user: AdminUser) => ReactNode;
}) {
  const router = useRouter();
  const items = query.data?.items ?? [];

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (query.error) return <ErrorNote error={query.error} />;
  if (items.length === 0) return empty;

  return (
    <>
      <Table head={head}>
        {items.map((u) => (
          <tr
            key={u.id}
            className="cursor-pointer transition hover:bg-paper/60"
            onClick={() => router.push(`/users/${u.id}`)}
          >
            <td className="px-5 py-3.5">
              <Link
                href={`/users/${u.id}`}
                className="flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar name={u.name || u.email} url={u.avatarUrl} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{u.name || u.email}</span>
                  <span className="block truncate text-xs text-muted">{u.email}</span>
                </span>
              </Link>
            </td>
            {row(u)}
            <td className="px-5 py-3.5 text-muted">{formatDate(u.createdAt)}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={onPage} />
    </>
  );
}
