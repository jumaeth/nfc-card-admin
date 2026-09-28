"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type {
  CustomerDetail,
  Plan,
  PlanTier,
  SalesRep,
  SubscriptionStatus,
} from "@/lib/types";
import {
  formatDate,
  INTERVAL_LABEL,
  isOpenEnded,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_TONE,
} from "@/lib/format";
import { formatChf } from "@/lib/utils";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { StatTile } from "@/components/bits";
import { errorMessage, useCustomerInvalidation } from "./shared";
import { LocationsCard } from "./locations-card";

export function OverviewTab({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Cards" value={customer._count.cards} />
        <StatTile label="Pages" value={customer._count.pages} />
        <StatTile label="Locations" value={customer._count.locations} />
        <StatTile label="Taps" value={customer.tapsLast30Days} hint="Last 30 days" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailsCard customer={customer} />
        <div className="space-y-6">
          <SubscriptionCard customer={customer} />
          <SalesRepCard customer={customer} />
        </div>
      </div>

      <LocationsCard customer={customer} />
    </div>
  );
}

function DetailsCard({ customer }: { customer: CustomerDetail }) {
  const invalidate = useCustomerInvalidation(customer.id);
  const [name, setName] = useState(customer.name);
  const [slug, setSlug] = useState(customer.slug);
  const [billingEmail, setBillingEmail] = useState(customer.billingEmail ?? "");
  const [brandColor, setBrandColor] = useState(customer.brandColor);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/companies/${customer.id}`, {
        name: name.trim(),
        slug: slug.trim(),
        billingEmail: billingEmail.trim() || null,
        brandColor,
      }),
    onSuccess: () => {
      setSaved(true);
      invalidate();
    },
  });

  const disabled = !customer.canManage;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    save.mutate();
  }

  return (
    <Card>
      <h2 className="display text-xl text-ink">Details</h2>
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <Field label="Business name">
          <Input value={name} disabled={disabled} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Slug" hint="Lowercase letters, digits and hyphens.">
          <Input value={slug} disabled={disabled} onChange={(e) => setSlug(e.target.value)} required />
        </Field>
        <Field label="Billing email">
          <Input
            type="email"
            value={billingEmail}
            disabled={disabled}
            onChange={(e) => setBillingEmail(e.target.value)}
            placeholder="billing@business.ch"
          />
        </Field>
        <Field label="Brand colour">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              disabled={disabled}
              onChange={(e) => setBrandColor(e.target.value)}
              className="size-11 shrink-0 cursor-pointer rounded-xl border border-line bg-white p-1 disabled:cursor-default"
              aria-label="Brand colour"
            />
            <Input value={brandColor} disabled={disabled} onChange={(e) => setBrandColor(e.target.value)} />
          </div>
        </Field>

        {save.error && (
          <p className="text-sm text-negative">{errorMessage(save.error, "Could not save.")}</p>
        )}
        {saved && !save.isPending && <p className="text-sm text-positive">Saved.</p>}

        {!disabled && (
          <Button type="submit" loading={save.isPending}>
            Save details
          </Button>
        )}
      </form>
    </Card>
  );
}

function SubscriptionCard({ customer }: { customer: CustomerDetail }) {
  const invalidate = useCustomerInvalidation(customer.id);
  const [editing, setEditing] = useState(false);
  const sub = customer.subscription;
  const stripeManaged = sub?.source === "STRIPE" && Boolean(sub.stripeSubscriptionId);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <h2 className="display text-xl text-ink">Plan</h2>
        {customer.canManage && !stripeManaged && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change
          </Button>
        )}
      </div>

      {editing ? (
        <SubscriptionForm
          customer={customer}
          onDone={() => {
            setEditing(false);
            invalidate();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : sub ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="display text-3xl text-ink">{sub.plan.name}</span>
            <Badge tone={SUBSCRIPTION_STATUS_TONE[sub.status]}>
              {SUBSCRIPTION_STATUS_LABEL[sub.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatChf(sub.plan.priceCents)} {INTERVAL_LABEL[sub.plan.interval]}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted">Billed via</dt>
              <dd className="font-semibold text-ink">
                {sub.source === "STRIPE" ? "Stripe" : sub.source === "MANUAL" ? "Set by staff" : "Default plan"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Runs until</dt>
              <dd className="font-semibold text-ink">
                {isOpenEnded(sub.currentPeriodEnd) ? "Open-ended" : formatDate(sub.currentPeriodEnd)}
              </dd>
            </div>
          </dl>
          {stripeManaged && (
            <p className="mt-4 text-xs text-muted">This plan is billed through Stripe. Change it there.</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">No plan assigned.</p>
      )}
      <PagesAccess customer={customer} />
    </Card>
  );
}

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "PAUSED", "CANCELLED"];

function SubscriptionForm({
  customer,
  onDone,
  onCancel,
}: {
  customer: CustomerDetail;
  onDone: () => void;
  onCancel: () => void;
}) {
  const sub = customer.subscription;
  const plans = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () => api.get<Plan[]>("/admin/plans"),
  });

  const [tier, setTier] = useState<PlanTier>(sub?.plan.tier ?? "STARTER");
  const [status, setStatus] = useState<SubscriptionStatus>(sub?.status ?? "ACTIVE");
  const [periodEnd, setPeriodEnd] = useState(
    sub && !isOpenEnded(sub.currentPeriodEnd) ? sub.currentPeriodEnd.slice(0, 10) : "",
  );

  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/companies/${customer.id}/subscription`, {
        tier,
        status,
        currentPeriodEnd: periodEnd || null,
      }),
    onSuccess: onDone,
  });

  return (
    <div className="mt-4 space-y-4">
      <Field label="Plan">
        <Select value={tier} onChange={(e) => setTier(e.target.value as PlanTier)}>
          {(plans.data ?? []).map((p) => (
            <option key={p.id} value={p.tier}>
              {p.name} ({formatChf(p.priceCents)} {INTERVAL_LABEL[p.interval]})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {SUBSCRIPTION_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Runs until" hint="Leave empty for open-ended.">
        <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
      </Field>
      {save.error && (
        <p className="text-sm text-negative">{errorMessage(save.error, "Could not change the plan.")}</p>
      )}
      <div className="flex gap-3">
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Save plan
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function SalesRepCard({ customer }: { customer: CustomerDetail }) {
  const { capabilities } = useStaff();
  const invalidate = useCustomerInvalidation(customer.id);
  const reps = useQuery({
    queryKey: ["admin-sales-reps"],
    queryFn: () => api.get<SalesRep[]>("/admin/sales-reps"),
    enabled: capabilities.assignsSalesReps,
  });

  const assign = useMutation({
    mutationFn: (salesRepId: string | null) =>
      api.put(`/admin/companies/${customer.id}/sales-rep`, { salesRepId }),
    onSuccess: invalidate,
  });

  // The current rep may have lost the SALES role; keep them selectable so the
  // select shows the truth until someone reassigns.
  const options = reps.data ?? [];
  const currentMissing =
    customer.salesRep && !options.some((r) => r.id === customer.salesRep?.id);

  return (
    <Card>
      <h2 className="display text-xl text-ink">Sales rep</h2>
      {capabilities.assignsSalesReps ? (
        <div className="mt-4 space-y-2">
          <Select
            value={customer.salesRepId ?? ""}
            disabled={assign.isPending || reps.isLoading}
            onChange={(e) => assign.mutate(e.target.value || null)}
            aria-label="Sales rep"
          >
            <option value="">Unassigned</option>
            {currentMissing && customer.salesRep && (
              <option value={customer.salesRep.id}>
                {customer.salesRep.name || customer.salesRep.email} (no longer sales)
              </option>
            )}
            {options.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || r.email}
              </option>
            ))}
          </Select>
          {assign.error && (
            <p className="text-sm text-negative">{errorMessage(assign.error, "Could not reassign.")}</p>
          )}
          <p className="text-xs text-muted">The rep manages this customer from their own console.</p>
        </div>
      ) : customer.salesRep ? (
        <div className="mt-4">
          <p className="font-semibold text-ink">{customer.salesRep.name}</p>
          <p className="text-sm text-muted">{customer.salesRep.email}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Unassigned</p>
      )}
    </Card>
  );
}

/**
 * Pages are live when the plan includes them. Otherwise they are kept but
 * read-only and offline, unless staff turn on the override here.
 */
function PagesAccess({ customer }: { customer: CustomerDetail }) {
  const invalidate = useCustomerInvalidation(customer.id);
  const inPlan = Boolean(customer.subscription?.plan.features.createPages);
  const toggle = useMutation({
    mutationFn: (pagesOverride: boolean) =>
      api.patch(`/admin/companies/${customer.id}`, { pagesOverride }),
    onSuccess: invalidate,
  });

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">Pages</p>
          <p className="mt-0.5 text-sm text-muted">
            {inPlan
              ? "Included in the plan."
              : customer.pagesOverride
                ? "Not in the plan, but turned on by staff. Pages are live and editable."
                : "Not in the plan. Pages are kept but offline, and their links open taplino.ch."}
          </p>
        </div>
        {!inPlan && customer.canManage && (
          <Button
            variant="outline"
            size="sm"
            loading={toggle.isPending}
            onClick={() => toggle.mutate(!customer.pagesOverride)}
          >
            {customer.pagesOverride ? "Turn off" : "Turn on"}
          </Button>
        )}
      </div>
      {toggle.error && (
        <p className="mt-2 text-sm text-negative">
          {errorMessage(toggle.error, "Could not change page access.")}
        </p>
      )}
    </div>
  );
}
