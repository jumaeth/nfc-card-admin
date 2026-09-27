"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { Plan, PlanFeatures } from "@/lib/types";
import { INTERVAL_LABEL } from "@/lib/format";
import { formatChf } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { ErrorNote } from "@/components/bits";

const FEATURE_LABELS: { key: keyof PlanFeatures; label: string }[] = [
  { key: "createPages", label: "Create own pages" },
  { key: "analytics", label: "Tap analytics" },
  { key: "multiLocation", label: "Multiple locations" },
  { key: "unlimitedDestinationChanges", label: "Unlimited destination changes" },
  { key: "managed", label: "Managed by Taplino" },
];

export default function PlansPage() {
  const { capabilities } = useStaff();
  const [editing, setEditing] = useState<Plan | null>(null);

  const plans = useQuery({
    queryKey: ["admin-plans"],
    queryFn: () => api.get<Plan[]>("/admin/plans"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Plans"
        description="What each plan costs and unlocks. Changes apply to every customer on that plan."
      />

      {plans.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : plans.error ? (
        <ErrorNote error={plans.error} />
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {(plans.data ?? []).map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <span className="eyebrow text-accent">{plan.tier}</span>
              <h2 className="display mt-2 text-3xl text-ink">{plan.name}</h2>
              <p className="mt-2 text-sm text-muted">
                <span className="text-lg font-semibold text-ink">{formatChf(plan.priceCents)}</span>{" "}
                {INTERVAL_LABEL[plan.interval]}
              </p>

              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {FEATURE_LABELS.map((f) => {
                  const on = Boolean(plan.features[f.key]);
                  return (
                    <li key={f.key} className={on ? "flex gap-2 text-ink" : "flex gap-2 text-muted"}>
                      {on ? (
                        <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                      ) : (
                        <Minus className="mt-0.5 size-4 shrink-0" />
                      )}
                      {f.label}
                    </li>
                  );
                })}
                <li className="flex gap-2 text-ink">
                  <Check className="mt-0.5 size-4 shrink-0 text-positive" />
                  {plan.features.maxLocations == null
                    ? "Unlimited locations"
                    : `Up to ${plan.features.maxLocations} location${plan.features.maxLocations === 1 ? "" : "s"}`}
                </li>
              </ul>

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
                <span className="text-muted">
                  <span className="font-semibold text-ink tabular-nums">{plan._count?.subscriptions ?? 0}</span>{" "}
                  customers
                </span>
                {capabilities.managesPlans && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(plan)}>
                    Edit
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <EditPlanModal plan={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditPlanModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(plan.name);
  const [price, setPrice] = useState((plan.priceCents / 100).toFixed(2));
  const [stripePriceId, setStripePriceId] = useState(plan.stripePriceId ?? "");
  const [features, setFeatures] = useState<PlanFeatures>(plan.features);
  const [maxLocations, setMaxLocations] = useState(
    plan.features.maxLocations == null ? "" : String(plan.features.maxLocations),
  );

  const priceCents = Math.round(Number(price) * 100);
  const validPrice = Number.isFinite(priceCents) && priceCents >= 0;

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/plans/${plan.id}`, {
        name: name.trim(),
        priceCents,
        stripePriceId: stripePriceId.trim() || null,
        features: {
          ...features,
          maxLocations: maxLocations.trim() === "" ? null : Math.max(1, Number(maxLocations)),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${plan.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} disabled={!name.trim() || !validPrice} onClick={() => save.mutate()}>
            Save plan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (CHF)" hint={INTERVAL_LABEL[plan.interval]}>
            <Input
              type="number"
              min="0"
              step="0.05"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Max locations" hint="Empty for unlimited.">
            <Input
              type="number"
              min="1"
              value={maxLocations}
              onChange={(e) => setMaxLocations(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Stripe price ID" hint="Optional. Used for self-serve checkout.">
          <Input
            value={stripePriceId}
            onChange={(e) => setStripePriceId(e.target.value)}
            placeholder="price_..."
          />
        </Field>
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-ink">Features</span>
          {FEATURE_LABELS.map((f) => (
            <label key={f.key} className="flex items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4 accent-[var(--color-accent)]"
                checked={Boolean(features[f.key])}
                onChange={(e) => setFeatures({ ...features, [f.key]: e.target.checked })}
              />
              {f.label}
            </label>
          ))}
        </div>
        {save.error && (
          <p className="text-sm text-negative">
            {save.error instanceof ApiError ? save.error.message : "Could not save the plan."}
          </p>
        )}
      </div>
    </Modal>
  );
}
