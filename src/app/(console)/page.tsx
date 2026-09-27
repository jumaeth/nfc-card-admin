"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { Overview } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import { CompanyMark, ErrorNote, StatTile } from "@/components/bits";

export default function OverviewPage() {
  const { user, capabilities } = useStaff();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.get<Overview>("/admin/overview"),
  });

  const firstName = user.name.split(" ")[0] || "there";

  return (
    <div>
      <PageHeader
        eyebrow={capabilities.seesAllCustomers ? "All customers" : "Your customers"}
        title={`Hello, ${firstName}`}
        description={
          capabilities.seesAllCustomers
            ? "A snapshot of every Taplino customer."
            : "A snapshot of the customers assigned to you."
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : error || !data ? (
        <ErrorNote error={error} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Customers" value={data.customers} />
            <StatTile
              label="Cards"
              value={data.cards}
              hint={`${data.activeCards} live`}
            />
            <StatTile label="Taps" value={data.tapsLast30Days} hint="Last 30 days" />
            <StatTile label="Customer users" value={data.members} />
          </div>

          {data.unassignedCustomers ? (
            <Link
              href="/customers?rep=none"
              className="flex items-center justify-between gap-4 rounded-card border border-accent/30 bg-accent-soft px-6 py-4 text-sm text-accent-ink transition hover:border-accent"
            >
              <span className="flex items-center gap-3">
                <UserX className="size-5" />
                <span>
                  <strong>{data.unassignedCustomers}</strong>{" "}
                  {data.unassignedCustomers === 1 ? "customer has" : "customers have"} no sales rep.
                </span>
              </span>
              <ArrowRight className="size-4" />
            </Link>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="display text-xl text-ink">Newest customers</h2>
                <Link href="/customers" className="text-sm font-semibold text-accent hover:text-accent-ink">
                  View all
                </Link>
              </div>
              {data.recentCustomers.length === 0 ? (
                <EmptyState
                  title="No customers yet"
                  description={
                    capabilities.createsCustomers
                      ? "Create your first customer from the Customers page."
                      : undefined
                  }
                />
              ) : (
                <Card className="divide-y divide-line p-0">
                  {data.recentCustomers.map((c) => (
                    <Link
                      key={c.id}
                      href={`/customers/${c.id}`}
                      className="flex items-center justify-between gap-4 p-4 transition hover:bg-paper/60"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <CompanyMark name={c.name} color={c.brandColor} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">{c.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {c.salesRep ? c.salesRep.name : "Unassigned"} · {formatDate(c.createdAt)}
                          </span>
                        </span>
                      </span>
                      {c.subscription && <Badge>{c.subscription.plan.name}</Badge>}
                    </Link>
                  ))}
                </Card>
              )}
            </div>

            <div>
              <h2 className="display mb-4 text-xl text-ink">Plans</h2>
              <Card className="space-y-4">
                {data.plans.map((p) => {
                  const pct = data.customers ? Math.round((p.count / data.customers) * 100) : 0;
                  return (
                    <div key={p.tier}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold text-ink">{p.name}</span>
                        <span className="tabular-nums text-muted">{p.count}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
