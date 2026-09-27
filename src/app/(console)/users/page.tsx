"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser, Paged, PlatformRole } from "@/lib/types";
import { formatDate, PLATFORM_ROLE_LABEL, PLATFORM_ROLE_TONE } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Badge, EmptyState, Select, Spinner } from "@/components/ui";
import { Avatar, ErrorNote, Pagination, SearchInput, Table } from "@/components/bits";

const PAGE_SIZE = 25;
const ROLES = Object.keys(PLATFORM_ROLE_LABEL) as PlatformRole[];

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
  const role = params.get("role") ?? "";
  const page = Number(params.get("page") ?? 1) || 1;

  const setParam = useCallback(
    (updates: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "" || (k === "page" && v === 1)) next.delete(k);
        else next.set(k, String(v));
      }
      if (!("page" in updates)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/users?${qs}` : "/users");
    },
    [params, router],
  );

  const list = useQuery({
    queryKey: ["admin-users", { q, role, page }],
    queryFn: () =>
      api.get<Paged<AdminUser>>("/admin/users", {
        q: q || undefined,
        role: role || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const items = list.data?.items ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Accounts"
        title="Users"
        description="Everyone with a Taplino account, including staff and their console roles."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          className="flex-1"
          value={q}
          onChange={(value) => setParam({ q: value })}
          placeholder="Search by name or email"
        />
        <Select
          className="bg-white py-2.5 sm:w-52"
          value={role}
          onChange={(e) => setParam({ role: e.target.value })}
          aria-label="Role"
        >
          <option value="">All users</option>
          <option value="STAFF">All staff</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {PLATFORM_ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : list.error ? (
        <ErrorNote error={list.error} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Users className="size-10" />} title="No users match" />
      ) : (
        <>
          <Table head={["User", "Role", "Businesses", "Customers", "Joined"]}>
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
                <td className="px-5 py-3.5">
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={PLATFORM_ROLE_TONE[u.platformRole]}>
                      {PLATFORM_ROLE_LABEL[u.platformRole]}
                    </Badge>
                    {u.deletedAt && <Badge tone="muted">Archived</Badge>}
                    {!u.emailVerified && <Badge tone="muted">Unverified</Badge>}
                  </span>
                </td>
                <td className="px-5 py-3.5 tabular-nums">{u._count.companyMembers}</td>
                <td className="px-5 py-3.5 tabular-nums">
                  {u.platformRole === "SALES" || u._count.salesCustomers > 0 ? (
                    u._count.salesCustomers
                  ) : (
                    <span className="text-muted">·</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-muted">{formatDate(u.createdAt)}</td>
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
    </div>
  );
}
