"use client";

import { use, useState, type ReactNode } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Download, Factory, Hand, Truck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { AdminOrderDetail, OrderCardDesign, OrderStatus } from "@/lib/types";
import { formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_TONE, tapUrl } from "@/lib/format";
import { formatChf } from "@/lib/utils";
import { ConfirmDialog, Modal } from "@/components/modal";
import { Badge, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { ErrorNote } from "@/components/bits";

const CARD_TYPE_NAME: Record<string, string> = {
  business: "Metal business card",
  review: "Review & menu card",
};
const FINISH_NAME: Record<string, string> = { silver: "Silver", black: "Black" };
const LAYOUT_NAME: Record<string, string> = {
  logo: "Logo",
  text: "Text message",
  list: "List",
};
const FONT_NAME: Record<string, string> = {
  sans: "Sans",
  serif: "Serif",
  rounded: "Rounded",
  display: "Display",
};

const SHAPE_NAME: Record<string, string> = {
  straight: "Straight",
  wave: "Wave",
  round: "Round",
  scallop: "Scallop",
};

type StatusUpdate = { status: Extract<OrderStatus, "IN_PRODUCTION" | "SHIPPED" | "CANCELLED">; trackingNumber?: string };

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { capabilities, user } = useStaff();
  const queryClient = useQueryClient();
  const [shipping, setShipping] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const detail = useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => api.get<AdminOrderDetail>(`/admin/orders/${id}`),
  });

  const claim = useMutation({
    mutationFn: () => api.post(`/admin/orders/${id}/claim`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const update = useMutation({
    mutationFn: (body: StatusUpdate) => api.patch(`/admin/orders/${id}`, body),
    onSuccess: () => {
      setShipping(false);
      setCancelling(false);
      queryClient.invalidateQueries({ queryKey: ["admin-order", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
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
        <ErrorNote error={detail.error ?? new Error("Order not found")} />
      </div>
    );
  }

  const o = detail.data;
  // Whoever claimed the order fulfils it; ADMIN+ may act on any order.
  const isHandler = o.handledBy?.id === user.id;
  const canWrite = isHandler || Boolean(capabilities.overridesOrders);
  const closed = ["CANCELLED", "EXPIRED"].includes(o.status);
  const canClaim =
    Boolean(capabilities.managesOrders) &&
    !closed &&
    !isHandler &&
    (!o.handledBy || Boolean(capabilities.overridesOrders));
  const canProduce = o.status === "PAID";
  const canShip = o.status === "PAID" || o.status === "IN_PRODUCTION";
  const canCancel = !["SHIPPED", "CANCELLED", "EXPIRED"].includes(o.status);
  const cardCount = o.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="space-y-8">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-accent">Order</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="display text-3xl text-ink sm:text-4xl">{o.number}</h1>
            <Badge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            Placed {formatDate(o.createdAt)}
            {o.paidAt && `, paid ${formatDate(o.paidAt)}`}
            {o.shippedAt && `, shipped ${formatDate(o.shippedAt)}`}
          </p>
        </div>
        {(canClaim || (canWrite && (canShip || canCancel))) && (
          <div className="flex flex-wrap items-center gap-2">
            {canClaim && (
              <Button size="sm" loading={claim.isPending} onClick={() => claim.mutate()}>
                <Hand className="size-4" />
                {o.handledBy ? "Take over" : "Claim order"}
              </Button>
            )}
            {canWrite && canProduce && (
              <Button
                variant="outline"
                size="sm"
                loading={update.isPending && update.variables?.status === "IN_PRODUCTION"}
                onClick={() => update.mutate({ status: "IN_PRODUCTION" })}
              >
                <Factory className="size-4" />
                Mark in production
              </Button>
            )}
            {canWrite && canShip && (
              <Button size="sm" onClick={() => setShipping(true)}>
                <Truck className="size-4" />
                Mark shipped
              </Button>
            )}
            {canWrite && canCancel && (
              <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>
                <Ban className="size-4" />
                Cancel order
              </Button>
            )}
          </div>
        )}
      </div>

      {claim.error && <ErrorNote error={claim.error} />}
      {update.error && !shipping && !cancelling && <ErrorNote error={update.error} />}

      <Card className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-ink">
          {o.handledBy ? (
            <>
              Claimed by <span className="font-semibold">{isHandler ? "you" : o.handledBy.name}</span>
              {o.handledAt && <span className="text-muted">, {formatDate(o.handledAt)}</span>}
            </>
          ) : (
            <span className="text-muted">
              Not claimed yet. Whoever claims it fulfils the order and becomes the customer&apos;s sales rep.
            </span>
          )}
        </span>
        <span className="text-muted">
          {o.companyId
            ? o.salesRep
              ? `Sales rep: ${o.salesRep.id === user.id ? "you" : o.salesRep.name}`
              : "No sales rep yet"
            : "Rep is set once the buyer links a business"}
        </span>
      </Card>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <p className="eyebrow text-muted">Customer</p>
          <p className="mt-3 font-semibold text-ink">{o.customerName}</p>
          <a href={`mailto:${o.email}`} className="block text-sm text-accent hover:text-accent-ink">
            {o.email}
          </a>
          {o.phone && <p className="text-sm text-ink-soft">{o.phone}</p>}
          {o.companyName && <p className="mt-2 text-sm text-ink-soft">{o.companyName}</p>}
          <div className="mt-4 border-t border-line pt-3 text-sm">
            {o.companyId ? (
              <Link
                href={`/customers/${o.companyId}`}
                className="font-semibold text-ink hover:text-accent"
              >
                {o.companyNameInApp ?? "Linked business"}
              </Link>
            ) : (
              <span className="text-muted">Not linked to a business yet</span>
            )}
          </div>
        </Card>

        <Card>
          <p className="eyebrow text-muted">Ship to</p>
          {o.shippingAddress ? (
            <address className="mt-3 text-sm leading-relaxed text-ink not-italic">
              {o.customerName}
              <br />
              {o.companyName && (
                <>
                  {o.companyName}
                  <br />
                </>
              )}
              {o.shippingAddress.line1}
              <br />
              {o.shippingAddress.line2 && (
                <>
                  {o.shippingAddress.line2}
                  <br />
                </>
              )}
              {o.shippingAddress.postalCode} {o.shippingAddress.city}
              <br />
              {o.shippingAddress.country}
            </address>
          ) : (
            <p className="mt-3 text-sm text-muted">No address on file.</p>
          )}
          {o.trackingNumber && (
            <p className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">
              Tracking <span className="font-semibold text-ink">{o.trackingNumber}</span>
            </p>
          )}
        </Card>

        <Card>
          <p className="eyebrow text-muted">Payment</p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatChf(o.subtotalCents)} />
            {o.discountCents > 0 && <Row label="Volume discount" value={`- ${formatChf(o.discountCents)}`} />}
            <Row label="Shipping" value={o.shippingCents ? formatChf(o.shippingCents) : "Free"} />
            <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatChf(o.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">Prices include VAT.</p>
        </Card>
      </div>

      <section>
        <h2 className="display text-2xl text-ink">Items</h2>
        <div className="mt-4 space-y-5">
          {o.items.map((item, index) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">
                  <span className="tabular-nums">{item.quantity} x</span> {item.productName}
                </h3>
                <span className="text-sm text-muted tabular-nums">
                  {formatChf(item.unitPriceCents)} each, {formatChf(item.lineTotalCents)}
                </span>
              </div>
              {item.design ? (
                <DesignSummary design={item.design} fileBase={`${o.number}-item-${index + 1}`} />
              ) : (
                <p className="mt-3 text-sm text-muted">No design saved with this item.</p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-ink">Cards to encode</h2>
            <p className="mt-1 text-sm text-muted">
              Write each tap URL to one NFC chip. {cardCount} {cardCount === 1 ? "card" : "cards"} ordered.
            </p>
          </div>
          {o.cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => downloadCsv(o)}>
              <Download className="size-4" />
              Download CSV
            </Button>
          )}
        </div>
        {o.cards.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-paper-2 px-4 py-3 text-sm text-muted">
            No cards yet. They are created when the customer links this order to a business in the
            app, either when they create their business or with &quot;Add to business&quot;.
          </p>
        ) : (
          <Card className="mt-4 overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line bg-paper/60">
                  <tr>
                    {["#", "Name", "Slug", "Tap URL"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {o.cards.map((card, i) => (
                    <tr key={card.id}>
                      <td className="px-5 py-3 text-muted tabular-nums">{i + 1}</td>
                      <td className="px-5 py-3 text-ink">{card.name}</td>
                      <td className="px-5 py-3 font-mono text-xs text-ink">{card.slug}</td>
                      <td className="px-5 py-3">
                        <a
                          href={tapUrl(card.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs break-all text-accent hover:text-accent-ink"
                        >
                          {tapUrl(card.slug)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      {shipping && (
        <ShipModal
          loading={update.isPending}
          error={update.error}
          onClose={() => {
            setShipping(false);
            update.reset();
          }}
          onConfirm={(trackingNumber) =>
            update.mutate({ status: "SHIPPED", trackingNumber: trackingNumber || undefined })
          }
        />
      )}

      <ConfirmDialog
        open={cancelling}
        onClose={() => {
          setCancelling(false);
          update.reset();
        }}
        onConfirm={() => update.mutate({ status: "CANCELLED" })}
        loading={update.isPending}
        title={`Cancel order ${o.number}?`}
        description="The order is marked cancelled and will not be produced. Refunds are handled in Stripe."
        confirmLabel="Cancel order"
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
      <ArrowLeft className="size-4" />
      Orders
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-ink-soft">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function ShipModal({
  loading,
  error,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (trackingNumber: string) => void;
}) {
  const [tracking, setTracking] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Mark as shipped"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={() => onConfirm(tracking.trim())}>
            Mark shipped
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Tracking number" hint="Optional.">
          <Input value={tracking} autoFocus onChange={(e) => setTracking(e.target.value)} placeholder="99.00.123456.12345678" />
        </Field>
        {Boolean(error) && (
          <p className="text-sm text-negative">
            {error instanceof ApiError ? error.message : "Could not update the order."}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Design summary for production ────────────────────────────────────────────

function DesignSummary({ design: d, fileBase }: { design: OrderCardDesign; fileBase: string }) {
  const isBusiness = d.cardType === "business";
  const colours = [
    { label: "Header", value: d.headerColor },
    { label: "Header text", value: d.headerTextColor },
    { label: "Body", value: d.bodyColor },
    { label: "Stars", value: d.starColor },
    { label: "Accent", value: d.accentColor },
  ].filter((c): c is { label: string; value: string } => Boolean(c.value));

  const texts: [string, ReactNode][] = [
    ["Headline", d.headline],
    ["Category", d.category],
    ["Logo text", d.logoText],
    ["Message", d.bodyText],
    ["List title", d.listTitle],
    [
      "List items",
      d.listItems?.trim() ? (
        <ul className="list-inside list-disc">
          {d.listItems
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, i) => (
              <li key={i}>{line}</li>
            ))}
        </ul>
      ) : null,
    ],
    ["Review URL", d.reviewUrl ? <ExternalUrl url={d.reviewUrl} /> : null],
  ];
  const businessFields: [string, ReactNode][] = [
    ["Full name", d.fullName],
    ["Job title", d.jobTitle],
    ["Company", d.company],
    ["Phone", d.phone],
    ["Email", d.email],
    ["Website", d.website],
  ];

  return (
    <div className="mt-5 grid gap-6 border-t border-line pt-5 lg:grid-cols-[1fr_220px]">
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Spec label="Card type" value={d.cardType ? (CARD_TYPE_NAME[d.cardType] ?? d.cardType) : undefined} />
          {isBusiness && <Spec label="Finish" value={d.finish ? (FINISH_NAME[d.finish] ?? d.finish) : undefined} />}
          <Spec label="Layout" value={d.layout ? (LAYOUT_NAME[d.layout] ?? d.layout) : undefined} />
          <Spec label="Font" value={d.font ? (FONT_NAME[d.font] ?? d.font) : undefined} />
          <Spec label="Header edge" value={d.headerShape ? (SHAPE_NAME[d.headerShape] ?? d.headerShape) : undefined} />
          <Spec label="Stars" value={d.showStars === undefined ? undefined : d.showStars ? "Shown" : "Hidden"} />
          <Spec label="Backup QR" value={d.showQr === undefined ? undefined : d.showQr ? "Yes" : "No"} />
        </dl>

        {colours.length > 0 && (
          <div>
            <p className="eyebrow text-muted">Colours</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {colours.map((c) => (
                <span key={c.label} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-7 shrink-0 rounded-full border border-line"
                    style={{ backgroundColor: c.value }}
                  />
                  <span>
                    <span className="block text-xs text-muted">{c.label}</span>
                    <span className="block font-mono text-xs text-ink">{c.value}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <TextList title="Texts" rows={texts} />
        {isBusiness && <TextList title="Business card" rows={businessFields} />}
      </div>

      <div>
        <p className="eyebrow text-muted">Logo</p>
        {d.logoDataUrl ? (
          <div className="mt-2">
            <div className="flex aspect-square items-center justify-center rounded-2xl border border-line bg-[repeating-conic-gradient(#f3f0ea_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.logoDataUrl} alt="Customer logo" className="max-h-full max-w-full object-contain" />
            </div>
            <a
              href={d.logoDataUrl}
              download={d.logoName || `${fileBase}-logo${extensionFor(d.logoDataUrl)}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-ink"
            >
              <Download className="size-4" />
              Download logo
            </a>
            {d.logoName && <p className="truncate text-xs text-muted">{d.logoName}</p>}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No logo uploaded.</p>
        )}
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function TextList({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  const filled = rows.filter(([, v]) => (typeof v === "string" ? v.trim() : v));
  if (filled.length === 0) return null;
  return (
    <div>
      <p className="eyebrow text-muted">{title}</p>
      <dl className="mt-2 divide-y divide-line rounded-2xl border border-line text-sm">
        {filled.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[140px_1fr]">
            <dt className="text-muted">{label}</dt>
            <dd className="break-words whitespace-pre-line text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ExternalUrl({ url }: { url: string }) {
  const safe = /^https?:\/\//i.test(url);
  return safe ? (
    <a href={url} target="_blank" rel="noreferrer" className="break-all text-accent hover:text-accent-ink">
      {url}
    </a>
  ) : (
    <span className="break-all">{url}</span>
  );
}

function extensionFor(dataUrl: string) {
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? "";
  if (mime === "image/svg+xml") return ".svg";
  if (mime === "image/jpeg") return ".jpg";
  const sub = mime.split("/")[1];
  return sub ? `.${sub}` : "";
}

// ─── CSV export for NFC encoding ──────────────────────────────────────────────

function csvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function downloadCsv(order: AdminOrderDetail) {
  const lines = [
    "slug,tapUrl,name",
    ...order.cards.map((c) => [c.slug, tapUrl(c.slug), c.name].map(csvCell).join(",")),
  ];
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taplino-order-${order.number}-cards.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
