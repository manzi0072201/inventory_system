"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatMoney, suppliers } from "@/lib/purchases-data";
import {
  formatPurchaseReturnDate,
  purchaseReturnItemCount,
  purchaseReturnStatusClass,
} from "@/lib/purchase-returns-data";
import { usePurchaseReturns } from "./purchase-returns-store";

export function PurchaseReturnDetails({ reference }: { reference: string }) {
  const router = useRouter();
  const { purchaseReturns, deletePurchaseReturn, hydrated } =
    usePurchaseReturns();
  const record = purchaseReturns.find(
    (entry) => entry.reference === reference || entry.id === reference,
  );
  const supplier = record
    ? suppliers.find((entry) => entry.name === record.supplier)
    : undefined;
  const initials = record
    ? record.supplier
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
          <div className="panel-body">Loading purchase return...</div>
        </section>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="sales-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Purchasing</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/purchase-return")}
              >
                Purchase Returns
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Return Details</span>
            </nav>
            <h1>Purchase Return Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No purchase return found with reference{" "}
              <strong>{reference}</strong>. It may have been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/purchase-return")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Purchase Returns
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Delete purchase return "${record.reference}"? This cannot be undone.`,
      )
    ) {
      deletePurchaseReturn(record.id);
      router.push("/purchase-return");
    }
  };

  return (
    <div className="sales-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Purchasing</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/purchase-return")}
            >
              Purchase Returns
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{record.reference}</span>
          </nav>
          <h1>Purchase Return {record.reference}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(
                `/purchase-return/${encodeURIComponent(record.reference)}/edit`,
              )
            }
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Edit return
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
            Delete return
          </button>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Return Details</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Reference</label>
                  <div className="detail-value">
                    <Icon name="barcode" className="w-3.5 h-3.5" />
                    <span className="truncate">{record.reference}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Date</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatPurchaseReturnDate(record.date)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Original Purchase</label>
                  <div className="detail-value">
                    <Link
                      href={`/purchases/${encodeURIComponent(record.purchaseReference)}`}
                      className="sale-link truncate"
                    >
                      {record.purchaseReference}
                    </Link>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Supplier</label>
                  <div className="detail-value">
                    <span className="truncate">{record.supplier}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Warehouse</label>
                  <div className="detail-value">
                    <span className="truncate">{record.warehouse}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Reason</label>
                  <div className="detail-value">
                    <span className="truncate">{record.reason}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Resolution</label>
                  <div className="detail-value">
                    <span className="truncate">{record.resolution}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Refund Method</label>
                  <div className="detail-value">
                    <span className="truncate">{record.refundMethod}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${purchaseReturnStatusClass(record.status)}`}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Inventory</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {record.deductStock
                        ? "Deducted from inventory"
                        : "Inventory unchanged"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Returned Products</h2>
            </div>
            <div className="panel-body form-body">
              <div className="table-scroll">
                <table className="sales-table sale-items-table">
                  <thead>
                    <tr>
                      <th scope="col">Product Name</th>
                      <th className="right-align" scope="col">
                        Unit Cost
                      </th>
                      <th className="right-align" scope="col">
                        Quantity
                      </th>
                      <th className="right-align" scope="col">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.items.map((item) => (
                      <tr key={item.productId}>
                        <td>
                          <div className="sale-item-name">
                            <strong>{item.name}</strong>
                            <span>{item.code}</span>
                          </div>
                        </td>
                        <td className="right-align sale-amount">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="right-align">{item.quantity}</td>
                        <td className="right-align sale-amount">
                          {formatMoney(item.quantity * item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                  <label>Return ID</label>
                  <div className="detail-value">
                    <span className="truncate">{record.id}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Created</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {new Date(record.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Note</label>
                  <div className="detail-value">
                    <span className="truncate">{record.note || "No note"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Refund Summary</h2>
            </div>
            <div className="panel-body">
              <div className="sale-customer-card">
                <div className="sale-customer-avatar">{initials || "?"}</div>
                <div className="sale-customer-copy">
                  <strong>{record.supplier}</strong>
                  <span>{record.warehouse}</span>
                </div>
              </div>
              <div className="sale-summary-rows">
                <div className="sale-summary-row">
                  <span>Items Returned</span>
                  <span>{purchaseReturnItemCount(record.items)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Resolution</span>
                  <span>{record.resolution}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Refund Method</span>
                  <span>{record.refundMethod}</span>
                </div>
                <div className="sale-summary-row grand">
                  <span>Total Return</span>
                  <span>{formatMoney(record.amount)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Status</span>
                  <span
                    className={`status-pill ${purchaseReturnStatusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>
              <p className="warehouse-form-note">
                {record.deductStock
                  ? "These items were deducted from inventory."
                  : "Inventory quantities were left unchanged."}
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Supplier</h2>
            </div>
            <div className="panel-body form-body">
              {supplier ? (
                <>
                  <div className="filter-field">
                    <label>Contact</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {supplier.contact || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Email</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {supplier.email || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Phone</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {supplier.phone || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Location</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {[supplier.city, supplier.country]
                          .filter(Boolean)
                          .join(", ") || "Not provided"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="sale-customer-empty">
                  No supplier record found for this return.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
