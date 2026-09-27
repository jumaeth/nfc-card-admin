"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useStaff } from "@/lib/staff";
import type { Product } from "@/lib/types";
import { formatChf } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { ErrorNote } from "@/components/bits";

function availability(p: Product) {
  if (!p.active) return { label: "Off sale", tone: "muted" as const };
  if (p.stock === 0) return { label: "Sold out", tone: "accent" as const };
  return { label: "On sale", tone: "positive" as const };
}

export default function ProductsPage() {
  const { capabilities } = useStaff();
  const [editing, setEditing] = useState<Product | null>(null);

  const products = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => api.get<Product[]>("/admin/products"),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Card prices and stock shown on the website. At zero stock the website shows the card as currently not available."
      />

      {products.isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : products.error ? (
        <ErrorNote error={products.error} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {(products.data ?? []).map((product) => {
            const status = availability(product);
            return (
              <Card key={product.id} className="flex flex-col">
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow text-accent">{product.key}</span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                <h2 className="display mt-2 text-3xl text-ink">{product.name}</h2>
                <p className="mt-2 text-sm text-muted">
                  <span className="text-lg font-semibold text-ink">{formatChf(product.priceCents)}</span>{" "}
                  per card, before volume discount
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
                  <span className="text-muted">
                    {product.stock == null ? (
                      "Unlimited stock"
                    ) : (
                      <>
                        <span className="font-semibold text-ink tabular-nums">{product.stock}</span> in
                        stock
                      </>
                    )}
                  </span>
                  {capabilities.managesPlans && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(product)}>
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editing && <EditProductModal product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState((product.priceCents / 100).toFixed(2));
  const [stock, setStock] = useState(product.stock == null ? "" : String(product.stock));
  const [active, setActive] = useState(product.active);

  const priceCents = Math.round(Number(price) * 100);
  const validPrice = price.trim() !== "" && Number.isFinite(priceCents) && priceCents >= 0;
  const stockValue = stock.trim() === "" ? null : Number(stock);
  const validStock = stockValue === null || (Number.isInteger(stockValue) && stockValue >= 0);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/products/${product.id}`, {
        name: name.trim(),
        priceCents,
        stock: stockValue,
        active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      onClose();
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${product.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            disabled={!name.trim() || !validPrice || !validStock}
            onClick={() => save.mutate()}
          >
            Save product
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" hint="Internal. The website keeps its own translated names.">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (CHF)" hint="Per card, before volume discount.">
            <Input
              type="number"
              min="0"
              step="0.05"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
          <Field label="Stock" hint="Empty for unlimited. Orders count it down.">
            <Input
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-accent)]"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          On sale. Untick to show it as not available regardless of stock.
        </label>
        {save.error && (
          <p className="text-sm text-negative">
            {save.error instanceof ApiError ? save.error.message : "Could not save the product."}
          </p>
        )}
      </div>
    </Modal>
  );
}
