"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Mail, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { CompanyRole, CustomerDetail, Member } from "@/lib/types";
import { COMPANY_ROLE_LABEL, formatDate } from "@/lib/format";
import { ConfirmDialog, Modal } from "@/components/modal";
import { Badge, Button, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { Avatar, ErrorNote } from "@/components/bits";
import { errorMessage, useCustomerInvalidation } from "./shared";

const ROLES: CompanyRole[] = ["OWNER", "ADMIN", "MEMBER"];

export function TeamTab({ customer }: { customer: CustomerDetail }) {
  const { capabilities } = useStaff();
  const invalidate = useCustomerInvalidation(customer.id);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const canManage = customer.canManage;

  const changeRole = useMutation({
    mutationFn: (vars: { userId: string; role: CompanyRole }) =>
      api.patch(`/admin/companies/${customer.id}/members/${vars.userId}`, { role: vars.role }),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/companies/${customer.id}/members/${userId}`),
    onSuccess: () => {
      setRemoving(null);
      invalidate();
    },
  });

  const cancelInvite = useMutation({
    mutationFn: (invitationId: string) =>
      api.delete(`/admin/companies/${customer.id}/invitations/${invitationId}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          People who can sign in to this business in the Taplino app.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setInviting(true)}>
            <Plus className="size-4" />
            Invite
          </Button>
        )}
      </div>

      <ErrorNote error={changeRole.error} />

      {customer.members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title="No members yet"
          description={
            customer.invitations.length > 0
              ? "The invitation below is still waiting to be accepted."
              : "Invite the owner so they can sign in and manage their cards."
          }
        />
      ) : (
        <Card className="divide-y divide-line p-0">
          {customer.members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={m.user.name || m.user.email} url={m.user.avatarUrl} />
                <div className="min-w-0">
                  {capabilities.viewsUsers ? (
                    <Link
                      href={`/users/${m.user.id}`}
                      className="block truncate font-semibold text-ink hover:text-accent"
                    >
                      {m.user.name || m.user.email}
                    </Link>
                  ) : (
                    <p className="truncate font-semibold text-ink">{m.user.name || m.user.email}</p>
                  )}
                  <p className="truncate text-sm text-muted">
                    {m.user.email} · joined {formatDate(m.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <Select
                    className="w-32 py-2"
                    value={m.role}
                    disabled={changeRole.isPending}
                    onChange={(e) =>
                      changeRole.mutate({ userId: m.user.id, role: e.target.value as CompanyRole })
                    }
                    aria-label="Role"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {COMPANY_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone={m.role === "OWNER" ? "accent" : "neutral"}>
                    {COMPANY_ROLE_LABEL[m.role]}
                  </Badge>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setRemoving(m)}
                    className="rounded-full p-2 text-muted transition hover:bg-ink/5 hover:text-negative"
                    aria-label="Remove member"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {customer.invitations.length > 0 && (
        <div>
          <h2 className="display mb-4 text-xl text-ink">Pending invitations</h2>
          <Card className="divide-y divide-line p-0">
            {customer.invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-2 text-muted">
                    <Mail className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{inv.email}</p>
                    <p className="text-sm text-muted">
                      {COMPANY_ROLE_LABEL[inv.role]} · code {inv.code} · expires {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={cancelInvite.isPending && cancelInvite.variables === inv.id}
                    onClick={() => cancelInvite.mutate(inv.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {inviting && (
        <InviteModal
          companyId={customer.id}
          hasOwner={customer.members.some((m) => m.role === "OWNER")}
          onClose={() => setInviting(false)}
          onSent={() => {
            setInviting(false);
            invalidate();
          }}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => {
          setRemoving(null);
          removeMember.reset();
        }}
        onConfirm={() => removing && removeMember.mutate(removing.user.id)}
        loading={removeMember.isPending}
        confirmLabel="Remove"
        title="Remove member"
        description={
          removeMember.error
            ? errorMessage(removeMember.error, "Could not remove this member.")
            : `Remove ${removing?.user.name || removing?.user.email} from ${customer.name}? They lose access immediately.`
        }
      />
    </div>
  );
}

function InviteModal({
  companyId,
  hasOwner,
  onClose,
  onSent,
}: {
  companyId: string;
  hasOwner: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>(hasOwner ? "MEMBER" : "OWNER");

  const send = useMutation({
    mutationFn: () =>
      api.post(`/admin/companies/${companyId}/invitations`, { email: email.trim(), role }),
    onSuccess: onSent,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Invite to this business"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={send.isPending} disabled={!email.trim()} onClick={() => send.mutate()}>
            Send invite
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@business.ch"
          />
        </Field>
        <Field
          label="Role"
          hint="Owners and admins manage cards, pages and the team. Owners also handle billing."
        >
          <Select value={role} onChange={(e) => setRole(e.target.value as CompanyRole)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {COMPANY_ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        {send.error && (
          <p className="text-sm text-negative">{errorMessage(send.error, "Could not send the invitation.")}</p>
        )}
      </div>
    </Modal>
  );
}
