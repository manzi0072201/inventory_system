"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { usePurchases } from "@/components/purchases/purchases-store";
import { dueOf, formatMoney, paymentStatusOf } from "@/lib/purchases-data";
import { useSuppliers } from "./suppliers-store";

function initialsOf(name: string): string {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function SupplierDetails({ id }: { id: string }) {
  const router = useRouter();
  const { suppliers, deleteSupplier, hydrated } = useSuppliers();
  const { purchases } = usePurchases();
  const supplier = suppliers.find((entry) => entry.id === id || entry.name === id);

  const relatedPurchases = useMemo(
    () => (supplier ? [...purchases].filter((p) => p.supplier === supplier.name).sort((a, b) => b.date.localeCompare(a.date)) : []),
    [supplier, purchases],
  );

  const totalPurchased = relatedPurchases.reduce((sum, p) => sum + p.total, 0);
  const totalDue = relatedPurchases.reduce((sum, p) => sum + dueOf(p), 0);
  const outstanding = totalDue + (supplier?.openingBalance ?? 0);
  const lastPurchase = relatedPurchases[0]?.date ?? "-";

  if (!hydrated) {
    return <div className="products-page"><section className="panel"><div className="panel-body">Loading supplier...</div></section></div>;
  }

  if (!supplier) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Suppliers</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-link" onClick={() => router.push("/suppliers")}>All Suppliers</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Supplier Details</span>
            </nav>
            <h1>Supplier Details</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>No supplier found with ID <strong>{id}</strong>. It may have been deleted.</p>
            <button type="button" className="primary-button" onClick={() => router.push("/suppliers")}>
              <Icon name="arrowLeft" className="w-3.5 h-3.5" /> Back to Suppliers
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${supplier.name}"? Their purchase history will remain unchanged. This cannot be undone.`)) {
      deleteSupplier(supplier.id);
      router.push("/suppliers");
    }
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Suppliers</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-link" onClick={() => router.push("/suppliers")}>All Suppliers</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">{supplier.name}</span>
          </nav>
          <h1>{supplier.name}</h1>
        </div>
        <div className="heading-actions">
          <button type="button" className="primary-button" onClick={() => router.push(`/suppliers/${encodeURIComponent(supplier.id)}/edit`)}>
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} /> Edit supplier
          </button>
          <button type="button" className="ghost-button danger" onClick={handleDelete}>
            <Icon name="trash" className="w-3.5 h-3.5" /> Delete supplier
          </button>
        </div>
      </div>

      <section className="stock-summary-grid" aria-label="Supplier summary">
        <div className="sales-summary-card"><div className="sales-summary-icon purple"><Icon name="purchases" className="w-5 h-5" strokeWidth={1.8} /></div><div className="sales-summary-copy"><span>Total Purchased</span><strong>{formatMoney(totalPurchased)}</strong></div></div>
        <div className="sales-summary-card"><div className="sales-summary-icon blue"><Icon name="list" className="w-5 h-5" strokeWidth={1.8} /></div><div className="sales-summary-copy"><span>Orders</span><strong>{relatedPurchases.length.toLocaleString()}</strong></div></div>
        <div className="sales-summary-card"><div className="sales-summary-icon amber"><Icon name="wallet" className="w-5 h-5" strokeWidth={1.8} /></div><div className="sales-summary-copy"><span>Outstanding</span><strong>{formatMoney(outstanding)}</strong></div></div>
        <div className="sales-summary-card"><div className="sales-summary-icon green"><Icon name="card" className="w-5 h-5" strokeWidth={1.8} /></div><div className="sales-summary-copy"><span>Credit Limit</span><strong>{formatMoney(supplier.creditLimit)}</strong></div></div>
      </section>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading"><h2>Supplier Details</h2></div>
            <div className="panel-body form-body">
              <div className="customer-form-profile">
                <span className="customer-avatar">{initialsOf(supplier.name)}</span>
                <div><strong>{supplier.name}</strong><span>{supplier.category || "Supplier"}</span></div>
              </div>
              <div className="detail-grid">
                <div className="filter-field"><label>Supplier ID</label><div className="detail-value"><Icon name="barcode" className="w-3.5 h-3.5" /><span className="truncate">{supplier.id}</span></div></div>
                <div className="filter-field"><label>Category</label><div className="detail-value"><span className="customer-type-pill">{supplier.category || "-"}</span></div></div>
                <div className="filter-field"><label>Contact Person</label><div className="detail-value"><span className="truncate">{supplier.contact || "-"}</span></div></div>
                <div className="filter-field"><label>Email</label><div className="detail-value"><Icon name="mail" className="w-3.5 h-3.5" /><span className="truncate">{supplier.email || "-"}</span></div></div>
                <div className="filter-field"><label>Phone</label><div className="detail-value"><Icon name="phone" className="w-3.5 h-3.5" /><span className="truncate">{supplier.phone || "-"}</span></div></div>
                <div className="filter-field"><label>Tax Number</label><div className="detail-value"><span className="truncate">{supplier.taxNumber || "-"}</span></div></div>
                <div className="filter-field"><label>Country</label><div className="detail-value"><span className="truncate">{supplier.country || "-"}</span></div></div>
                <div className="filter-field"><label>City</label><div className="detail-value"><span className="truncate">{supplier.city || "-"}</span></div></div>
                <div className="filter-field"><label>Created</label><div className="detail-value"><span className="truncate">{new Date(supplier.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</span></div></div>
                <div className="filter-field span-2"><label>Address</label><div className="detail-value"><span className="truncate">{supplier.address || "-"}</span></div></div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Purchase History</h2>
              <span className="panel-count">{relatedPurchases.length} purchase{relatedPurchases.length === 1 ? "" : "s"}</span>
            </div>
            <div className="table-scroll">
              <table className="sales-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Reference</th>
                    <th scope="col">Status</th>
                    <th scope="col">Payment</th>
                    <th className="right-align" scope="col">Total</th>
                    <th className="right-align" scope="col">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedPurchases.map((purchase) => {
                    const payment = paymentStatusOf(purchase);
                    return (
                      <tr key={purchase.id}>
                        <td>{purchase.date}</td>
                        <td><Link href={`/purchases/${encodeURIComponent(purchase.reference)}`} className="sale-link">{purchase.reference}</Link></td>
                        <td><span className={`status-pill ${purchase.status.toLowerCase()}`}>{purchase.status}</span></td>
                        <td><span className={`status-pill ${payment.toLowerCase()}`}>{payment}</span></td>
                        <td className="right-align sale-amount">{formatMoney(purchase.total)}</td>
                        <td className="right-align sale-amount">{formatMoney(dueOf(purchase))}</td>
                      </tr>
                    );
                  })}
                  {relatedPurchases.length === 0 && (
                    <tr className="empty-row"><td colSpan={6}>No purchases recorded for this supplier</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="details-column">
          <section className="panel">
            <div className="panel-heading"><h2>Account Summary</h2></div>
            <div className="panel-body">
              <div className="sale-summary-rows">
                <div className="sale-summary-row"><span>Opening balance</span><span>{formatMoney(supplier.openingBalance)}</span></div>
                <div className="sale-summary-row"><span>Total purchased</span><span>{formatMoney(totalPurchased)}</span></div>
                <div className="sale-summary-row"><span>Outstanding</span><span>{formatMoney(outstanding)}</span></div>
                <div className="sale-summary-row"><span>Credit limit</span><span>{formatMoney(supplier.creditLimit)}</span></div>
                <div className="sale-summary-row"><span>Last purchase</span><span>{lastPurchase}</span></div>
                <div className="sale-summary-row grand"><span>Category</span><span>{supplier.category || "-"}</span></div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading"><h2>Contact</h2></div>
            <div className="panel-body">
              <div className="sale-summary-rows">
                <div className="sale-summary-row"><span>Contact person</span><span>{supplier.contact || "-"}</span></div>
                <div className="sale-summary-row"><span>Email</span><span>{supplier.email || "-"}</span></div>
                <div className="sale-summary-row"><span>Phone</span><span>{supplier.phone || "-"}</span></div>
                <div className="sale-summary-row"><span>Location</span><span>{[supplier.city, supplier.country].filter(Boolean).join(", ") || "-"}</span></div>
                <div className="sale-summary-row grand"><span>Address</span><span>{supplier.address || "-"}</span></div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
