"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CardRow, CardStatus, CardType, CustomerDetail, PageRow } from "@/lib/types";
import {
  APP_URL,
  CARD_STATUS_LABEL,
  CARD_STATUS_TONE,
  CARD_TYPE_LABEL,
} from "@/lib/format";
import { ConfirmDialog, Modal } from "@/components/modal";
import { Badge, Button, EmptyState, Field, Input, Select, Spinner } from "@/components/ui";
import { ErrorNote, Table } from "@/components/bits";
import { errorMessage, useCustomerInvalidation } from "./shared";

const CARD_TYPES = Object.keys(CARD_TYPE_LABEL) as CardType[];

export function CardsTab({ customer }: { customer: CustomerDetail }) {
  const invalidate = useCustomerInvalidation(customer.id);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CardRow | null>(null);
  const canManage = customer.canManage;

  const cards = useQuery({
    queryKey: ["admin-customer-cards", customer.id],
    queryFn: () => api.get<CardRow[]>(`/admin/companies/${customer.id}/cards`),
  });
  const pages = useQuery({
    queryKey: ["admin-customer-pages", customer.id],
    queryFn: () => api.get<PageRow[]>(`/admin/companies/${customer.id}/pages`),
    enabled: canManage,
  });

  const update = useMutation({
    mutationFn: (vars: { cardId: string; status: CardStatus }) =>
      api.patch(`/admin/companies/${customer.id}/cards/${vars.cardId}`, { status: vars.status }),
    onSuccess: invalidate,
  });

  const setDestination = useMutation({
    mutationFn: (vars: { cardId: string; pageId: string | null }) =>
      api.put(`/admin/companies/${customer.id}/cards/${vars.cardId}/destination`, {
        pageId: vars.pageId,
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (cardId: string) => api.delete(`/admin/companies/${customer.id}/cards/${cardId}`),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  const rows = cards.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Physical NFC cards. A card answers taps once it points at a published page.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Add card
          </Button>
        )}
      </div>

      <ErrorNote error={update.error ?? setDestination.error} />

      {cards.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : cards.error ? (
        <ErrorNote error={cards.error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-10" />}
          title="No cards yet"
          description={canManage ? "Add the cards you shipped to this customer." : undefined}
        />
      ) : (
        <Table head={["Card", "Type", "Destination", "Status", ""]}>
          {rows.map((card) => (
            <tr key={card.id}>
              <td className="px-5 py-3.5">
                <p className="font-semibold text-ink">{card.name}</p>
                <a
                  href={`${APP_URL}/c/${card.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
                >
                  /c/{card.slug}
                  <ExternalLink className="size-3" />
                </a>
                {card.location && <p className="text-xs text-muted">{card.location.name}</p>}
              </td>
              <td className="px-5 py-3.5 text-ink-soft">{CARD_TYPE_LABEL[card.type]}</td>
              <td className="px-5 py-3.5">
                {canManage ? (
                  <Select
                    className="w-48 py-2"
                    value={card.activePageId ?? ""}
                    disabled={setDestination.isPending}
                    onChange={(e) =>
                      setDestination.mutate({ cardId: card.id, pageId: e.target.value || null })
                    }
                    aria-label="Destination page"
                  >
                    <option value="">No destination</option>
                    {(pages.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.published ? "" : " (draft)"}
                      </option>
                    ))}
                  </Select>
                ) : card.activePage ? (
                  <span className="text-ink-soft">{card.activePage.name}</span>
                ) : (
                  <span className="text-muted">None</span>
                )}
              </td>
              <td className="px-5 py-3.5">
                {canManage ? (
                  <Select
                    className="w-36 py-2"
                    value={card.status}
                    disabled={update.isPending}
                    onChange={(e) =>
                      update.mutate({ cardId: card.id, status: e.target.value as CardStatus })
                    }
                    aria-label="Status"
                  >
                    {(Object.keys(CARD_STATUS_LABEL) as CardStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {CARD_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Badge tone={CARD_STATUS_TONE[card.status]}>{CARD_STATUS_LABEL[card.status]}</Badge>
                )}
              </td>
              <td className="px-5 py-3.5 text-right">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setDeleting(card)}
                    className="rounded-full p-2 text-muted transition hover:bg-ink/5 hover:text-negative"
                    aria-label="Delete card"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {creating && (
        <CreateCardModal
          customer={customer}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            invalidate();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete card"
        description={`Delete ${deleting?.name}? Taps on /c/${deleting?.slug} will stop working. Tap history is kept.`}
      />
    </div>
  );
}

function CreateCardModal({
  customer,
  onClose,
  onCreated,
}: {
  customer: CustomerDetail;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CardType>("REVIEW");
  const [locationId, setLocationId] = useState(
    customer.locations.find((l) => l.isDefault)?.id ?? "",
  );
  const [slug, setSlug] = useState("");
  const [uid, setUid] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.post(`/admin/companies/${customer.id}/cards`, {
        name: name.trim(),
        type,
        locationId: locationId || undefined,
        slug: slug.trim() || undefined,
        uid: uid.trim() || undefined,
      }),
    onSuccess: onCreated,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Add card"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} disabled={!name.trim()} onClick={() => create.mutate()}>
            Add card
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Table 4" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as CardType)}>
              {CARD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CARD_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Location">
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">None</option>
              {customer.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Tap slug" hint="Optional. Leave empty to generate one. Printed into the card URL.">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="cafe-table-4"
          />
        </Field>
        <Field label="Chip UID" hint="Optional hardware ID of the NFC chip.">
          <Input value={uid} onChange={(e) => setUid(e.target.value)} placeholder="04:A2:3B:..." />
        </Field>
        {create.error && (
          <p className="text-sm text-negative">{errorMessage(create.error, "Could not add the card.")}</p>
        )}
      </div>
    </Modal>
  );
}
