"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { AdminUserDetail, PlatformRole } from "@/lib/types";
import {
  COMPANY_ROLE_LABEL,
  formatDate,
  PLATFORM_ROLE_HINT,
  PLATFORM_ROLE_LABEL,
  PLATFORM_ROLE_TONE,
} from "@/lib/format";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import { Avatar, ErrorNote } from "@/components/bits";
import { cn } from "@/lib/utils";

const ROLES = Object.keys(PLATFORM_ROLE_LABEL) as PlatformRole[];

export default function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const detail = useQuery({
    queryKey: ["admin-user", id],
    queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`),
  });

  return (
    <div>
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Users
      </Link>

      {detail.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : detail.error || !detail.data ? (
        <div className="mt-6">
          <ErrorNote error={detail.error ?? new Error("User not found")} />
        </div>
      ) : (
        <UserDetail user={detail.data} />
      )}
    </div>
  );
}

function UserDetail({ user }: { user: AdminUserDetail }) {
  return (
    <>
      <div className="mt-4 mb-8 flex items-center gap-4">
        <Avatar name={user.name || user.email} url={user.avatarUrl} />
        <div className="min-w-0">
          <span className="eyebrow text-accent">User</span>
          <h1 className="display mt-1 truncate text-3xl text-ink sm:text-4xl">
            {user.name || user.email}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{user.email}</span>
            <span>·</span>
            <span>Joined {formatDate(user.createdAt)}</span>
            <Badge tone={PLATFORM_ROLE_TONE[user.platformRole]}>
              {PLATFORM_ROLE_LABEL[user.platformRole]}
            </Badge>
            {user.deletedAt && <Badge tone="muted">Archived</Badge>}
            {!user.emailVerified && <Badge tone="muted">Unverified</Badge>}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-0">
            <h2 className="display px-6 pt-6 text-xl text-ink">Businesses</h2>
            {user.companyMembers.length === 0 ? (
              <p className="px-6 pt-2 pb-6 text-sm text-muted">Not a member of any business.</p>
            ) : (
              <div className="mt-4 divide-y divide-line border-t border-line">
                {user.companyMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/customers/${m.company.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-paper/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{m.company.name}</span>
                      <span className="block truncate text-xs text-muted">{m.company.slug}</span>
                    </span>
                    <span className="flex shrink-0 gap-1.5">
                      {(m.company.deletedAt || m.deactivatedAt) && <Badge tone="muted">Inactive</Badge>}
                      <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>
                        {COMPANY_ROLE_LABEL[m.role]}
                      </Badge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {(user.platformRole === "SALES" || user.salesCustomers.length > 0) && (
            <Card className="p-0">
              <h2 className="display px-6 pt-6 text-xl text-ink">Assigned customers</h2>
              {user.salesCustomers.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No customers assigned" />
                </div>
              ) : (
                <div className="mt-4 divide-y divide-line border-t border-line">
                  {user.salesCustomers.map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="block px-6 py-4 font-semibold text-ink transition hover:bg-paper/60"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <RoleCard user={user} />
          <Card>
            <h2 className="display text-xl text-ink">Security</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Passkeys</dt>
                <dd className="font-semibold text-ink tabular-nums">{user._count.passkeys}</dd>
              </div>
              <div>
                <dt className="text-muted">Sessions</dt>
                <dd className="font-semibold text-ink tabular-nums">{user._count.sessions}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

function RoleCard({ user }: { user: AdminUserDetail }) {
  const staff = useStaff();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<PlatformRole>(user.platformRole);
  const [notice, setNotice] = useState<string | null>(null);

  const isSelf = staff.user.id === user.id;
  const canEdit = staff.capabilities.managesUsers && !isSelf;

  const save = useMutation({
    mutationFn: () =>
      api.patch<{ assignedCustomers: number }>(`/admin/users/${user.id}/role`, {
        platformRole: role,
      }),
    onSuccess: (res) => {
      setNotice(
        res.assignedCustomers > 0
          ? `Saved. ${res.assignedCustomers} customer${res.assignedCustomers === 1 ? " is" : "s are"} still assigned to them. Reassign from each customer page.`
          : "Saved.",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-user", user.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-reps"] });
    },
  });

  return (
    <Card>
      <h2 className="display text-xl text-ink">Console role</h2>
      <div className="mt-4 space-y-2">
        {ROLES.map((r) => {
          const disabled = !canEdit;
          return (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                role === r ? "border-accent bg-accent-soft/50" : "border-line",
                disabled && "cursor-default opacity-60",
              )}
            >
              <input
                type="radio"
                name="platformRole"
                className="mt-1 accent-[var(--color-accent)]"
                checked={role === r}
                disabled={disabled}
                onChange={() => {
                  setRole(r);
                  setNotice(null);
                }}
              />
              <span>
                <span className="block text-sm font-semibold text-ink">{PLATFORM_ROLE_LABEL[r]}</span>
                <span className="block text-xs text-muted">{PLATFORM_ROLE_HINT[r]}</span>
              </span>
            </label>
          );
        })}
      </div>

      {save.error && (
        <p className="mt-4 text-sm text-negative">
          {save.error instanceof ApiError ? save.error.message : "Could not change the role."}
        </p>
      )}
      {notice && <p className="mt-4 text-sm text-positive">{notice}</p>}

      {canEdit ? (
        <Button
          className="mt-5"
          loading={save.isPending}
          disabled={role === user.platformRole}
          onClick={() => save.mutate()}
        >
          Save role
        </Button>
      ) : (
        <p className="mt-4 text-xs text-muted">
          {isSelf ? "You cannot change your own role." : "Only super admins can change roles."}
        </p>
      )}
    </Card>
  );
}
