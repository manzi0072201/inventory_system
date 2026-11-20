"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/components/products/products-store";
import { useSales } from "@/components/sales/sales-store";
import { usePurchases } from "@/components/purchases/purchases-store";
import { formatMoney } from "@/lib/sales-data";
import {
  buildStockMovements,
  buildStockRows,
  movementTypeClass,
  stockStatusClass,
} from "@/lib/stock-data";
import { useStockAdjustments } from "./stock-store";

const DEFAULT_IMAGE_BG = "#f3f4f6";

function levelPercent(onHand: number, reorderPoint: number): number {
  const target = Math.max(reorderPoint * 1.5, 1);
  return Math.min(100, Math.max(0, Math.round((onHand / target) * 100)));
}

export function StockDetails({ code }: { code: string }) {
  const router = useRouter();
  const {
    products,
    hydrated: productsHydrated,
  } = useProducts();
  const { sales, hydrated: salesHydrated } = useSales();
  const { purchases, hydrated: purchasesHydrated } = usePurchases();
  const {
    adjustments,
    hydrated: stockHydrated,
  } = useStockAdjustments();

  const product = products.find(
    (entry) => entry.code === code || entry.id === code,
  );

  const movements = useMemo(
    () => buildStockMovements(products, sales, purchases, adjustments),
    [products, sales, purchases, adjustments],
  );

  const rows = useMemo(
    () => buildStockRows(products, movements),
    [products, movements],
  );

  const row = product
    ? rows.find((entry) => entry.product.id === product.id)
    : undefined;

  const productMovements = useMemo(
    () =>
      product
        ? movements.filter((movement) => movement.productId === product.id)
        : [],
    [movements, product],
  );

  const saleReferences = useMemo(
    () =>
      new Set(
        productMovements
          .filter((movement) => movement.type === "Sale")
          .map((movement) => movement.reference),
      ),
    [productMovements],
  );

  const purchaseReferences = useMemo(
    () =>
      new Set(
        productMovements
          .filter((movement) => movement.type === "Purchase")
          .map((movement) => movement.reference),
      ),
    [productMovements],
  );

  const linkedSales = useMemo(
    () => sales.filter((sale) => saleReferences.has(sale.reference)),
    [sales, saleReferences],
  );

  const linkedPurchases = useMemo(
    () =>
      purchases.filter((purchase) =>
        purchaseReferences.has(purchase.reference),
      ),
    [purchases, purchaseReferences],
  );

  const openSales = linkedSales.filter((sale) => sale.status !== "Completed");
  const openPurchases = linkedPurchases.filter(
    (purchase) => purchase.status !== "Received",
  );
  const openSalesValue = openSales.reduce((sum, sale) => sum + sale.total, 0);
  const openPurchasesValue = openPurchases.reduce(
    (sum, purchase) => sum + purchase.total,
    0,
  );

  if (
    !productsHydrated ||
    !salesHydrated ||
    !purchasesHydrated ||
    !stockHydrated
  ) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading stock record…</div>
        </section>
      </div>
    );
  }

  if (!product || !row) {
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
              <span className="crumb-current">Stock Details</span>
            </nav>
            <h1>Stock Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No stock record found for <strong>{code}</strong>. It may have
              been removed from the product catalog.
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

  const margin = product.price - product.cost;
  const marginPercent =
    product.cost > 0 ? (margin / product.cost) * 100 : null;
  const inventoryValue = product.cost * product.quantity;
  const retailValue = product.price * product.quantity;
  const imageSource = product.image
    ? product.image.startsWith("data:")
      ? "Uploaded from device"
      : product.image
    : "No image set";
  const recordCreated = product.createdAt
    ? new Date(product.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "—";
  const suggestedReorder =
    row.status === "In Stock"
      ? 0
      : Math.max(row.reorderPoint * 2 - row.onHand, row.reorderPoint);

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
            <span className="crumb-current">{product.name}</span>
          </nav>
          <h1>{product.name}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(`/stock/${encodeURIComponent(product.code)}/adjust`)
            }
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Adjust Stock
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() =>
              router.push(`/products/${encodeURIComponent(product.id)}`)
            }
          >
            <Icon name="products" className="w-3.5 h-3.5" />
            View product
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => window.print()}
          >
            <Icon name="purchases" className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Stock Details</h2>
              <span className="stock-panel-note">
                {product.code} · {product.brand}
              </span>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field span-2">
                  <label>Product Name</label>
                  <div className="detail-value">
                    <span className="truncate">{product.name}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Code Product</label>
                  <div className="detail-value">
                    <Icon name="barcode" className="w-3.5 h-3.5" />
                    <span className="truncate">{product.code}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Product ID</label>
                  <div className="detail-value">
                    <span className="truncate">{product.id}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Brand</label>
                  <div className="detail-value">
                    <span className="truncate">{product.brand}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Category</label>
                  <div className="detail-value">
                    <span className="truncate">{product.category}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Product Type</label>
                  <div className="detail-value">
                    <span className="unit-badge">{product.type}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Unit</label>
                  <div className="detail-value">
                    <span className="truncate">{product.unit}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Warehouse</label>
                  <div className="detail-value">
                    <span className="truncate">{product.warehouse}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${stockStatusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Stock Levels &amp; Value</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>On hand</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {row.onHand.toLocaleString()} {product.unit}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Reorder point</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {row.reorderPoint.toLocaleString()} {product.unit}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Unit cost</label>
                  <div className="detail-value">
                    <span className="truncate">{formatMoney(product.cost)}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Price</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatMoney(product.price)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Margin per unit</label>
                  <div
                    className={`detail-value${
                      margin > 0 ? " positive" : margin < 0 ? " negative" : ""
                    }`}
                  >
                    <span className="truncate">
                      {formatMoney(margin)}
                      {marginPercent !== null
                        ? ` (${marginPercent.toFixed(1)}%)`
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Stock value (cost)</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatMoney(inventoryValue)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Retail value (price)</label>
                  <div className="detail-value">
                    <span className="truncate">{formatMoney(retailValue)}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Last movement</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {row.lastMovement
                        ? `${row.lastMovement.date} · ${row.lastMovement.type}`
                        : "No movement recorded"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Movement History</h2>
              <span className="stock-panel-note">
                {productMovements.length.toLocaleString()} movements
              </span>
            </div>
            <div className="table-scroll">
              <table className="sales-table stock-movements-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Date</th>
                    <th scope="col">Warehouse</th>
                    <th className="right-align" scope="col">
                      Qty
                    </th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {productMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>
                        <span
                          className={`movement-badge ${movementTypeClass(movement.type)}`}
                        >
                          {movement.type}
                        </span>
                      </td>
                      <td>
                        {movement.href ? (
                          <Link href={movement.href} className="sale-link">
                            {movement.reference}
                          </Link>
                        ) : (
                          <span className="sale-muted">
                            {movement.reference}
                          </span>
                        )}
                      </td>
                      <td className="sale-date">{movement.date}</td>
                      <td>{movement.warehouse}</td>
                      <td
                        className={`right-align movement-qty ${
                          movement.quantity > 0 ? "positive" : "negative"
                        }`}
                      >
                        {movement.quantity > 0 ? "+" : ""}
                        {movement.quantity.toLocaleString()}
                      </td>
                      <td className="sale-muted">
                        {movement.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {productMovements.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={6}>
                        No movement has been recorded for this product yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="stock-movements-footer">
              <span>
                Showing {productMovements.length.toLocaleString()} linked
                movements
              </span>
              <Link href="/stock" className="sale-link">
                Back to all stock
              </Link>
            </div>
          </section>
        </div>

        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Product Image</h2>
            </div>
            <div className="panel-body form-body image-body">
              <div
                className="product-thumb details-thumb"
                style={{ background: product.imageBg || DEFAULT_IMAGE_BG }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={
                      product.blend
                        ? { mixBlendMode: "multiply" }
                        : undefined
                    }
                  />
                ) : (
                  <Icon name="products" className="create-thumb-fallback" />
                )}
              </div>
              <div className="filter-field">
                <label>Warehouse</label>
                <div className="detail-value">
                  <Icon name="warehouse" className="w-3.5 h-3.5" />
                  <span className="truncate">{product.warehouse}</span>
                </div>
              </div>
              <div className="filter-field span-2">
                <label>Image source</label>
                <div className="detail-value">
                  <span className="truncate">{imageSource}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Stock Position</h2>
            </div>
            <div className="panel-body form-body">
              <div className="stock-detail-position">
                <div className="stock-detail-position-head">
                  <div className="stock-detail-position-value">
                    <strong>{row.onHand.toLocaleString()}</strong>
                    <span>{product.unit} on hand</span>
                  </div>
                  <span
                    className={`status-pill ${stockStatusClass(row.status)}`}
                  >
                    {row.status}
                  </span>
                </div>
                <span className="stock-level-track stock-detail-track">
                  <span
                    className={`stock-level-fill ${stockStatusClass(row.status)}`}
                    style={{
                      width: `${levelPercent(row.onHand, row.reorderPoint)}%`,
                    }}
                  />
                </span>
                <div className="stock-detail-position-scale">
                  <span>0</span>
                  <span>Reorder at {row.reorderPoint.toLocaleString()}</span>
                </div>
                <div className="detail-grid stock-detail-position-grid">
                  <div className="filter-field">
                    <label>Suggested reorder</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {suggestedReorder.toLocaleString()} {product.unit}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Stock value</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {formatMoney(row.stockValue)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button stock-detail-adjust"
                  onClick={() =>
                    router.push(
                      `/stock/${encodeURIComponent(product.code)}/adjust`,
                    )
                  }
                >
                  <Icon
                    name="plus"
                    className="w-3.5 h-3.5"
                    strokeWidth={2.2}
                  />
                  Adjust this product
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Sales &amp; Purchase Links</h2>
            </div>
            <div className="panel-body form-body">
              <div className="stock-detail-commitments">
                <Link href="/sales" className="stock-detail-commitment">
                  <span className="movement-badge sale">Sales</span>
                  <span className="stock-detail-commitment-copy">
                    <strong>{linkedSales.length.toLocaleString()} orders</strong>
                    <span>
                      {openSales.length.toLocaleString()} open ·{" "}
                      {formatMoney(openSalesValue)}
                    </span>
                  </span>
                  <Icon
                    name="arrowRight"
                    className="w-3.5 h-3.5 stock-commitment-arrow"
                  />
                </Link>
                <Link href="/purchases" className="stock-detail-commitment">
                  <span className="movement-badge purchase">Purchases</span>
                  <span className="stock-detail-commitment-copy">
                    <strong>
                      {linkedPurchases.length.toLocaleString()} orders
                    </strong>
                    <span>
                      {openPurchases.length.toLocaleString()} open ·{" "}
                      {formatMoney(openPurchasesValue)}
                    </span>
                  </span>
                  <Icon
                    name="arrowRight"
                    className="w-3.5 h-3.5 stock-commitment-arrow"
                  />
                </Link>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Record Information</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Record created</label>
                  <div className="detail-value">
                    <span className="truncate">{recordCreated}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Origin</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {product.createdAt ? "Created in app" : "Catalog item"}
                    </span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Last movement</label>
                  <div className="detail-value">
                    <Icon name="history" className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {row.lastMovement
                        ? `${row.lastMovement.reference} · ${row.lastMovement.date}`
                        : "No movement recorded"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
