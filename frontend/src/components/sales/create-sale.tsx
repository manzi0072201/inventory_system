"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CustomerModal } from "@/components/customers/customer-modal";
import { useCustomers } from "@/components/customers/customers-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/components/products/products-store";
import type { Customer } from "@/lib/customers-data";
import {
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payments-data";
import {
  formatMoney,
  saleStatuses,
  saleWarehouses,
  type Sale,
  type SaleStatus,
} from "@/lib/sales-data";
import { CREATED_FLAG, useSales } from "./sales-store";

type PaymentChoice = "Pending" | "Paid" | "Partial";

type LineItem = {
  productId: string;
  name: string;
  code: string;
  price: number;
  stock: number;
  quantity: number;
  discount: string;
  tax: string;
};

type Errors = Record<string, string>;

const discountTypes = ["Fixed", "Percentage"] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function numberValue(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function lineTotals(item: LineItem) {
  const gross = item.price * item.quantity;
  const discount = Math.min(numberValue(item.discount), gross);
  const taxable = Math.max(0, gross - discount);
  const tax = (taxable * Math.min(100, numberValue(item.tax))) / 100;
  return {
    discount,
    tax,
    subtotal: taxable + tax,
  };
}

export function CreateSale() {
  const router = useRouter();
  const { products } = useProducts();
  const { customers, addCustomer, nextId } = useCustomers();
  const { addSale, nextReference } = useSales();

  const [date, setDate] = useState(today());
  const [customer, setCustomer] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [warehouse, setWarehouse] = useState("");
  const [currency, setCurrency] = useState("RWF");
  const [status, setStatus] = useState<SaleStatus>("Completed");
  const [orderTax, setOrderTax] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [discountType, setDiscountType] =
    useState<(typeof discountTypes)[number]>("Fixed");
  const [shipping, setShipping] = useState("0");
  const [note, setNote] = useState("");
  const [paymentChoice, setPaymentChoice] =
    useState<PaymentChoice>("Pending");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Cash");
  const [paid, setPaid] = useState("0");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  const clearError = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const saveCustomer = (record: Customer) => {
    const existing = customers.find(
      (entry) => entry.name.toLowerCase() === record.name.toLowerCase(),
    );
    if (existing) {
      setCustomer(existing.name);
    } else {
      addCustomer(record);
      setCustomer(record.name);
    }
    setCustomerModalOpen(false);
    clearError("customer");
  };

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter(
        (product) =>
          product.quantity > 0 &&
          (product.name.toLowerCase().includes(query) ||
            product.code.toLowerCase().includes(query)),
      )
      .slice(0, 8);
  }, [products, search]);

  const itemsTotal = useMemo(
    () => items.reduce((sum, item) => sum + lineTotals(item).subtotal, 0),
    [items],
  );

  const orderTaxAmount = useMemo(
    () => (itemsTotal * Math.min(100, numberValue(orderTax))) / 100,
    [itemsTotal, orderTax],
  );

  const orderDiscountAmount = useMemo(() => {
    const value = numberValue(discount);
    if (discountType === "Percentage") {
      return (itemsTotal * Math.min(100, value)) / 100;
    }
    return Math.min(itemsTotal, value);
  }, [discount, discountType, itemsTotal]);

  const shippingAmount = numberValue(shipping);

  const grandTotal = Math.max(
    0,
    itemsTotal + orderTaxAmount - orderDiscountAmount + shippingAmount,
  );

  const addProduct = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product || product.quantity <= 0) return;
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(item.stock, item.quantity + 1),
              }
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          code: product.code,
          price: product.price,
          stock: product.quantity,
          quantity: 1,
          discount: "0",
          tax: "0",
        },
      ];
    });
    setSearch("");
    clearError("items");
  };

  const updateItem = (productId: string, changes: Partial<LineItem>) => {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId ? { ...item, ...changes } : item,
      ),
    );
  };

  const removeItem = (productId: string) => {
    setItems((current) =>
      current.filter((item) => item.productId !== productId),
    );
  };

  const validate = (): Errors => {
    const found: Errors = {};
    if (!date) found.date = "Date is required";
    if (!customer) found.customer = "Customer is required";
    if (!warehouse) found.warehouse = "Warehouse is required";
    if (items.length === 0) found.items = "Add at least one product";
    if (numberValue(discount) > 0) {
      if (discountType === "Percentage" && numberValue(discount) > 100) {
        found.discount = "Percentage cannot exceed 100";
      }
      if (
        discountType === "Fixed" &&
        numberValue(discount) > itemsTotal
      ) {
        found.discount = "Discount cannot exceed the items total";
      }
    }
    if (paymentChoice === "Partial") {
      const paidValue = numberValue(paid);
      if (paidValue <= 0) {
        found.paid = "Enter the amount paid";
      } else if (paidValue > grandTotal) {
        found.paid = "Paid amount cannot exceed the total";
      }
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

    const total = round2(grandTotal);
    const paidValue =
      paymentChoice === "Paid"
        ? total
        : paymentChoice === "Partial"
          ? round2(Math.min(numberValue(paid), total))
          : 0;

    const sale: Sale = {
      id: nextReference,
      date,
      reference: nextReference,
      seller: "Sara Electronics",
      customer,
      warehouse,
      status,
      currency,
      discountAmount: orderDiscountAmount,
      taxAmount: orderTaxAmount,
      shippingAmount,
      total,
      paid: paidValue,
      paymentMethod,
      shippingStatus: "Packed",
      note: note.trim() || undefined,
      lineItems: items.map((item) => {
        const totals = lineTotals(item);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: totals.discount,
          taxAmount: totals.tax,
        };
      }),
    };

    addSale(sale);
    try {
      window.sessionStorage.setItem(CREATED_FLAG, sale.reference);
    } catch {
      // Flag is a nicety only; navigation still works without it.
    }
    router.push("/sales");
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
            <span className="crumb-current">Create Sale</span>
          </nav>
          <h1>Create Sale</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push("/sales")}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-sale-form"
            className="primary-button"
          >
            <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Submit
          </button>
        </div>
      </div>

      <form id="create-sale-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Sale Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  <div className="filter-field">
                    <label htmlFor="sale-date">Date</label>
                    <DatePicker
                      id="sale-date"
                      value={date}
                      onChange={(value) => {
                        setDate(value);
                        clearError("date");
                      }}
                      allowClear={false}
                    />
                    {errors.date && (
                      <p className="field-error">{errors.date}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="sale-customer">Customer</label>
                    <div className="customer-field-row">
                      <select
                        id="sale-customer"
                        className={`filter-select${errors.customer ? " invalid" : ""}`}
                        value={customer}
                        onChange={(event) => {
                          setCustomer(event.target.value);
                          clearError("customer");
                        }}
                      >
                        <option value="">Choose Customer</option>
                        {customers.map((entry) => (
                          <option key={entry.id} value={entry.name}>
                            {entry.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="customer-add-button"
                        aria-label="Add new customer"
                        title="Add new customer"
                        aria-haspopup="dialog"
                        onClick={() => setCustomerModalOpen(true)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <line x1="12" x2="12" y1="5" y2="19" />
                          <line x1="5" x2="19" y1="12" y2="12" />
                        </svg>
                      </button>
                    </div>
                    {errors.customer && (
                      <p className="field-error">{errors.customer}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="sale-warehouse">Warehouse</label>
                    <select
                      id="sale-warehouse"
                      className={`filter-select${errors.warehouse ? " invalid" : ""}`}
                      value={warehouse}
                      onChange={(event) => {
                        setWarehouse(event.target.value);
                        clearError("warehouse");
                      }}
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
                    <label htmlFor="sale-currency">Currency</label>
                    <select
                      id="sale-currency"
                      className="filter-select"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                    >
                      <option value="RWF">RWF - Rwandan Franc</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel sale-products-panel">
              <div className="panel-heading">
                <h2>Products</h2>
              </div>
              <div className="panel-body form-body">
                <div className="product-search">
                  <div className="table-search product-search-input">
                    <input
                      type="text"
                      placeholder="Scan/Search Product by Code Or Name"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <Icon name="search" className="w-3.5 h-3.5" />
                  </div>
                  {search.trim() !== "" ? (
                    <div className="product-search-results">
                      {searchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="product-search-result"
                          onClick={() => addProduct(product.id)}
                        >
                          <span>
                            <strong>{product.name}</strong>
                            <small>
                              {product.code} · {product.quantity} in stock
                            </small>
                          </span>
                          <span>{formatMoney(product.price)}</span>
                        </button>
                      ))}
                      {searchResults.length === 0 ? (
                        <div className="product-search-empty">
                          No products found
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="table-scroll sale-items-scroll">
                  <table className="sales-table sale-items-table">
                    <thead>
                      <tr>
                        <th scope="col">Product Name</th>
                        <th className="right-align" scope="col">
                          Net Unit Price
                        </th>
                        <th className="right-align" scope="col">
                          Stock
                        </th>
                        <th className="right-align" scope="col">
                          Quantity
                        </th>
                        <th className="right-align" scope="col">
                          Discount
                        </th>
                        <th className="right-align" scope="col">
                          Tax %
                        </th>
                        <th className="right-align" scope="col">
                          Subtotal
                        </th>
                        <th className="action-th" scope="col">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const totals = lineTotals(item);
                        return (
                          <tr key={item.productId}>
                            <td>
                              <div className="sale-item-name">
                                <strong>{item.name}</strong>
                                <span>{item.code}</span>
                              </div>
                            </td>
                            <td className="right-align sale-amount">
                              {formatMoney(item.price)}
                            </td>
                            <td className="right-align sale-muted">
                              {item.stock}
                            </td>
                            <td className="right-align">
                              <input
                                className="filter-input line-input"
                                type="number"
                                min="1"
                                max={item.stock}
                                step="1"
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(item.productId, {
                                    quantity: Math.max(
                                      1,
                                      Math.min(
                                        item.stock,
                                        Number(event.target.value) || 1,
                                      ),
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td className="right-align">
                              <input
                                className="filter-input line-input"
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.discount}
                                onChange={(event) =>
                                  updateItem(item.productId, {
                                    discount: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="right-align">
                              <input
                                className="filter-input line-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.tax}
                                onChange={(event) =>
                                  updateItem(item.productId, {
                                    tax: event.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="right-align sale-amount">
                              {formatMoney(totals.subtotal)}
                            </td>
                            <td className="action-cell">
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`Remove ${item.name}`}
                                onClick={() => removeItem(item.productId)}
                              >
                                <Icon
                                  name="trash"
                                  className="w-3.5 h-3.5"
                                  strokeWidth={1.8}
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 ? (
                        <tr className="empty-row">
                          <td colSpan={8} className="sale-empty-cell">
                            <div className="sale-empty-state">
                              <div className="sale-empty-illustration">
                                <svg
                                  className="sale-empty-art"
                                  fill="none"
                                  viewBox="0 0 80 80"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                >
                                  <rect
                                    fill="#e5e7eb"
                                    height="42"
                                    rx="3"
                                    stroke="#d1d5db"
                                    strokeWidth="1.5"
                                    width="36"
                                    x="22"
                                    y="14"
                                  />
                                  <line
                                    stroke="#9ca3af"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    x1="28"
                                    x2="52"
                                    y1="24"
                                    y2="24"
                                  />
                                  <line
                                    stroke="#9ca3af"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    x1="28"
                                    x2="46"
                                    y1="30"
                                    y2="30"
                                  />
                                  <line
                                    stroke="#9ca3af"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    x1="28"
                                    x2="50"
                                    y1="36"
                                    y2="36"
                                  />
                                  <path
                                    d="M16 38C16 35.7909 17.7909 34 20 34H33L38 40H60C62.2091 40 64 41.7909 64 44V60C64 62.2091 62.2091 64 60 64H20C17.7909 64 16 62.2091 16 60V38Z"
                                    fill="#cbd5e1"
                                  />
                                  <path
                                    d="M16 44H64V60C64 62.2091 62.2091 64 60 64H20C17.7909 64 16 62.2091 16 60V44Z"
                                    fill="#94a3b8"
                                    opacity="0.6"
                                  />
                                </svg>
                                <svg
                                  className="sale-empty-bubble"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 9h2v2H8V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9z" />
                                </svg>
                              </div>
                              <span>No data Available</span>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                {errors.items && (
                  <p className="field-error">{errors.items}</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Additional Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  <div className="filter-field">
                    <label htmlFor="sale-status">Status</label>
                    <select
                      id="sale-status"
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
                    <label htmlFor="sale-order-tax">Order Tax</label>
                    <div className="input-suffix">
                      <input
                        id="sale-order-tax"
                        className="filter-input"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={orderTax}
                        onChange={(event) => setOrderTax(event.target.value)}
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="sale-discount">Discount</label>
                    <input
                      id="sale-discount"
                      className={`filter-input${errors.discount ? " invalid" : ""}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(event) => {
                        setDiscount(event.target.value);
                        clearError("discount");
                      }}
                    />
                    {errors.discount && (
                      <p className="field-error">{errors.discount}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="sale-discount-type">Discount Type</label>
                    <select
                      id="sale-discount-type"
                      className="filter-select"
                      value={discountType}
                      onChange={(event) =>
                        setDiscountType(
                          event.target.value as (typeof discountTypes)[number],
                        )
                      }
                    >
                      {discountTypes.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="sale-shipping">Shipping</label>
                    <input
                      id="sale-shipping"
                      className="filter-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={shipping}
                      onChange={(event) => setShipping(event.target.value)}
                    />
                  </div>
                  <div className="filter-field span-3">
                    <label htmlFor="sale-note">Note</label>
                    <textarea
                      id="sale-note"
                      className="filter-textarea"
                      rows={3}
                      placeholder="A few words ..."
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Payment</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  <div className="filter-field">
                    <label htmlFor="sale-payment-status">
                      Payment Status
                    </label>
                    <select
                      id="sale-payment-status"
                      className="filter-select"
                      value={paymentChoice}
                      onChange={(event) => {
                        setPaymentChoice(
                          event.target.value as PaymentChoice,
                        );
                        clearError("paid");
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="sale-payment-method">
                      Payment Method
                    </label>
                    <select
                      id="sale-payment-method"
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
                  {paymentChoice === "Partial" ? (
                    <div className="filter-field">
                      <label htmlFor="sale-paid">Paid Amount</label>
                      <input
                        id="sale-paid"
                        className={`filter-input${errors.paid ? " invalid" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={paid}
                        onChange={(event) => {
                          setPaid(event.target.value);
                          clearError("paid");
                        }}
                      />
                      {errors.paid && (
                        <p className="field-error">{errors.paid}</p>
                      )}
                    </div>
                  ) : null}
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
                    <span>{formatMoney(itemsTotal)}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Order Tax</span>
                    <span>
                      {formatMoney(orderTaxAmount)} (
                      {Math.min(100, numberValue(orderTax))}%)
                    </span>
                  </div>
                  <div className="sale-summary-row discount">
                    <span>Discount</span>
                    <span>- {formatMoney(orderDiscountAmount)}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Shipping</span>
                    <span>{formatMoney(shippingAmount)}</span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>Total</span>
                    <span>{formatMoney(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </section>

            <button
              type="submit"
              form="create-sale-form"
              className="primary-button sale-submit-button"
            >
              Submit
            </button>
            <button
              type="button"
              className="ghost-button sale-cancel-button"
              onClick={() => router.push("/sales")}
            >
              Cancel
            </button>
          </aside>
        </div>
      </form>

      {customerModalOpen ? (
        <CustomerModal
          nextId={nextId}
          onClose={() => setCustomerModalOpen(false)}
          onSave={saveCustomer}
        />
      ) : null}
    </div>
  );
}
