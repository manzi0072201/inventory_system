"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/components/customers/customers-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import {
  defaultPaymentMethod,
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payments-data";
import {
  formatMoney,
  saleShippingStatuses,
  saleStatuses,
  saleWarehouses,
  type Sale,
  type SaleStatus,
} from "@/lib/sales-data";
import { UPDATED_FLAG, useSales } from "./sales-store";

type FormState = {
  date: string;
  seller: string;
  customer: string;
  warehouse: string;
  currency: string;
  status: SaleStatus;
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

function toForm(sale: Sale): FormState {
  return {
    date: sale.date,
    seller: sale.seller,
    customer: sale.customer,
    warehouse: sale.warehouse,
    currency: sale.currency,
    status: sale.status,
    shippingStatus: sale.shippingStatus,
    total: String(sale.total),
    paid: String(sale.paid),
    paymentMethod:
      sale.paymentMethod ?? defaultPaymentMethod(sale.reference),
    note: sale.note ?? "",
  };
}

export function EditSale({ reference }: { reference: string }) {
  const router = useRouter();
  const { sales, updateSale, hydrated } = useSales();
  const { customers } = useCustomers();

  const sale = sales.find(
    (entry) => entry.reference === reference || entry.id === reference,
  );

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sale) setForm(toForm(sale));
  }, [sale]);

  if (!hydrated || (sale && !form)) {
    return (
      <div className="sales-page">
        <section className="panel">
          <div className="panel-body">Loading sale…</div>
        </section>
      </div>
    );
  }

  if (!sale || !form) {
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
              <span className="crumb-current">Edit Sale</span>
            </nav>
            <h1>Edit Sale</h1>
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

  const customerNames = customers.map((entry) => entry.name);
  const customerChoices =
    form.customer && !customerNames.includes(form.customer)
      ? [form.customer, ...customerNames]
      : customerNames;

  const previewTotal = numberValue(form.total) ?? 0;
  const previewPaid = numberValue(form.paid) ?? 0;
  const previewDue = Math.max(0, previewTotal - previewPaid);
  const previewPaymentStatus =
    previewPaid <= 0 ? "Unpaid" : previewPaid >= previewTotal ? "Paid" : "Partial";

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (form.date.trim() === "") found.date = "Date is required";
    if (form.seller.trim() === "") found.seller = "Seller is required";
    if (form.customer.trim() === "") found.customer = "Customer is required";
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

    updateSale(sale.id, {
      ...sale,
      date: form.date,
      seller: form.seller.trim(),
      customer: form.customer,
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
      window.sessionStorage.setItem(UPDATED_FLAG, sale.reference);
    } catch {
      // Flag is a nicety only; navigation still works without it.
    }
    router.push("/sales");
  };

  const detailsHref = `/sales/${encodeURIComponent(sale.reference)}`;

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
            <span
              className="crumb-link"
              onClick={() => router.push(detailsHref)}
            >
              {sale.reference}
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Edit Sale</span>
          </nav>
          <h1>Edit Sale</h1>
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
            form="edit-sale-form"
            className="primary-button"
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Save changes
          </button>
        </div>
      </div>

      <form id="edit-sale-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Sale Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="edit-sale-date">Date</label>
                    <DatePicker
                      id="edit-sale-date"
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
                    <label htmlFor="edit-sale-customer">Customer</label>
                    <select
                      id="edit-sale-customer"
                      className={`filter-select${errors.customer ? " invalid" : ""}`}
                      value={form.customer}
                      onChange={(event) =>
                        setField("customer", event.target.value)
                      }
                    >
                      {customerChoices.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    {errors.customer && (
                      <p className="field-error">{errors.customer}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-sale-warehouse">Warehouse</label>
                    <select
                      id="edit-sale-warehouse"
                      className={`filter-select${errors.warehouse ? " invalid" : ""}`}
                      value={form.warehouse}
                      onChange={(event) =>
                        setField("warehouse", event.target.value)
                      }
                    >
                      <option value="">Choose Warehouse</option>
                      {saleWarehouses.map((entry) => (
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
                    <label htmlFor="edit-sale-seller">Seller</label>
                    <input
                      id="edit-sale-seller"
                      className={`filter-input${errors.seller ? " invalid" : ""}`}
                      type="text"
                      value={form.seller}
                      onChange={(event) =>
                        setField("seller", event.target.value)
                      }
                    />
                    {errors.seller && (
                      <p className="field-error">{errors.seller}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-sale-currency">Currency</label>
                    <select
                      id="edit-sale-currency"
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
                      <span className="truncate">{sale.reference}</span>
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
                    <label htmlFor="edit-sale-total">Total</label>
                    <input
                      id="edit-sale-total"
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
                    <label htmlFor="edit-sale-paid">Paid</label>
                    <input
                      id="edit-sale-paid"
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
                    <label htmlFor="edit-sale-payment-method">
                      Payment Method
                    </label>
                    <select
                      id="edit-sale-payment-method"
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
                    <label htmlFor="edit-sale-status">Status</label>
                    <select
                      id="edit-sale-status"
                      className="filter-select"
                      value={form.status}
                      onChange={(event) =>
                        setField("status", event.target.value as SaleStatus)
                      }
                    >
                      {saleStatuses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="edit-sale-shipping">Shipping Status</label>
                    <select
                      id="edit-sale-shipping"
                      className="filter-select"
                      value={form.shippingStatus}
                      onChange={(event) =>
                        setField("shippingStatus", event.target.value)
                      }
                    >
                      {saleShippingStatuses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field span-2">
                    <label htmlFor="edit-sale-note">Note</label>
                    <textarea
                      id="edit-sale-note"
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
                    <span>{previewPaymentStatus}</span>
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
