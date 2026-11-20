"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import {
  defaultPaymentMethod,
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payments-data";
import {
  formatMoney,
  purchaseShippingStatuses,
  purchaseStatuses,
  purchaseSuppliers,
  purchaseWarehouses,
  statusClass,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/purchases-data";
import { UPDATED_FLAG, usePurchases } from "./purchases-store";

type FormState = {
  date: string;
  buyer: string;
  supplier: string;
  warehouse: string;
  currency: string;
  status: PurchaseStatus;
  shippingStatus: string;
  total: string;
  paid: string;
  paymentMethod: PaymentMethod;
  note: string;
};

function numberValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toForm(purchase: Purchase): FormState {
  return {
    date: purchase.date,
    buyer: purchase.buyer,
    supplier: purchase.supplier,
    warehouse: purchase.warehouse,
    currency: purchase.currency,
    status: purchase.status,
    shippingStatus: purchase.shippingStatus,
    total: String(purchase.total),
    paid: String(purchase.paid),
    paymentMethod:
      purchase.paymentMethod ?? defaultPaymentMethod(purchase.reference),
    note: purchase.note ?? "",
  };
}

export function EditPurchase({ reference }: { reference: string }) {
  const router = useRouter();
  const { purchases, updatePurchase, hydrated } = usePurchases();

  const purchase = purchases.find(
    (entry) => entry.reference === reference || entry.id === reference,
  );

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (purchase) setForm(toForm(purchase));
  }, [purchase]);

  if (!hydrated || (purchase && !form)) {
    return (
      <div className="sales-page">
        <section className="panel">
          <div className="panel-body">Loading purchase…</div>
        </section>
      </div>
    );
  }

  if (!purchase || !form) {
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
              <span className="crumb-current">Edit Purchase</span>
            </nav>
            <h1>Edit Purchase</h1>
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

  const setField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const supplierChoices =
    form.supplier && !purchaseSuppliers.includes(form.supplier)
      ? [form.supplier, ...purchaseSuppliers]
      : purchaseSuppliers;

  const previewTotal = numberValue(form.total) ?? 0;
  const previewPaid = numberValue(form.paid) ?? 0;
  const previewDue = Math.max(0, previewTotal - previewPaid);
  const previewPaymentStatus =
    previewPaid <= 0 ? "Unpaid" : previewPaid >= previewTotal ? "Paid" : "Partial";

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (form.date.trim() === "") found.date = "Date is required";
    if (form.buyer.trim() === "") found.buyer = "Buyer is required";
    if (form.supplier.trim() === "") found.supplier = "Supplier is required";
    if (form.warehouse.trim() === "") found.warehouse = "Warehouse is required";
    if (numberValue(form.total) === null) found.total = "Enter a valid total";
    if (numberValue(form.paid) === null) found.paid = "Enter a valid paid amount";
    else if (
      numberValue(form.total) !== null &&
      Number(form.paid) > Number(form.total)
    ) {
      found.paid = "Paid amount cannot exceed the total";
    }
    return found;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = document.querySelector<HTMLElement>(".field-error");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    const total = round2(Number(form.total));
    const paid = round2(Math.min(Number(form.paid), total));

    updatePurchase(purchase.id, {
      ...purchase,
      date: form.date,
      buyer: form.buyer.trim(),
      supplier: form.supplier,
      warehouse: form.warehouse,
      status: form.status,
      currency: form.currency,
      total,
      paid,
      paymentMethod: form.paymentMethod,
      shippingStatus: form.shippingStatus,
      note: form.note.trim() || undefined,
    });
    try {
      window.sessionStorage.setItem(UPDATED_FLAG, purchase.reference);
    } catch {
      // Flag is a nicety only; navigation still works without it.
    }
    router.push("/purchases");
  };

  const detailsHref = `/purchases/${encodeURIComponent(purchase.reference)}`;

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
            <span
              className="crumb-link"
              onClick={() => router.push(detailsHref)}
            >
              {purchase.reference}
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Edit Purchase</span>
          </nav>
          <h1>Edit Purchase</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push(detailsHref)}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-purchase-form"
            className="primary-button"
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Save changes
          </button>
        </div>
      </div>

      <form id="edit-purchase-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Purchase Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-date">Date</label>
                    <DatePicker
                      id="edit-purchase-date"
                      value={form.date}
                      onChange={(value) => {
                        setField("date", value);
                      }}
                      allowClear={false}
                    />
                    {errors.date && (
                      <p className="field-error">{errors.date}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-supplier">Supplier</label>
                    <select
                      id="edit-purchase-supplier"
                      className={`filter-select${errors.supplier ? " invalid" : ""}`}
                      value={form.supplier}
                      onChange={(event) =>
                        setField("supplier", event.target.value)
                      }
                    >
                      {supplierChoices.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    {errors.supplier && (
                      <p className="field-error">{errors.supplier}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-warehouse">Warehouse</label>
                    <select
                      id="edit-purchase-warehouse"
                      className={`filter-select${errors.warehouse ? " invalid" : ""}`}
                      value={form.warehouse}
                      onChange={(event) =>
                        setField("warehouse", event.target.value)
                      }
                    >
                      <option value="">Choose Warehouse</option>
                      {purchaseWarehouses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    {errors.warehouse && (
                      <p className="field-error">{errors.warehouse}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-buyer">Buyer</label>
                    <input
                      id="edit-purchase-buyer"
                      className={`filter-input${errors.buyer ? " invalid" : ""}`}
                      type="text"
                      value={form.buyer}
                      onChange={(event) =>
                        setField("buyer", event.target.value)
                      }
                    />
                    {errors.buyer && (
                      <p className="field-error">{errors.buyer}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-currency">Currency</label>
                    <select
                      id="edit-purchase-currency"
                      className="filter-select"
                      value={form.currency}
                      onChange={(event) =>
                        setField("currency", event.target.value)
                      }
                    >
                      <option value="RWF">RWF - Rwandan Franc</option>
                    </select>
                  </div>
                  <div className="filter-field">
                    <label>Reference</label>
                    <div className="detail-value">
                      <span className="truncate">{purchase.reference}</span>
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
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-total">Total</label>
                    <input
                      id="edit-purchase-total"
                      className={`filter-input${errors.total ? " invalid" : ""}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.total}
                      onChange={(event) =>
                        setField("total", event.target.value)
                      }
                    />
                    {errors.total && (
                      <p className="field-error">{errors.total}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-paid">Paid</label>
                    <input
                      id="edit-purchase-paid"
                      className={`filter-input${errors.paid ? " invalid" : ""}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.paid}
                      onChange={(event) =>
                        setField("paid", event.target.value)
                      }
                    />
                    {errors.paid && (
                      <p className="field-error">{errors.paid}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-payment-method">
                      Payment Method
                    </label>
                    <select
                      id="edit-purchase-payment-method"
                      className="filter-select"
                      value={form.paymentMethod}
                      onChange={(event) =>
                        setField(
                          "paymentMethod",
                          event.target.value as PaymentMethod,
                        )
                      }
                    >
                      {paymentMethods.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label>Due</label>
                    <div className="detail-value">
                      <span className="truncate">
                        {formatMoney(previewDue)}
                      </span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label>Payment Status</label>
                    <div className="detail-value">
                      <span
                        className={`status-pill ${previewPaymentStatus.toLowerCase()}`}
                      >
                        {previewPaymentStatus}
                      </span>
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
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-status">Status</label>
                    <select
                      id="edit-purchase-status"
                      className="filter-select"
                      value={form.status}
                      onChange={(event) =>
                        setField("status", event.target.value as PurchaseStatus)
                      }
                    >
                      {purchaseStatuses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-purchase-shipping">
                      Shipping Status
                    </label>
                    <select
                      id="edit-purchase-shipping"
                      className="filter-select"
                      value={form.shippingStatus}
                      onChange={(event) =>
                        setField("shippingStatus", event.target.value)
                      }
                    >
                      {purchaseShippingStatuses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field span-2">
                    <label htmlFor="edit-purchase-note">Note</label>
                    <textarea
                      id="edit-purchase-note"
                      className="filter-textarea"
                      rows={3}
                      placeholder="A few words ..."
                      value={form.note}
                      onChange={(event) =>
                        setField("note", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Order Summary</h2>
              </div>
              <div className="panel-body">
                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Total</span>
                    <span>{formatMoney(previewTotal)}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Paid</span>
                    <span>{formatMoney(previewPaid)}</span>
                  </div>
                  <div className="sale-summary-row discount">
                    <span>Due</span>
                    <span>{formatMoney(previewDue)}</span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>Payment Status</span>
                    <span
                      className={`status-pill ${statusClass(previewPaymentStatus)}`}
                    >
                      {previewPaymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </div>
  );
}
