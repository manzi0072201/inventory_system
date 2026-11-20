"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  dueOf,
  formatMoney,
  paymentStatusOf,
  statusClass,
  suppliers,
} from "@/lib/purchases-data";
import { usePurchases } from "./purchases-store";

export function PurchaseDetails({ reference }: { reference: string }) {
  const router = useRouter();
  const { purchases, deletePurchase, hydrated } = usePurchases();

  const purchase = purchases.find(
    (entry) => entry.reference === reference || entry.id === reference,
  );
  const supplier = purchase
    ? suppliers.find((entry) => entry.name === purchase.supplier)
    : undefined;
  const due = purchase ? dueOf(purchase) : 0;
  const paymentStatus = purchase ? paymentStatusOf(purchase) : "Unpaid";
  const paidPercent =
    purchase && purchase.total > 0
      ? Math.min(100, Math.round((purchase.paid / purchase.total) * 100))
      : 0;
  const initials = purchase
    ? purchase.supplier
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  if (!hydrated) {
    return (
      <div className="sales-page">
        <section className="panel">
          <div className="panel-body">Loading purchase…</div>
        </section>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="sales-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Purchases</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/purchases")}
              >
                All Purchases
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Purchase Details</span>
            </nav>
            <h1>Purchase Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No purchase found with reference{" "}
              <strong>{reference}</strong>. It may have been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/purchases")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to All Purchases
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = async () => {
    if (
      window.confirm(
        `Delete purchase "${purchase.reference}"? This cannot be undone.`,
      )
    ) {
      try {
        await deletePurchase(purchase.id);
        router.push("/purchases");
      } catch {
        return;
      }
    }
  };

  return (
    <div className="sales-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Purchases</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/purchases")}
            >
              All Purchases
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{purchase.reference}</span>
          </nav>
          <h1>Purchase {purchase.reference}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(
                `/purchases/${encodeURIComponent(purchase.reference)}/edit`,
              )
            }
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Edit purchase
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => window.print()}
          >
            <Icon name="purchases" className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={handleDelete}
          >
            <Icon name="trash" className="w-3.5 h-3.5" />
            Delete purchase
          </button>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Purchase Details</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Reference</label>
                  <div className="detail-value">
                    <Icon name="barcode" className="w-3.5 h-3.5" />
                    <span className="truncate">{purchase.reference}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Date</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.date} 00:00</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Buyer</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.buyer}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Supplier</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.supplier}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Warehouse</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.warehouse}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Currency</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.currency}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${statusClass(purchase.status)}`}
                    >
                      {purchase.status}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Shipping Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${statusClass(purchase.shippingStatus)}`}
                    >
                      {purchase.shippingStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Payment &amp; Totals</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Total</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatMoney(purchase.total)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Paid</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatMoney(purchase.paid)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Due</label>
                  <div
                    className={`detail-value${due > 0 ? " negative" : " positive"}`}
                  >
                    <span className="truncate">{formatMoney(due)}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Payment Method</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {purchase.paymentMethod}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Payment Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${paymentStatus.toLowerCase()}`}
                    >
                      {paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Payment progress</label>
                  <div className="sale-progress">
                    <span style={{ width: `${paidPercent}%` }} />
                  </div>
                  <div className="sale-progress-meta">
                    <span>{paidPercent}% paid</span>
                    <span>{formatMoney(due)} due</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Additional Information</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Purchase ID</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.id}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Reference</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.reference}</span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Note</label>
                  <div className="detail-value">
                    <span className="truncate">{purchase.note || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <h2>Supplier</h2>
          </div>
          <div className="panel-body form-body image-body">
            <div className="sale-customer-card">
              <div className="sale-customer-avatar">{initials || "?"}</div>
              <div className="sale-customer-copy">
                <strong>{purchase.supplier}</strong>
                <span>{supplier?.category ?? "Supplier"}</span>
              </div>
            </div>
            {supplier ? (
              <>
                <div className="filter-field">
                  <label>Contact</label>
                  <div className="detail-value">
                    <span className="truncate">{supplier.contact}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Email</label>
                  <div className="detail-value">
                    <span className="truncate">{supplier.email || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Phone</label>
                  <div className="detail-value">
                    <span className="truncate">{supplier.phone || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Country</label>
                  <div className="detail-value">
                    <span className="truncate">{supplier.country || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>City</label>
                  <div className="detail-value">
                    <span className="truncate">{supplier.city || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Address</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {supplier.address || "—"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="sale-customer-empty">
                No supplier record found for this purchase.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
