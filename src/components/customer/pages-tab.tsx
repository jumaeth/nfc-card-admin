"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArchiveRestore, ExternalLink, LayoutTemplate, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CustomerDetail, DeletedPageRow, PageDetail, PageKind, PageRow } from "@/lib/types";
import { useStaff } from "@/lib/staff";
import { APP_URL, CARD_TYPE_LABEL, formatDate } from "@/lib/format";
import { ConfirmDialog, Modal } from "@/components/modal";
import { Badge, Button, EmptyState, Field, Input, Select, Spinner } from "@/components/ui";
import { ErrorNote, Table } from "@/components/bits";
import { errorMessage, useCustomerInvalidation } from "./shared";

const PAGE_KINDS = Object.keys(CARD_TYPE_LABEL) as PageKind[];

export function PagesTab({ customer }: { customer: CustomerDetail }) {
  const invalidate = useCustomerInvalidation(customer.id);
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PageRow | null>(null);

  const pages = useQuery({
    queryKey: ["admin-customer-pages", customer.id],
    queryFn: () => api.get<PageRow[]>(`/admin/companies/${customer.id}/pages`),
  });

  const publish = useMutation({
    mutationFn: (vars: { pageId: string; published: boolean }) =>
      api.patch(`/admin/companies/${customer.id}/pages/${vars.pageId}`, {
        published: vars.published,
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (pageId: string) => api.delete(`/admin/companies/${customer.id}/pages/${pageId}`),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  const rows = pages.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Tap destinations for this customer&apos;s cards. Open a page to edit its content.
        </p>
        {customer.canManage && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Add page
          </Button>
        )}
      </div>

      <ErrorNote error={publish.error ?? remove.error} />

      {pages.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : pages.error ? (
        <ErrorNote error={pages.error} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="size-10" />}
          title="No pages yet"
          description={
            customer.canManage
              ? "Add a page, then point this customer's cards at it from the Cards tab."
              : undefined
          }
        />
      ) : (
        <Table head={["Page", "Kind", "Cards", "Updated", "Status", ""]}>
          {rows.map((page) => (
            <tr key={page.id}>
              <td className="px-5 py-3.5">
                <Link
                  href={`/customers/${customer.id}/pages/${page.id}`}
                  className="block font-semibold text-ink hover:text-accent"
                >
                  {page.name}
                </Link>
                <a
                  href={`${APP_URL}/p/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent"
                >
                  /p/{page.slug}
                  <ExternalLink className="size-3" />
                </a>
              </td>
              <td className="px-5 py-3.5 text-ink-soft">{CARD_TYPE_LABEL[page.kind]}</td>
              <td className="px-5 py-3.5 tabular-nums">{page._count.cards}</td>
              <td className="px-5 py-3.5 text-muted">{formatDate(page.updatedAt)}</td>
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Badge tone={page.published ? "positive" : "muted"}>
                    {page.published ? "Live" : "Draft"}
                  </Badge>
                  {customer.canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      loading={publish.isPending && publish.variables?.pageId === page.id}
                      onClick={() => publish.mutate({ pageId: page.id, published: !page.published })}
                    >
                      {page.published ? "Unpublish" : "Publish"}
                    </Button>
                  )}
                </div>
              </td>
              <td className="px-5 py-3.5 text-right">
                {customer.canManage && (
                  <button
                    type="button"
                    onClick={() => setDeleting(page)}
                    className="rounded-full p-2 text-muted transition hover:bg-ink/5 hover:text-negative"
                    aria-label="Delete page"
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
        <CreatePageModal
          customer={customer}
          onClose={() => setCreating(false)}
          onCreated={(page) => {
            invalidate();
            router.push(`/customers/${customer.id}/pages/${page.id}`);
          }}
        />
      )}

      <DeletedPages customer={customer} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        loading={remove.isPending}
        title="Delete page"
        description={`Delete ${deleting?.name}? The page is unpublished and hidden, and cards pointing at it lose their destination. Nothing is erased.`}
      />
    </div>
  );
}

/** Soft-deleted pages, with a restore action. Only rendered for SUPER_ADMIN. */
function DeletedPages({ customer }: { customer: CustomerDetail }) {
  const { capabilities } = useStaff();
  const invalidate = useCustomerInvalidation(customer.id);

  const deleted = useQuery({
    queryKey: ["admin-customer-deleted-pages", customer.id],
    queryFn: () => api.get<DeletedPageRow[]>(`/admin/companies/${customer.id}/deleted-pages`),
    enabled: capabilities.restoresDeleted,
  });

  const restore = useMutation({
    mutationFn: (pageId: string) =>
      api.post(`/admin/companies/${customer.id}/pages/${pageId}/restore`),
    onSuccess: invalidate,
  });

  const rows = deleted.data ?? [];
  if (!capabilities.restoresDeleted || rows.length === 0) return null;

  return (
    <div className="space-y-3 pt-4">
      <div>
        <p className="eyebrow text-muted">Deleted pages</p>
        <p className="mt-1 text-sm text-muted">
          Restored pages come back as drafts. Point cards at them again from the Cards tab.
        </p>
      </div>
      <ErrorNote error={restore.error} />
      <Table head={["Page", "Kind", "Deleted", ""]}>
        {rows.map((page) => (
          <tr key={page.id}>
            <td className="px-5 py-3.5">
              <p className="font-semibold text-ink-soft">{page.name}</p>
              <p className="text-xs text-muted">/p/{page.slug}</p>
            </td>
            <td className="px-5 py-3.5 text-ink-soft">{CARD_TYPE_LABEL[page.kind]}</td>
            <td className="px-5 py-3.5 text-muted">{formatDate(page.deletedAt)}</td>
            <td className="px-5 py-3.5 text-right">
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                loading={restore.isPending && restore.variables === page.id}
                onClick={() => restore.mutate(page.id)}
              >
                <ArchiveRestore className="size-4" />
                Restore
              </Button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function CreatePageModal({
  customer,
  onClose,
  onCreated,
}: {
  customer: CustomerDetail;
  onClose: () => void;
  onCreated: (page: Pick<PageDetail, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PageKind>("REVIEW");
  const [locationId, setLocationId] = useState(
    customer.locations.find((l) => l.isDefault)?.id ?? "",
  );
  const [slug, setSlug] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.post<Pick<PageDetail, "id">>(`/admin/companies/${customer.id}/pages`, {
        name: name.trim(),
        kind,
        locationId: locationId || undefined,
        slug: slug.trim() || undefined,
      }),
    onSuccess: onCreated,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Add page"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} disabled={!name.trim()} onClick={() => create.mutate()}>
            Add page
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <Input
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder="Google reviews"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kind" hint="Must match the type of the cards that point here.">
            <Select value={kind} onChange={(e) => setKind(e.target.value as PageKind)}>
              {PAGE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {CARD_TYPE_LABEL[k]}
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
        <Field label="Page slug" hint="Optional. Leave empty to generate one. Used in /p/ links.">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="cafe-reviews"
          />
        </Field>
        <p className="text-xs text-muted">
          The page starts as an empty draft. The editor opens next so you can add its content.
        </p>
        {create.error && (
          <p className="text-sm text-negative">{errorMessage(create.error, "Could not add the page.")}</p>
        )}
      </div>
    </Modal>
  );
}
