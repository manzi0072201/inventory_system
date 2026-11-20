"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useProducts } from "@/components/products/products-store";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import { paymentMethods, type PaymentMethod } from "@/lib/payments-data";
import {
  formatMoney,
  purchaseWarehouses,
  suppliers,
} from "@/lib/purchases-data";
import {
  purchaseReturnItemCount,
  purchaseReturnItemsTotal,
  purchaseReturnReasons,
  purchaseReturnResolutions,
  purchaseReturnStatusClass,
  purchaseReturnStatuses,
  type PurchaseReturn,
  type PurchaseReturnItem,
  type PurchaseReturnReason,
  type PurchaseReturnResolution,
  type PurchaseReturnStatus,
} from "@/lib/purchase-returns-data";
import { usePurchases } from "@/components/purchases/purchases-store";
import {
  PURCHASE_RETURN_CREATED_FLAG,
  PURCHASE_RETURN_UPDATED_FLAG,
  usePurchaseReturns,
} from "./purchase-returns-store";

type PurchaseReturnFormProps = {
  mode: "create" | "edit";
  record?: PurchaseReturn;
};

type Errors = Record<string, string>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function PurchaseReturnForm({ mode, record }: PurchaseReturnFormProps) {
  const router = useRouter();
  const { products } = useProducts();
  const { purchases } = usePurchases();
  const { addPurchaseReturn, updatePurchaseReturn, nextReference } =
    usePurchaseReturns();

  const [date, setDate] = useState(record?.date ?? today());
  const [purchaseReference, setPurchaseReference] = useState(
    record?.purchaseReference ?? "",
  );
  const [supplier, setSupplier] = useState(record?.supplier ?? "");
  const [warehouse, setWarehouse] = useState(record?.warehouse ?? "");
  const [reason, setReason] = useState<PurchaseReturnReason>(
    record?.reason ?? "Damaged goods",
  );
  const [resolution, setResolution] = useState<PurchaseReturnResolution>(
    record?.resolution ?? "Refund",
  );
  const [status, setStatus] = useState<PurchaseReturnStatus>(
    record?.status ?? "Pending",
  );
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>(
    record?.refundMethod ?? "Cash",
  );
  const [deductStock, setDeductStock] = useState(record?.deductStock ?? true);
  const [note, setNote] = useState(record?.note ?? "");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PurchaseReturnItem[]>(
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

  const supplierNames = useMemo(() => {
    const names = suppliers.map((entry) => entry.name);
    if (
      supplier &&
      !names.some((name) => name.toLowerCase() === supplier.toLowerCase())
    ) {
      names.unshift(supplier);
    }
    return names;
  }, [supplier]);

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

  const total = useMemo(() => purchaseReturnItemsTotal(items), [items]);
  const itemCount = useMemo(() => purchaseReturnItemCount(items), [items]);

  const applyPurchaseReference = (value: string) => {
    setPurchaseReference(value);
    clearError("purchaseReference");
    const purchase = purchases.find(
      (entry) => entry.reference === value || entry.id === value,
    );
    if (!purchase) return;
    setSupplier(purchase.supplier);
    setWarehouse(purchase.warehouse);
    clearError("supplier");
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
          unitPrice: product.cost,
        },
      ];
    });
    setSearch("");
    clearError("items");
  };

  const updateItem = (
    productId: string,
    changes: Partial<PurchaseReturnItem>,
  ) => {
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
    if (!purchaseReference.trim()) {
      found.purchaseReference = "Original purchase is required";
    }
    if (!supplier) found.supplier = "Supplier is required";
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

    const nextRecord: PurchaseReturn = {
      id: record?.id ?? nextReference,
      reference,
      date,
      purchaseReference: purchaseReference.trim(),
      supplier,
      warehouse,
      items,
      reason,
      resolution,
      status,
      refundMethod,
      amount: total,
      deductStock,
      note: note.trim() || undefined,
      createdAt: record?.createdAt ?? new Date().toISOString(),
    };

    if (mode === "edit" && record) {
      updatePurchaseReturn(record.id, nextRecord);
      try {
        window.sessionStorage.setItem(
          PURCHASE_RETURN_UPDATED_FLAG,
          nextRecord.reference,
        );
      } catch {
        // Flag is a nicety only; navigation still works without it.
      }
      router.push("/purchase-return");
      return;
    }

    addPurchaseReturn(nextRecord);
    try {
      window.sessionStorage.setItem(
        PURCHASE_RETURN_CREATED_FLAG,
        nextRecord.reference,
      );
    } catch {
      // Flag is a nicety only; navigation still works without it.
    }
    router.push("/purchase-return");
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
            <span className="crumb-current">
              {mode === "edit" ? "Edit Return" : "Record Return"}
            </span>
          </nav>
          <h1>
            {mode === "edit"
              ? "Edit Purchase Return"
              : "Record Purchase Return"}
          </h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push("/purchase-return")}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="purchase-return-form"
            className="primary-button"
          >
            <Icon name="check" className="w-3.5 h-3.5" strokeWidth={2.2} />
            {mode === "edit" ? "Save Changes" : "Record Return"}
          </button>
        </div>
      </div>

      <form id="purchase-return-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Return Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid-3">
                  <div className="filter-field">
                    <label htmlFor="purchase-return-date">Date</label>
                    <DatePicker
                      id="purchase-return-date"
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
                    <label htmlFor="purchase-return-purchase">
                      Original Purchase
                    </label>
                    <input
                      id="purchase-return-purchase"
                      list="purchase-return-purchases"
                      className={`filter-input${errors.purchaseReference ? " invalid" : ""}`}
                      placeholder="Select or type a purchase reference"
                      value={purchaseReference}
                      onChange={(event) =>
                        applyPurchaseReference(event.target.value)
                      }
                    />
                    <datalist id="purchase-return-purchases">
                      {purchases.map((purchase) => (
                        <option
                          key={purchase.id}
                          value={purchase.reference}
                        >
                          {purchase.supplier} - {purchase.warehouse}
                        </option>
                      ))}
                    </datalist>
                    {errors.purchaseReference ? (
                      <p className="field-error">{errors.purchaseReference}</p>
                    ) : null}
                    <p className="filter-hint">
                      Selecting a purchase fills in the supplier and warehouse.
                    </p>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="purchase-return-supplier">Supplier</label>
                    <select
                      id="purchase-return-supplier"
                      className={`filter-select${errors.supplier ? " invalid" : ""}`}
                      value={supplier}
                      onChange={(event) => {
                        setSupplier(event.target.value);
                        clearError("supplier");
                      }}
                    >
                      <option value="">Choose Supplier</option>
                      {supplierNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {errors.supplier ? (
                      <p className="field-error">{errors.supplier}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="purchase-return-warehouse">
                      Warehouse
                    </label>
                    <select
                      id="purchase-return-warehouse"
                      className={`filter-select${errors.warehouse ? " invalid" : ""}`}
                      value={warehouse}
                      onChange={(event) => {
                        setWarehouse(event.target.value);
                        clearError("warehouse");
                      }}
                    >
                      <option value="">Choose Warehouse</option>
                      {purchaseWarehouses.map((entry) => (
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
                    <label htmlFor="purchase-return-reason">
                      Return Reason
                    </label>
                    <select
                      id="purchase-return-reason"
                      className="filter-select"
                      value={reason}
                      onChange={(event) =>
                        setReason(event.target.value as PurchaseReturnReason)
                      }
                    >
                      {purchaseReturnReasons.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="purchase-return-resolution">
                      Resolution
                    </label>
                    <select
                      id="purchase-return-resolution"
                      className="filter-select"
                      value={resolution}
                      onChange={(event) =>
                        setResolution(
                          event.target.value as PurchaseReturnResolution,
                        )
                      }
                    >
                      {purchaseReturnResolutions.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="purchase-return-status">Status</label>
                    <select
                      id="purchase-return-status"
                      className="filter-select"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as PurchaseReturnStatus)
                      }
                    >
                      {purchaseReturnStatuses.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="purchase-return-method">
                      Refund Method
                    </label>
                    <select
                      id="purchase-return-method"
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
                    <label htmlFor="purchase-return-deduct">
                      Inventory Adjustment
                    </label>
                    <label
                      className="return-toggle"
                      htmlFor="purchase-return-deduct"
                    >
                      <input
                        id="purchase-return-deduct"
                        type="checkbox"
                        checked={deductStock}
                        onChange={(event) =>
                          setDeductStock(event.target.checked)
                        }
                      />
                      <span>
                        {deductStock
                          ? "Deduct returned items from inventory"
                          : "Keep inventory quantities unchanged"}
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
                          <span>{formatMoney(product.cost)}</span>
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
                          Unit Cost
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
                              aria-label={`Unit cost for ${item.name}`}
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
                  <label htmlFor="purchase-return-note">Note</label>
                  <textarea
                    id="purchase-return-note"
                    className="filter-textarea"
                    rows={4}
                    placeholder="Add inspection notes or supplier instructions..."
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
                    {supplier ? supplier.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div className="sale-customer-copy">
                    <strong>{supplier || "No supplier selected"}</strong>
                    <span>{warehouse || "No warehouse selected"}</span>
                  </div>
                </div>
                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Reference</span>
                    <span>{reference}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Original Purchase</span>
                    <span>{purchaseReference || "Not selected"}</span>
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
                    <span>Total Return</span>
                    <span>{formatMoney(total)}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Status</span>
                    <span
                      className={`status-pill ${purchaseReturnStatusClass(status)}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
                <p className="warehouse-form-note">
                  {deductStock
                    ? "Returned items will be deducted from inventory."
                    : "Inventory quantities will stay unchanged."}
                </p>
              </div>
            </section>

            <button
              type="submit"
              form="purchase-return-form"
              className="primary-button sale-submit-button"
            >
              {mode === "edit" ? "Save Changes" : "Record Return"}
            </button>
            <button
              type="button"
              className="ghost-button sale-cancel-button"
              onClick={() => router.push("/purchase-return")}
            >
              Cancel
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}
