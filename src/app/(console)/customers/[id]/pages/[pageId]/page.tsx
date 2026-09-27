"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, Eye, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { CustomerDetail, PageDetail } from "@/lib/types";
import type { LocalizedText, PageContent, PageTheme } from "@/lib/page-content";
import { APP_URL, CARD_TYPE_LABEL } from "@/lib/format";
import { Badge, Button, Card, Input, Spinner } from "@/components/ui";
import { ErrorNote } from "@/components/bits";
import { ConfirmDialog } from "@/components/modal";
import { seedContent } from "@/components/builders/PageContentEditor";
import { PageWorkspace } from "@/components/builders/PageWorkspace";
import type { BuilderServices, DesignTemplate, PageOption } from "@/components/builders/host";
import { WifiGuests, type WifiGuest } from "@/components/builders/WifiGuests";
import { useCustomerInvalidation } from "@/components/customer/shared";

export default function CustomerPageEditor({
  params,
}: {
  params: Promise<{ id: string; pageId: string }>;
}) {
  const { id, pageId } = use(params);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidateCustomer = useCustomerInvalidation(id);

  const customer = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => api.get<CustomerDetail>(`/admin/companies/${id}`),
  });
  const page = useQuery({
    queryKey: ["admin-customer-page", id, pageId],
    queryFn: () => api.get<PageDetail>(`/admin/companies/${id}/pages/${pageId}`),
  });

  // Local draft, only sent on Save.
  const [name, setName] = useState("");
  const [published, setPublished] = useState(false);
  const [content, setContent] = useState<PageContent>({});
  const [theme, setTheme] = useState<PageTheme>({});
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!page.data || seeded) return;
    setName(page.data.name);
    setPublished(page.data.published);
    setContent(seedContent(page.data.kind, page.data.content));
    setTheme(page.data.theme ?? {});
    setSeeded(true);
  }, [page.data, seeded]);

  const dirty = useMemo(() => {
    const p = page.data;
    if (!p || !seeded) return false;
    return (
      name !== p.name ||
      published !== p.published ||
      JSON.stringify(content) !== JSON.stringify(seedContent(p.kind, p.content)) ||
      JSON.stringify(theme) !== JSON.stringify(p.theme ?? {})
    );
  }, [page.data, seeded, name, published, content, theme]);

  const save = useMutation({
    mutationFn: () =>
      api.patch<PageDetail>(`/admin/companies/${id}/pages/${pageId}`, {
        name: name.trim(),
        published,
        content,
        theme,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admin-customer-page", id, pageId], updated);
      invalidateCustomer();
    },
  });

  // What the shared builders call. The admin routes apply the same access as
  // saving a page (SALES only their customers, SUPPORT read-only); staff are not
  // bound by the customer's monthly translation limit.
  const services = useMemo<BuilderServices>(() => {
    const base = `/admin/companies/${id}`;
    return {
      translate: (text, from, to) =>
        api
          .post<{ translations: LocalizedText }>(`${base}/pages/${pageId}/translate`, {
            text,
            from,
            to,
          })
          .then((res) => res.translations),
      uploadImage: (file) =>
        api.upload<{ url: string }>(`${base}/uploads`, file).then((r) => r.url),
      // The customer's other pages, for the link hub's page picker.
      pages: {
        queryKey: ["admin-customer-pages", id, "options"],
        list: () =>
          api
            .get<PageOption[]>(`${base}/pages`)
            .then((all) => all.filter((p) => p.id !== pageId)),
      },
      templates: {
        queryKey: ["admin-design-templates", id],
        list: () => api.get<DesignTemplate[]>(`${base}/design-templates`),
        create: (templateName, templateTheme) =>
          api.post<DesignTemplate>(`${base}/design-templates`, {
            name: templateName,
            theme: templateTheme,
          }),
        update: (templateId, patch) =>
          api.patch<DesignTemplate>(`${base}/design-templates/${templateId}`, patch),
        remove: (templateId) => api.delete<void>(`${base}/design-templates/${templateId}`),
      },
    };
  }, [id, pageId]);

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/companies/${id}/pages/${pageId}`),
    onSuccess: () => {
      invalidateCustomer();
      router.push(`/customers/${id}?tab=pages`);
    },
  });

  const back = (
    <Link
      href={`/customers/${id}?tab=pages`}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
    >
      <ArrowLeft className="size-4" />
      {customer.data?.name ?? "Customer"}
    </Link>
  );

  if (page.isLoading || customer.isLoading || (page.data && !seeded)) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (page.error || customer.error || !page.data || !customer.data) {
    return (
      <div className="space-y-6">
        {back}
        <ErrorNote error={page.error ?? customer.error ?? new Error("Page not found")} />
      </div>
    );
  }

  const p = page.data;
  const canManage = customer.data.canManage;
  const publicUrl = `${APP_URL}/p/${p.slug}`;

  return (
    <div>
      {back}

      <div className="mt-4 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Input
            value={name}
            readOnly={!canManage}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs text-lg font-semibold"
            aria-label="Page name"
          />
          <Badge tone="neutral">{CARD_TYPE_LABEL[p.kind]}</Badge>
        </div>

        {canManage ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <button
                type="button"
                role="switch"
                aria-checked={published}
                onClick={() => setPublished((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  published ? "bg-positive" : "bg-ink/15"
                }`}
              >
                <span
                  className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
                    published ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              {published ? "Live" : "Draft"}
            </label>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button
              size="sm"
              loading={save.isPending}
              disabled={!dirty || !name.trim()}
              onClick={() => save.mutate()}
            >
              {!dirty && !save.isPending ? (
                <>
                  <Check className="size-4" /> Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        ) : (
          <Badge tone={p.published ? "positive" : "muted"}>{p.published ? "Live" : "Draft"}</Badge>
        )}
      </div>

      <div className="mb-6 space-y-3">
        {!canManage && (
          <div className="flex items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-muted">
            <Eye className="size-4 shrink-0" />
            You can view this page but not change it.
          </div>
        )}
        <ErrorNote error={save.error ?? remove.error} />
      </div>

      <Card className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-muted">Public link</p>
          <p className="truncate text-sm text-ink">{publicUrl}</p>
          {!p.published && (
            <p className="mt-0.5 text-xs text-muted">Publish the page to make it live.</p>
          )}
        </div>
        <a href={publicUrl} target="_blank" rel="noreferrer" className="shrink-0">
          <Button variant="ghost" size="sm">
            <ExternalLink className="size-4" /> Open
          </Button>
        </a>
      </Card>

      <PageWorkspace
        kind={p.kind}
        name={name || p.name}
        content={content}
        onContentChange={setContent}
        theme={theme}
        onThemeChange={setTheme}
        canEdit={canManage}
        services={services}
      />

      {p.kind === "WIFI" && (
        <WifiGuests
          queryKey={["admin-wifi-guests", id, pageId]}
          list={() => api.get<WifiGuest[]>(`/admin/companies/${id}/pages/${pageId}/wifi-guests`)}
          remove={
            canManage
              ? (guestId) =>
                  api.delete(`/admin/companies/${id}/pages/${pageId}/wifi-guests/${guestId}`)
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        loading={remove.isPending}
        title="Delete page"
        description="The page is unpublished and hidden, and cards pointing at it lose their destination. Nothing is erased."
      />
    </div>
  );
}
