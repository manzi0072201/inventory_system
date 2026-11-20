"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useSales } from "@/components/sales/sales-store";
import {
  dueOf,
  formatMoney,
  paymentStatusOf,
} from "@/lib/sales-data";
import { useCustomers } from "./customers-store";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CustomerDetails({ id }: { id: string }) {
  const router = useRouter();
  const { customers, deleteCustomer, hydrated } = useCustomers();
  const { sales } = useSales();
  const customer = customers.find(
    (entry) => entry.id === id || entry.name === id,
  );

  const relatedSales = useMemo(
    () =>
      customer
        ? [...sales]
            .filter((sale) => sale.customer === customer.name)
            .sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [customer, sales],
  );

  const totalSpent = relatedSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalDue = relatedSales.reduce((sum, sale) => sum + dueOf(sale), 0);
  const outstanding = totalDue + (customer?.openingBalance ?? 0);
  const lastOrder = relatedSales[0]?.date ?? "-";

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading customer...</div>
        </section>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Customers</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/people")}
              >
                All Customers
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Customer Details</span>
            </nav>
            <h1>Customer Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No customer found with ID <strong>{id}</strong>. It may have been
              deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/people")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Customers
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = () => {
    if (
      window.confirm(
        `Delete "${customer.name}"? Their sales history will remain unchanged. This cannot be undone.`,
      )
    ) {
      deleteCustomer(customer.id);
      router.push("/people");
    }
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Customers</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/people")}
            >
              All Customers
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{customer.name}</span>
          </nav>
          <h1>{customer.name}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(`/people/${encodeURIComponent(customer.id)}/edit`)
            }
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Edit customer
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={handleDelete}
          >
            <Icon name="trash" className="w-3.5 h-3.5" />
            Delete customer
          </button>
        </div>
      </div>

      <section className="stock-summary-grid" aria-label="Customer summary">
        <div className="sales-summary-card">
          <div className="sales-summary-icon purple">
            <Icon name="sales" className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="sales-summary-copy">
            <span>Total Spent</span>
            <strong>{formatMoney(totalSpent)}</strong>
          </div>
        </div>
        <div className="sales-summary-card">
          <div className="sales-summary-icon blue">
            <Icon name="list" className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="sales-summary-copy">
            <span>Orders</span>
            <strong>{relatedSales.length.toLocaleString()}</strong>
          </div>
        </div>
        <div className="sales-summary-card">
          <div className="sales-summary-icon amber">
            <Icon name="wallet" className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="sales-summary-copy">
            <span>Outstanding</span>
            <strong>{formatMoney(outstanding)}</strong>
          </div>
        </div>
        <div className="sales-summary-card">
          <div className="sales-summary-icon green">
            <Icon name="card" className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="sales-summary-copy">
            <span>Credit Limit</span>
            <strong>{formatMoney(customer.creditLimit)}</strong>
          </div>
        </div>
      </section>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Customer Details</h2>
            </div>
            <div className="panel-body form-body">
              <div className="customer-form-profile">
                <span className="customer-avatar">
                  {initialsOf(customer.name)}
                </span>
                <div>
                  <strong>{customer.name}</strong>
                  <span>{customer.type} customer</span>
                </div>
              </div>
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Customer ID</label>
                  <div className="detail-value">
                    <Icon name="barcode" className="w-3.5 h-3.5" />
                    <span className="truncate">{customer.id}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Customer Type</label>
                  <div className="detail-value">
                    <span
                      className={`customer-type-pill ${customer.type.toLowerCase()}`}
                    >
                      {customer.type}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Email</label>
                  <div className="detail-value">
                    <Icon name="mail" className="w-3.5 h-3.5" />
                    <span className="truncate">{customer.email || "-"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Phone</label>
                  <div className="detail-value">
                    <Icon name="phone" className="w-3.5 h-3.5" />
                    <span className="truncate">{customer.phone || "-"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Country</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.country || "-"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>City</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.city || "-"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Tax Number</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.taxNumber || "-"}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Created</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {new Date(customer.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Address</label>
                  <div className="detail-value">
                    <span className="truncate">{customer.address || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Sales History</h2>
              <span className="panel-count">
                {relatedSales.length} sale{relatedSales.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="table-scroll">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Status</th>
                    <th scope="col">Payment</th>
                    <th className="right-align" scope="col">
                      Total
                    </th>
                    <th className="right-align" scope="col">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relatedSales.map((sale) => {
                    const payment = paymentStatusOf(sale);
                    return (
                      <tr key={sale.id}>
                        <td>{sale.date}</td>
                        <td>
                          <Link
                            href={`/sales/${encodeURIComponent(sale.reference)}`}
                            className="sale-link"
                          >
                            {sale.reference}
                          </Link>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${sale.status.toLowerCase()}`}
                          >
                            {sale.status}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${payment.toLowerCase()}`}
                          >
                            {payment}
                          </span>
                        </td>
                        <td className="right-align sale-amount">
                          {formatMoney(sale.total)}
                        </td>
                        <td className="right-align sale-amount">
                          {formatMoney(dueOf(sale))}
                        </td>
                      </tr>
                    );
                  })}
                  {relatedSales.length === 0 && (
                    <tr className="empty-row">
                      <td colSpan={6}>No sales recorded for this customer</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Account Summary</h2>
            </div>
            <div className="panel-body">
              <div className="sale-summary-rows">
                <div className="sale-summary-row">
                  <span>Opening balance</span>
                  <span>{formatMoney(customer.openingBalance)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Total spent</span>
                  <span>{formatMoney(totalSpent)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Outstanding</span>
                  <span>{formatMoney(outstanding)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Credit limit</span>
                  <span>{formatMoney(customer.creditLimit)}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Last order</span>
                  <span>{lastOrder}</span>
                </div>
                <div className="sale-summary-row grand">
                  <span>Customer type</span>
                  <span>{customer.type}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Contact</h2>
            </div>
            <div className="panel-body">
              <div className="sale-summary-rows">
                <div className="sale-summary-row">
                  <span>Email</span>
                  <span>{customer.email || "-"}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Phone</span>
                  <span>{customer.phone || "-"}</span>
                </div>
                <div className="sale-summary-row">
                  <span>Location</span>
                  <span>
                    {[customer.city, customer.country]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </span>
                </div>
                <div className="sale-summary-row grand">
                  <span>Address</span>
                  <span>{customer.address || "-"}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
