"use client";

import { useState, type FormEvent } from "react";
import { useCustomers } from "@/components/customers/customers-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import {
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payments-data";
import {
  dueOf,
  formatMoney,
  paymentStatusOf,
  saleShippingStatuses,
  saleStatuses,
  saleWarehouses,
  type Sale,
  type SaleStatus,
} from "@/lib/sales-data";

export type SaleModalMode = "create" | "edit" | "view";

type SaleModalProps = {
  mode: SaleModalMode;
  sale: Sale | null;
  nextReference?: string;
  onClose: () => void;
  onSave: (sale: Sale) => void;
};

function today(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function SaleModal({
  mode,
  sale,
  nextReference = "",
  onClose,
  onSave,
}: SaleModalProps) {
  const { customers } = useCustomers();
  const [date, setDate] = useState(sale?.date ?? today());
  const [seller, setSeller] = useState(sale?.seller ?? "Sara Electronics");
  const [customer, setCustomer] = useState(
    sale?.customer ?? customers[0]?.name ?? "",
  );
  const [warehouse, setWarehouse] = useState(
    sale?.warehouse ?? saleWarehouses[0],
  );
  const [status, setStatus] = useState<SaleStatus>(sale?.status ?? "Completed");
  const [shippingStatus, setShippingStatus] = useState(
    sale?.shippingStatus ?? saleShippingStatuses[0],
  );
  const [total, setTotal] = useState(sale ? String(sale.total) : "");
  const [paid, setPaid] = useState(sale ? String(sale.paid) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    sale?.paymentMethod ?? "Cash",
  );
  const [error, setError] = useState<string | null>(null);

  const title =
    mode === "create"
      ? "Create Sale"
      : mode === "edit"
        ? "Edit Sale"
        : "Sale Details";

  const customerNames = customers.map((entry) => entry.name);
  const customerChoices =
    customer && !customerNames.includes(customer)
      ? [customer, ...customerNames]
      : customerNames;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "view") return;
    const totalValue = Number(total);
    const paidValue = paid.trim() === "" ? 0 : Number(paid);

    if (date === "") {
      setError("Date is required.");
      return;
    }
    if (seller.trim() === "") {
      setError("Seller is required.");
      return;
    }
    if (total.trim() === "") {
      setError("Total is required.");
      return;
    }
    if (!Number.isFinite(totalValue) || totalValue < 0) {
      setError("Total must be a number greater than or equal to 0.");
      return;
    }
    if (!Number.isFinite(paidValue) || paidValue < 0) {
      setError("Paid amount must be a number greater than or equal to 0.");
      return;
    }
    if (paidValue > totalValue) {
      setError("Paid amount cannot exceed the total.");
      return;
    }

    const reference = sale?.reference ?? nextReference;
    onSave({
      id: sale?.id ?? reference,
      date,
      reference,
      seller: seller.trim(),
      customer,
      warehouse,
      status,
      currency: "RWF",
      total: totalValue,
      paid: paidValue,
      paymentMethod,
      shippingStatus,
      note: sale?.note,
    });
  };

  return (
    <div
      className="modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="modal sale-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-modal-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="panel-heading">
          <h2 id="sale-modal-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>

        {mode === "view" && sale ? (
          <div className="modal-body">
            <div className="sale-detail-grid">
              <div className="filter-field">
                <label>Reference</label>
                <div className="detail-value">{sale.reference}</div>
              </div>
              <div className="filter-field">
                <label>Date</label>
                <div className="detail-value">{sale.date} 00:00</div>
              </div>
              <div className="filter-field">
                <label>Seller</label>
                <div className="detail-value">{sale.seller}</div>
              </div>
              <div className="filter-field">
                <label>Customer</label>
                <div className="detail-value">{sale.customer}</div>
              </div>
              <div className="filter-field">
                <label>Warehouse</label>
                <div className="detail-value">{sale.warehouse}</div>
              </div>
              <div className="filter-field">
                <label>Status</label>
                <div className="detail-value">
                  <span className={`status-pill ${sale.status.toLowerCase()}`}>
                    {sale.status}
                  </span>
                </div>
              </div>
              <div className="filter-field">
                <label>Payment Method</label>
                <div className="detail-value">{sale.paymentMethod}</div>
              </div>
              <div className="filter-field">
                <label>Payment Status</label>
                <div className="detail-value">{paymentStatusOf(sale)}</div>
              </div>
              <div className="filter-field">
                <label>Shipping Status</label>
                <div className="detail-value">{sale.shippingStatus}</div>
              </div>
              <div className="filter-field">
                <label>Currency</label>
                <div className="detail-value">{sale.currency}</div>
              </div>
              <div className="filter-field">
                <label>Total</label>
                <div className="detail-value">{formatMoney(sale.total)}</div>
              </div>
              <div className="filter-field">
                <label>Paid</label>
                <div className="detail-value">{formatMoney(sale.paid)}</div>
              </div>
              <div className="filter-field">
                <label>Due</label>
                <div className="detail-value">{formatMoney(dueOf(sale))}</div>
              </div>
              {sale.note ? (
                <div className="filter-field span-2">
                  <label>Note</label>
                  <div className="detail-value">{sale.note}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="form-grid">
              <div className="filter-field">
                <label htmlFor="sale-form-date">Date</label>
                <DatePicker
                  id="sale-form-date"
                  value={date}
                  onChange={setDate}
                  allowClear={false}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-seller">Seller</label>
                <input
                  id="sale-form-seller"
                  className="filter-input"
                  type="text"
                  value={seller}
                  onChange={(event) => setSeller(event.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-customer">Customer</label>
                <select
                  id="sale-form-customer"
                  className="filter-select"
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                >
                  {customerChoices.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-warehouse">Warehouse</label>
                <select
                  id="sale-form-warehouse"
                  className="filter-select"
                  value={warehouse}
                  onChange={(event) => setWarehouse(event.target.value)}
                >
                  {saleWarehouses.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-status">Status</label>
                <select
                  id="sale-form-status"
                  className="filter-select"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as SaleStatus)
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
                <label htmlFor="sale-form-shipping">Shipping Status</label>
                <select
                  id="sale-form-shipping"
                  className="filter-select"
                  value={shippingStatus}
                  onChange={(event) => setShippingStatus(event.target.value)}
                >
                  {saleShippingStatuses.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-total">Total</label>
                <input
                  id="sale-form-total"
                  className="filter-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={total}
                  onChange={(event) => setTotal(event.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-paid">Paid</label>
                <input
                  id="sale-form-paid"
                  className="filter-input"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={paid}
                  onChange={(event) => setPaid(event.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="sale-form-payment-method">
                  Payment Method
                </label>
                <select
                  id="sale-form-payment-method"
                  className="filter-select"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                >
                  {paymentMethods.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </div>
              {error ? <p className="field-error span-2">{error}</p> : null}
            </div>
          </div>
        )}

        <div className="modal-footer">
          {mode === "view" ? (
            <button type="button" className="ghost-button" onClick={onClose}>
              Close
            </button>
          ) : (
            <>
              <button type="button" className="ghost-button" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                {mode === "create" ? "Create Sale" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
