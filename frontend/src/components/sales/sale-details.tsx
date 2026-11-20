"use client";

import { useRouter } from "next/navigation";
import { useCustomers } from "@/components/customers/customers-store";
import { Icon } from "@/components/ui/icon";
import { dueOf, formatMoney, paymentStatusOf } from "@/lib/sales-data";
import { useSales } from "./sales-store";

export function SaleDetails({ reference }: { reference: string }) {
  const router = useRouter();
  const { sales, deleteSale, hydrated } = useSales();
  const { customers } = useCustomers();

  const sale = sales.find(
    (entry) => entry.reference === reference || entry.id === reference,
  );
  const customer = sale
    ? customers.find((entry) => entry.name === sale.customer)
    : undefined;
  const due = sale ? dueOf(sale) : 0;
  const paymentStatus = sale ? paymentStatusOf(sale) : "Unpaid";
  const paidPercent =
    sale && sale.total > 0
      ? Math.min(100, Math.round((sale.paid / sale.total) * 100))
      : 0;
  const initials = sale
    ? sale.customer
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
          <div className="panel-body">Loading sale…</div>
        </section>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="sales-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Sales</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/sales")}
              >
                All Sales
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Sale Details</span>
            </nav>
            <h1>Sale Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No sale found with reference <strong>{reference}</strong>. It may
              have been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/sales")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to All Sales
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = async () => {
    if (
      window.confirm(
        `Delete sale "${sale.reference}"? This cannot be undone.`,
      )
    ) {
      try {
        await deleteSale(sale.id);
        router.push("/sales");
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
            <span className="crumb-link">Sales</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/sales")}
            >
              All Sales
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{sale.reference}</span>
          </nav>
          <h1>Sale {sale.reference}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(`/sales/${encodeURIComponent(sale.reference)}/edit`)
            }
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Edit sale
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
            Delete sale
          </button>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Sale Details</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Reference</label>
                  <div className="detail-value">
                    <Icon name="barcode" className="w-3.5 h-3.5" />
                    <span className="truncate">{sale.reference}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Date</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.date} 00:00</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Seller</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.seller}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Customer</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.customer}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Warehouse</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.warehouse}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Currency</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.currency}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${sale.status.toLowerCase()}`}
                    >
                      {sale.status}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Shipping Status</label>
                  <div className="detail-value">
                    <span
                      className={`status-pill ${sale.shippingStatus.toLowerCase()}`}
                    >
                      {sale.shippingStatus}
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
                      {formatMoney(sale.total)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Paid</label>
                  <div className="detail-value">
                    <span className="truncate">{formatMoney(sale.paid)}</span>
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
                    <span className="truncate">{sale.paymentMethod}</span>
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
                  <label>Sale ID</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.id}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Reference</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.reference}</span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Note</label>
                  <div className="detail-value">
                    <span className="truncate">{sale.note || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <h2>Customer</h2>
          </div>
          <div className="panel-body form-body image-body">
            <div className="sale-customer-card">
              <div className="sale-customer-avatar">{initials || "?"}</div>
              <div className="sale-customer-copy">
                <strong>{sale.customer}</strong>
                <span>{customer?.type ?? "Customer"}</span>
              </div>
            </div>
            {customer ? (
              <>
                <div className="filter-field">
                  <label>Email</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.email || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Phone</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.phone || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Country</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.country || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>City</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.city || "—"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Address</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {customer.address || "—"}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Credit Limit</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatMoney(customer.creditLimit)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Opening Balance</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {formatMoney(customer.openingBalance)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="sale-customer-empty">
                No customer record found for this sale.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
