"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/components/customers/customers-store";
import { useProducts } from "@/components/products/products-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { paymentMethods, type PaymentMethod } from "@/lib/payments-data";
import {
  formatMoney,
  saleWarehouses,
} from "@/lib/sales-data";
import {
  returnItemCount,
  returnItemsTotal,
  salesReturnReasons,
  salesReturnResolutions,
  salesReturnStatusClass,
  salesReturnStatuses,
  type SalesReturn,
  type SalesReturnItem,
  type SalesReturnReason,
  type SalesReturnResolution,
  type SalesReturnStatus,
} from "@/lib/sales-returns-data";
import { useSales } from "@/components/sales/sales-store";
import {
  SALES_RETURN_CREATED_FLAG,
  SALES_RETURN_UPDATED_FLAG,
  useSalesReturns,
} from "./sales-returns-store";

type SalesReturnFormProps = {
  mode: "create" | "edit";
  record?: SalesReturn;
};

type Errors = Record<string, string>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function initialCustomer(record?: SalesReturn): string {
  return record?.customer ?? "";
}

export function SalesReturnForm({ mode, record }: SalesReturnFormProps) {
  const router = useRouter();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { sales } = useSales();
  const { addSalesReturn, updateSalesReturn, nextReference } = useSalesReturns();

  const [date, setDate] = useState(record?.date ?? today());
  const [saleReference, setSaleReference] = useState(
    record?.saleReference ?? "",
  );
  const [customer, setCustomer] = useState(initialCustomer(record));
  const [warehouse, setWarehouse] = useState(record?.warehouse ?? "");
  const [reason, setReason] = useState<SalesReturnReason>(
    record?.reason ?? "Damaged item",
  );
  const [resolution, setResolution] = useState<SalesReturnResolution>(
    record?.resolution ?? "Refund",
  );
  const [status, setStatus] = useState<SalesReturnStatus>(
    record?.status ?? "Pending",
  );
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(
    record?.refundMethod ?? "Cash",
  );
  const [restock, setRestock] = useState(record?.restock ?? true);
  const [note, setNote] = useState(record?.note ?? "");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<SalesReturnItem[]>(
    record?.items.map((item) => ({ ...item })) ?? [],
  );
  const [errors, setErrors] = useState<Errors>({});

  const reference = record?.reference ?? nextReference;

  const clearError = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const customerNames = useMemo(() => {
    const names = customers.map((entry) => entry.name);
    if (
      customer &&
      !names.some((name) => name.toLowerCase() === customer.toLowerCase())
    ) {
      names.unshift(customer);
    }
    return names;
  }, [customers, customer]);

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.code.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [products, search]);

  const total = useMemo(() => returnItemsTotal(items), [items]);
  const itemCount = useMemo(() => returnItemCount(items), [items]);

  const applySaleReference = (value: string) => {
    setSaleReference(value);
    clearError("saleReference");
    const sale = sales.find(
      (entry) => entry.reference === value || entry.id === value,
    );
    if (!sale) return;
    setCustomer(sale.customer);
    setWarehouse(sale.warehouse);
    clearError("customer");
    clearError("warehouse");
  };

  const addProduct = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(999, item.quantity + 1) }
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          code: product.code,
          quantity: 1,
          unitPrice: product.price,
        },
      ];
    });
    setSearch("");
    clearError("items");
  };

  const updateItem = (productId: string, changes: Partial<SalesReturnItem>) => {
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
    if (!saleReference.trim()) {
      found.saleReference = "Original sale is required";
    }
    if (!customer) found.customer = "Customer is required";
    if (!warehouse) found.warehouse = "Warehouse is required";
    if (items.length === 0) found.items = "Add at least one product";
    if (items.some((item) => item.quantity < 1)) {
      found.items = "Return quantities must be at least 1";
    }
    if (items.some((item) => item.unitPrice < 0)) {
      found.items = "Unit prices cannot be negative";
    }
    return found;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document
        .querySelector<HTMLElement>(".field-error")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    const nextRecord: SalesReturn = {
      id: record?.id ?? nextReference,
      reference,
      date,
      saleReference: saleReference.trim(),
      customer,
      warehouse,
      items,
      reason,
      resolution,
      status,
      refundMethod,
      amount: total,
      restock,
      note: note.trim() || undefined,
      createdAt: record?.createdAt ?? new Date().toISOString(),
    };

    if (mode === "edit" && record) {
      updateSalesReturn(record.id, nextRecord);
      try {
        window.sessionStorage.setItem(
          SALES_RETURN_UPDATED_FLAG,
          nextRecord.reference,
        );
      } catch {
        // Flag is a nicety only; navigation still works without it.
      }
      router.push("/sales-return");
      return;
    }

    addSalesReturn(nextRecord);
    try {
      window.sessionStorage.setItem(
        SALES_RETURN_CREATED_FLAG,
        nextRecord.reference,
      );
    } catch {
      // Flag is a nicety only; navigation still works without it.
    }
    router.push("/sales-return");
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
            <span className="crumb-current">
              {mode === "edit" ? "Edit Return" : "Record Return"}
            </span>
          </nav>
          <h1>{mode === "edit" ? "Edit Sales Return" : "Record Sales Return"}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push("/sales-return")}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="sales-return-form"
            className="primary-button"
          >
            <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.2} />
            {mode === "edit" ? "Save Changes" : "Record Return"}
          </button>
        </div>
      </div>

      <form id="sales-return-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Return Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  <div className="filter-field">
                    <label htmlFor="return-date">Date</label>
                    <DatePicker
                      id="return-date"
                      value={date}
                      onChange={(value) => {
                        setDate(value);
                        clearError("date");
                      }}
                      allowClear={false}
                    />
                    {errors.date ? (
                      <p className="field-error">{errors.date}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-sale">Original Sale</label>
                    <input
                      id="return-sale"
                      list="sales-return-sales"
                      className={`filter-input${errors.saleReference ? " invalid" : ""}`}
                      placeholder="Select or type a sale reference"
                      value={saleReference}
                      onChange={(event) =>
                        applySaleReference(event.target.value)
                      }
                    />
                    <datalist id="sales-return-sales">
                      {sales.map((sale) => (
                        <option key={sale.id} value={sale.reference}>
                          {sale.customer} - {sale.warehouse}
                        </option>
                      ))}
                    </datalist>
                    {errors.saleReference ? (
                      <p className="field-error">{errors.saleReference}</p>
                    ) : null}
                    <p className="filter-hint">
                      Selecting a sale fills in the customer and warehouse.
                    </p>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-customer">Customer</label>
                    <select
                      id="return-customer"
                      className={`filter-select${errors.customer ? " invalid" : ""}`}
                      value={customer}
                      onChange={(event) => {
                        setCustomer(event.target.value);
                        clearError("customer");
                      }}
                    >
                      <option value="">Choose Customer</option>
                      {customerNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {errors.customer ? (
                      <p className="field-error">{errors.customer}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-warehouse">Warehouse</label>
                    <select
                      id="return-warehouse"
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
                    {errors.warehouse ? (
                      <p className="field-error">{errors.warehouse}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-reason">Return Reason</label>
                    <select
                      id="return-reason"
                      className="filter-select"
                      value={reason}
                      onChange={(event) =>
                        setReason(event.target.value as SalesReturnReason)
                      }
                    >
                      {salesReturnReasons.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-resolution">Resolution</label>
                    <select
                      id="return-resolution"
                      className="filter-select"
                      value={resolution}
                      onChange={(event) =>
                        setResolution(
                          event.target.value as SalesReturnResolution,
                        )
                      }
                    >
                      {salesReturnResolutions.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-status">Status</label>
                    <select
                      id="return-status"
                      className="filter-select"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as SalesReturnStatus)
                      }
                    >
                      {salesReturnStatuses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="return-method">Refund Method</label>
                    <select
                      id="return-method"
                      className="filter-select"
                      value={refundMethod}
                      onChange={(event) =>
                        setRefundMethod(event.target.value as PaymentMethod)
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
                    <label htmlFor="return-restock">Restock Items</label>
                    <label className="return-toggle" htmlFor="return-restock">
                      <input
                        id="return-restock"
                        type="checkbox"
                        checked={restock}
                        onChange={(event) => setRestock(event.target.checked)}
                      />
                      <span>
                        {restock
                          ? "Add returned items back to inventory"
                          : "Keep items out of inventory"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel sale-products-panel">
              <div className="panel-heading">
                <h2>Returned Products</h2>
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
                              {product.code} - {product.quantity} in stock
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
                          Unit Price
                        </th>
                        <th className="right-align" scope="col">
                          Quantity
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
                      {items.map((item) => (
                        <tr key={item.productId}>
                          <td>
                            <div className="sale-item-name">
                              <strong>{item.name}</strong>
                              <span>{item.code}</span>
                            </div>
                          </td>
                          <td className="right-align">
                            <input
                              className="filter-input line-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              aria-label={`Unit price for ${item.name}`}
                              onChange={(event) =>
                                updateItem(item.productId, {
                                  unitPrice: Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="right-align">
                            <input
                              className="filter-input line-input"
                              type="number"
                              min="1"
                              max="999"
                              step="1"
                              value={item.quantity}
                              aria-label={`Quantity for ${item.name}`}
                              onChange={(event) =>
                                updateItem(item.productId, {
                                  quantity: Math.max(
                                    1,
                                    Math.min(
                                      999,
                                      Number(event.target.value) || 1,
                                    ),
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="right-align sale-amount">
                            {formatMoney(item.quantity * item.unitPrice)}
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
                      ))}
                      {items.length === 0 ? (
                        <tr className="empty-row">
                          <td colSpan={5} className="sale-empty-cell">
                            <div className="sale-empty-state">
                              <span>No returned products added yet</span>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                {errors.items ? (
                  <p className="field-error">{errors.items}</p>
                ) : null}
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Additional Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="filter-field">
                  <label htmlFor="return-note">Note</label>
                  <textarea
                    id="return-note"
                    className="filter-textarea"
                    rows={4}
                    placeholder="Add inspection notes or refund instructions..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Return Summary</h2>
              </div>
              <div className="panel-body">
                <div className="sale-customer-card">
                  <div className="sale-customer-avatar">
                    {customer ? customer.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="sale-customer-copy">
                    <strong>{customer || "No customer selected"}</strong>
                    <span>{warehouse || "No warehouse selected"}</span>
                  </div>
                </div>
                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Reference</span>
                    <span>{reference}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Original Sale</span>
                    <span>{saleReference || "Not selected"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Items</span>
                    <span>{itemCount}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Resolution</span>
                    <span>{resolution}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Refund Method</span>
                    <span>{refundMethod}</span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>Total Refund</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Status</span>
                    <span
                      className={`status-pill ${salesReturnStatusClass(status)}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
                <p className="warehouse-form-note">
                  {restock
                    ? "Returned items will be added back to inventory."
                    : "Returned items will remain outside inventory."}
                </p>
              </div>
            </section>

            <button
              type="submit"
              form="sales-return-form"
              className="primary-button sale-submit-button"
            >
              {mode === "edit" ? "Save Changes" : "Record Return"}
            </button>
            <button
              type="button"
              className="ghost-button sale-cancel-button"
              onClick={() => router.push("/sales-return")}
            >
              Cancel
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}
