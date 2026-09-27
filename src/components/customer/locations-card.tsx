"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CustomerDetail, Location } from "@/lib/types";
import { ConfirmDialog, Modal } from "@/components/modal";
import { Button, Card, Field, Input } from "@/components/ui";
import { errorMessage, useCustomerInvalidation } from "./shared";

interface LocationForm {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  googleReviewUrl: string;
  isDefault: boolean;
}

function toForm(loc?: Location): LocationForm {
  return {
    name: loc?.name ?? "",
    address: loc?.address ?? "",
    city: loc?.city ?? "",
    postalCode: loc?.postalCode ?? "",
    country: loc?.country || "CH",
    googleReviewUrl: loc?.googleReviewUrl ?? "",
    isDefault: loc?.isDefault ?? false,
  };
}

function toPayload(form: LocationForm) {
  return {
    name: form.name.trim(),
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    postalCode: form.postalCode.trim() || null,
    country: form.country.trim() || "CH",
    googleReviewUrl: form.googleReviewUrl.trim() || null,
    isDefault: form.isDefault,
  };
}

export function LocationsCard({ customer }: { customer: CustomerDetail }) {
  const invalidate = useCustomerInvalidation(customer.id);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState<Location | null>(null);
  const currentDefault = customer.locations.find((l) => l.isDefault);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/companies/${customer.id}/locations/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 px-6 pt-6">
        <h2 className="display text-xl text-ink">Locations</h2>
        {customer.canManage && (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            New location
          </Button>
        )}
      </div>
      <div className="mt-4 divide-y divide-line border-t border-line">
        {customer.locations.length === 0 && (
          <p className="px-6 py-4 text-sm text-muted">No locations yet.</p>
        )}
        {customer.locations.map((l) => (
          <div key={l.id} className="flex items-center gap-3 px-6 py-4">
            <MapPin className="size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {l.name}
                {l.isDefault && <span className="ml-2 text-xs font-medium text-muted">Default</span>}
              </p>
              <p className="truncate text-sm text-muted">
                {[l.address, [l.postalCode, l.city].filter(Boolean).join(" "), l.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            {customer.canManage && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(l)}
                  className="rounded-full p-2 text-muted transition hover:bg-ink/5 hover:text-ink"
                  aria-label="Edit location"
                >
                  <Pencil className="size-4" />
                </button>
                {/* The default can only go once another location takes over. */}
                {!l.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      remove.reset();
                      setDeleting(l);
                    }}
                    className="rounded-full p-2 text-muted transition hover:bg-ink/5 hover:text-negative"
                    aria-label="Delete location"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <LocationModal
          companyId={customer.id}
          location={editing ?? undefined}
          currentDefault={currentDefault}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete location"
        description={
          remove.error
            ? errorMessage(remove.error, "Could not delete the location.")
            : `Delete ${deleting?.name ?? ""}? Cards and pages assigned here lose their location.`
        }
      />
    </Card>
  );
}

function LocationModal({
  companyId,
  location,
  currentDefault,
  onClose,
  onSaved,
}: {
  companyId: string;
  location?: Location;
  currentDefault?: Location;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<LocationForm>(() => toForm(location));

  const set = <K extends keyof LocationForm>(key: K, value: LocationForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // The backend keeps exactly one default: it unmarks the others when this is
  // set, and ignores unsetting it. So the current default stays locked here.
  const isCurrentDefault = !!location?.isDefault;
  const replacesDefault =
    form.isDefault && !isCurrentDefault && currentDefault && currentDefault.id !== location?.id;

  const save = useMutation({
    mutationFn: () =>
      location
        ? api.patch(`/admin/companies/${companyId}/locations/${location.id}`, toPayload(form))
        : api.post(`/admin/companies/${companyId}/locations`, toPayload(form)),
    onSuccess: onSaved,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={location ? "Edit location" : "New location"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={!form.name.trim()}
            onClick={() => save.mutate()}
          >
            {location ? "Save changes" : "Create location"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={form.name}
            autoFocus
            onChange={(e) => set("name", e.target.value)}
            placeholder="Zurich Flagship"
          />
        </Field>
        <Field label="Address">
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Bahnhofstrasse 1"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Postal code">
            <Input
              value={form.postalCode}
              onChange={(e) => set("postalCode", e.target.value)}
              placeholder="8001"
            />
          </Field>
          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Zurich"
            />
          </Field>
        </div>
        <Field label="Country">
          <Input
            value={form.country}
            onChange={(e) => set("country", e.target.value.toUpperCase())}
            placeholder="CH"
            maxLength={2}
          />
        </Field>
        <Field label="Google review URL" hint="Where a Review card sends happy customers.">
          <Input
            value={form.googleReviewUrl}
            onChange={(e) => set("googleReviewUrl", e.target.value)}
            placeholder="https://g.page/r/..."
          />
        </Field>
        <div>
          <label
            className={`flex items-start gap-3 rounded-2xl border border-line p-3 ${
              isCurrentDefault ? "opacity-70" : "cursor-pointer hover:border-accent"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-accent"
              checked={form.isDefault}
              disabled={isCurrentDefault}
              onChange={(e) => set("isDefault", e.target.checked)}
            />
            <span>
              <span className="block text-sm font-semibold text-ink">Set as default location</span>
              <span className="block text-xs text-muted">
                {isCurrentDefault
                  ? "This is the default location. To change it, make another location the default."
                  : "Used when a card has no location set. Only one location can be the default."}
              </span>
            </span>
          </label>
          {replacesDefault && (
            <p className="mt-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-ink">
              This becomes the new default location.{" "}
              <span className="font-semibold">{currentDefault.name}</span> will no longer be the
              default.
            </p>
          )}
        </div>
        {save.error && (
          <p className="text-sm text-negative">
            {errorMessage(save.error, "Could not save the location.")}
          </p>
        )}
      </div>
    </Modal>
  );
}
