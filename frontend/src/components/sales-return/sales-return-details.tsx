"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCustomers } from "@/components/customers/customers-store";
import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";
import {
  formatReturnDate,
  returnItemCount,
  salesReturnStatusClass,
} from "@/lib/sales-returns-data";
import { useSalesReturns } from "./sales-returns-store";

export function SalesReturnDetails({ reference }: { reference: string }) {
  const router = useRouter();
  const { salesReturns, deleteSalesReturn, hydrated } = useSalesReturns();
  const { customers } = useCustomers();
  const record = salesReturns.find(
    (entry) => entry.reference === reference || entry.id === reference,
  );
  const customer = record
    ? customers.find((entry) => entry.name === record.customer)
    : undefined;
  const initials = record
    ? record.customer
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
          <div className="panel-body">Loading sales return...</div>
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
              <span className="crumb-link">Sales</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/sales-return")}
              >
                Sales Returns
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Return Details</span>
            </nav>
            <h1>Sales Return Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No sales return found with reference{" "}
              <strong>{reference}</strong>. It may have been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/sales-return")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Sales Returns
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Delete sales return "${record.reference}"? This cannot be undone.`,
      )
    ) {
      deleteSalesReturn(record.id);
      router.push("/sales-return");
    }
  };

  return (
    <div className="sales-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Sales</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/sales-return")}
            >
              Sales Returns
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{record.reference}</span>
          </nav>
          <h1>Sales Return {record.reference}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(
                `/sales-return/${encodeURIComponent(record.reference)}/edit`,
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
                      {formatReturnDate(record.date)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Original Sale</label>
                  <div className="detail-value">
                    <Link
                      href={`/sales/${encodeURIComponent(record.saleReference)}`}
                      className="sale-link truncate"
                    >
                      {record.saleReference}
                    </Link>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Customer</label>
                  <div className="detail-value">
                    <span className="truncate">{record.customer}</span>
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
                      className={`status-pill ${salesReturnStatusClass(record.status)}`}
                    >
                      {record.status}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Restock</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {record.restock ? "Returned to inventory" : "Not restocked"}
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
                        Unit Price
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
                  <strong>{record.customer}</strong>
                  <span>{record.warehouse}</span>
                </div>
              </div>
              <div className="sale-summary-rows">
                <div className="sale-summary-row">
                  <span>Items Returned</span>
                  <span>{returnItemCount(record.items)}</span>
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
                  <span>Total Refund</span>
                  <span>{formatMoney(record.amount)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Status</span>
                  <span
                    className={`status-pill ${salesReturnStatusClass(record.status)}`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>
              <p className="warehouse-form-note">
                {record.restock
                  ? "These items were returned to inventory."
                  : "These items were kept outside inventory."}
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Customer</h2>
            </div>
            <div className="panel-body form-body">
              {customer ? (
                <>
                  <div className="filter-field">
                    <label>Email</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {customer.email || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Phone</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {customer.phone || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Location</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {[customer.city, customer.country]
                          .filter(Boolean)
                          .join(", ") || "Not provided"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="sale-customer-empty">
                  No customer record found for this return.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
