"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ArrowLeft, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { CustomerDetail } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ConfirmDialog } from "@/components/modal";
import { Badge, Button, Spinner } from "@/components/ui";
import { CompanyMark, ErrorNote, Tabs } from "@/components/bits";
import { OverviewTab } from "@/components/customer/overview-tab";
import { TeamTab } from "@/components/customer/team-tab";
import { CardsTab } from "@/components/customer/cards-tab";
import { PagesTab } from "@/components/customer/pages-tab";

type Tab = "overview" | "team" | "cards" | "pages";
const TABS: Tab[] = ["overview", "team", "cards", "pages"];

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <Customer id={id} />
    </Suspense>
  );
}

function Customer({ id }: { id: string }) {
  const { capabilities } = useStaff();
  const queryClient = useQueryClient();
  // `?tab=pages` lets the page editor link back to the tab it came from.
  const requestedTab = useSearchParams().get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    requestedTab && TABS.includes(requestedTab) ? requestedTab : "overview",
  );
  const [confirmArchive, setConfirmArchive] = useState(false);

  const detail = useQuery({
    queryKey: ["admin-customer", id],
    queryFn: () => api.get<CustomerDetail>(`/admin/companies/${id}`),
  });

  const archive = useMutation({
    mutationFn: (archived: boolean) =>
      api.post(`/admin/companies/${id}/${archived ? "archive" : "restore"}`),
    onSuccess: () => {
      setConfirmArchive(false);
      queryClient.invalidateQueries({ queryKey: ["admin-customer", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  if (detail.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <div className="space-y-6">
        <BackLink />
        <ErrorNote error={detail.error ?? new Error("Customer not found")} />
      </div>
    );
  }

  const c = detail.data;
  const archived = Boolean(c.deletedAt);

  return (
    <div>
      <BackLink />

      <div className="mt-4 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <CompanyMark name={c.name} color={c.brandColor} />
          <div className="min-w-0">
            <span className="eyebrow text-accent">Customer</span>
            <h1 className="display mt-1 truncate text-3xl text-ink sm:text-4xl">{c.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{c.slug}</span>
              <span>·</span>
              <span>Since {formatDate(c.createdAt)}</span>
              {archived && <Badge tone="muted">Archived</Badge>}
            </p>
          </div>
        </div>
        {capabilities.managesAllCustomers && (
          <Button
            variant="outline"
            size="sm"
            loading={archive.isPending}
            onClick={() => (archived ? archive.mutate(false) : setConfirmArchive(true))}
          >
            {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
            {archived ? "Restore" : "Archive"}
          </Button>
        )}
      </div>

      {!c.canManage && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-muted">
          <Eye className="size-4 shrink-0" />
          You can view this customer but not change it.
        </div>
      )}
      {archived && (
        <div className="mb-6 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-ink">
          Archived on {formatDate(c.deletedAt)}. Its members no longer see it in the app. Cards and
          published pages keep answering taps until you disable or unpublish them.
        </div>
      )}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "team", label: "Team", count: c.members.length },
          { value: "cards", label: "Cards", count: c._count.cards },
          { value: "pages", label: "Pages", count: c._count.pages },
        ]}
      />

      {tab === "overview" && <OverviewTab customer={c} />}
      {tab === "team" && <TeamTab customer={c} />}
      {tab === "cards" && <CardsTab customer={c} />}
      {tab === "pages" && <PagesTab customer={c} />}

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => archive.mutate(true)}
        loading={archive.isPending}
        confirmLabel="Archive"
        title="Archive customer"
        description={`${c.name} will disappear from the app for its members. Nothing is deleted and you can restore it any time.`}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/customers"
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
    >
      <ArrowLeft className="size-4" />
      Customers
    </Link>
  );
}
