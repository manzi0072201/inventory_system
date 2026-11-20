"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/components/products/products-store";
import { formatMoney } from "@/lib/sales-data";
import {
  reorderPointFor,
  stockReasons,
  stockStatusClass,
  stockStatusOf,
  type StockAdjustment,
} from "@/lib/stock-data";
import { useStockAdjustments } from "./stock-store";

type AdjustMode = "add" | "remove" | "set";

function today(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function CreateStockAdjustment({ code }: { code?: string }) {
  const router = useRouter();
  const {
    products,
    updateProduct,
    hydrated: productsHydrated,
  } = useProducts();
  const {
    addAdjustment,
    nextReference,
    hydrated: stockHydrated,
  } = useStockAdjustments();

  const [productId, setProductId] = useState("");
  const [mode, setMode] = useState<AdjustMode>("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(stockReasons[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const effectiveProductId = productId || products[0]?.id || "";
  const selectedProduct = useMemo(
    () =>
      code
        ? products.find((product) => product.code === code || product.id === code)
        : products.find((product) => product.id === effectiveProductId),
    [code, effectiveProductId, products],
  );

  const currentQuantity = selectedProduct?.quantity ?? 0;
  const parsedQuantity = Number(quantity);
  const hasQuantity =
    quantity.trim() !== "" &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity >= 0;
  const nextQuantity = hasQuantity
    ? mode === "add"
      ? currentQuantity + parsedQuantity
      : mode === "remove"
        ? currentQuantity - parsedQuantity
        : parsedQuantity
    : currentQuantity;
  const previewQuantity = Math.max(0, Math.round(nextQuantity));
  const delta = hasQuantity ? previewQuantity - currentQuantity : 0;
  const reorderPoint = selectedProduct ? reorderPointFor(selectedProduct) : 0;
  const nextStatus = stockStatusOf(previewQuantity, reorderPoint);
  const backHref =
    code && selectedProduct
      ? `/stock/${encodeURIComponent(selectedProduct.code)}`
      : "/stock";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProduct) {
      setError("Choose a product to adjust.");
      return;
    }

    if (!hasQuantity) {
      setError("Enter a valid quantity.");
      return;
    }

    if (mode !== "set" && parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (mode === "remove" && parsedQuantity > currentQuantity) {
      setError("You cannot remove more than the current stock level.");
      return;
    }

    const resolvedQuantity = Math.round(nextQuantity);

    if (resolvedQuantity === currentQuantity) {
      setError("This adjustment would not change the stock level.");
      return;
    }

    const adjustment: StockAdjustment = {
      id: nextReference,
      date: today(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productCode: selectedProduct.code,
      warehouse: selectedProduct.warehouse,
      quantity: resolvedQuantity - currentQuantity,
      reason,
      note: note.trim() || undefined,
    };

    updateProduct(selectedProduct.id, { quantity: resolvedQuantity });
    addAdjustment(adjustment);
    router.push(`/stock/${encodeURIComponent(selectedProduct.code)}`);
  };

  if (!productsHydrated || !stockHydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading stock adjustment…</div>
        </section>
      </div>
    );
  }

  if (!selectedProduct) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Inventory</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/stock")}
              >
                Stock Management
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Adjust Stock</span>
            </nav>
            <h1>Adjust Stock</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              {code ? (
                <>
                  No stock record found for <strong>{code}</strong>. It may have
                  been removed from the product catalog.
                </>
              ) : (
                "There are no products available to adjust."
              )}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/stock")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Stock Management
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Inventory</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/stock")}
            >
              Stock Management
            </span>
            <span className="crumb-sep">/</span>
            {code ? (
              <>
                <span
                  className="crumb-link"
                  onClick={() =>
                    router.push(
                      `/stock/${encodeURIComponent(selectedProduct.code)}`,
                    )
                  }
                >
                  {selectedProduct.name}
                </span>
                <span className="crumb-sep">/</span>
              </>
            ) : null}
            <span className="crumb-current">Adjust Stock</span>
          </nav>
          <h1>Adjust Stock</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push(backHref)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="stock-adjustment-form"
            className="primary-button"
          >
            <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Save Adjustment
          </button>
        </div>
      </div>

      <form id="stock-adjustment-form" onSubmit={handleSubmit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Product Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  {code ? (
                    <div className="filter-field span-2">
                      <label>Product</label>
                      <div className="detail-value">
                        <Icon name="products" className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {selectedProduct.name} ({selectedProduct.code})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="filter-field span-2">
                      <label htmlFor="stock-adjustment-product">Product</label>
                      <select
                        id="stock-adjustment-product"
                        className="filter-select"
                        value={effectiveProductId}
                        onChange={(event) => {
                          setProductId(event.target.value);
                          setError(null);
                        }}
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="filter-field">
                    <label>Warehouse</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {selectedProduct.warehouse}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Category</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {selectedProduct.category}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Brand</label>
                    <div className="detail-value">
                      <span className="truncate">{selectedProduct.brand}</span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Current Stock</label>
                    <div className="detail-value">
                      {currentQuantity.toLocaleString()} units
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Adjustment Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  <div className="filter-field">
                    <label htmlFor="stock-adjustment-mode">Adjustment</label>
                    <select
                      id="stock-adjustment-mode"
                      className="filter-select"
                      value={mode}
                      onChange={(event) => {
                        setMode(event.target.value as AdjustMode);
                        setError(null);
                      }}
                    >
                      <option value="add">Add stock</option>
                      <option value="remove">Remove stock</option>
                      <option value="set">Set stock level</option>
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="stock-adjustment-quantity">Quantity</label>
                    <div className="input-suffix">
                      <input
                        id="stock-adjustment-quantity"
                        className={`filter-input${error ? " invalid" : ""}`}
                        type="number"
                        min={mode === "set" ? 0 : 1}
                        step={1}
                        value={quantity}
                        onChange={(event) => {
                          setQuantity(event.target.value);
                          setError(null);
                        }}
                        placeholder="0"
                      />
                      <span>units</span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="stock-adjustment-reason">Reason</label>
                    <select
                      id="stock-adjustment-reason"
                      className="filter-select"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    >
                      {stockReasons.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field span-3">
                    <label htmlFor="stock-adjustment-note">Note</label>
                    <textarea
                      id="stock-adjustment-note"
                      className="filter-textarea"
                      rows={3}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Add context for this stock adjustment"
                    />
                  </div>
                </div>
                {error ? <p className="field-error">{error}</p> : null}
              </div>
            </section>
          </div>

          <aside className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Adjustment Summary</h2>
              </div>
              <div className="panel-body">
                <div className="stock-adjust-current">
                  <div className="stock-adjust-icon">
                    <Icon name="stock" className="w-4 h-4" />
                  </div>
                  <div className="stock-adjust-copy">
                    <strong>{currentQuantity.toLocaleString()}</strong>
                    <span>Currently on hand</span>
                  </div>
                  {hasQuantity ? (
                    <div className="stock-adjust-preview">
                      <span>New level</span>
                      <strong>{previewQuantity.toLocaleString()}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Current stock</span>
                    <span>{currentQuantity.toLocaleString()}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Adjustment</span>
                    <span>
                      {hasQuantity
                        ? `${delta > 0 ? "+" : ""}${delta.toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Status after</span>
                    <span>
                      <span
                        className={`status-pill ${stockStatusClass(nextStatus)}`}
                      >
                        {nextStatus}
                      </span>
                    </span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Stock value</span>
                    <span>
                      {formatMoney(previewQuantity * selectedProduct.cost)}
                    </span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>New stock level</span>
                    <span>{previewQuantity.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </section>

            <button
              type="submit"
              form="stock-adjustment-form"
              className="primary-button sale-submit-button"
            >
              Save Adjustment
            </button>
            <button
              type="button"
              className="ghost-button sale-cancel-button"
              onClick={() => router.push(backHref)}
            >
              Cancel
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}
