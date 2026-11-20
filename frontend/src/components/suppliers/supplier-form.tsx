"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { usePurchases } from "@/components/purchases/purchases-store";
import {
  supplierCategories,
  supplierCountries,
  type Supplier,
} from "@/lib/suppliers-data";
import { formatMoney } from "@/lib/purchases-data";
import {
  SUPPLIER_CREATED_FLAG,
  SUPPLIER_UPDATED_FLAG,
  useSuppliers,
} from "./suppliers-store";

export type SupplierFormMode = "create" | "edit";

type FormState = {
  name: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  category: string;
  taxNumber: string;
  openingBalance: string;
  creditLimit: string;
};

type SupplierFormProps = {
  mode: SupplierFormMode;
  supplier?: Supplier;
};

function toForm(supplier?: Supplier): FormState {
  return {
    name: supplier?.name ?? "",
    contact: supplier?.contact ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    country: supplier?.country ?? "Rwanda",
    city: supplier?.city ?? "",
    address: supplier?.address ?? "",
    category: supplier?.category ?? "General Goods",
    taxNumber: supplier?.taxNumber ?? "",
    openingBalance: supplier ? String(supplier.openingBalance) : "0",
    creditLimit: supplier ? String(supplier.creditLimit) : "0",
  };
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SupplierForm({ mode, supplier }: SupplierFormProps) {
  const router = useRouter();
  const { suppliers, addSupplier, updateSupplier, nextId } = useSuppliers();
  const { purchases, updatePurchase } = usePurchases();
  const [form, setForm] = useState<FormState>(() => toForm(supplier));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const id = supplier?.id ?? nextId;
  const title = mode === "edit" ? "Edit Supplier" : "Create Supplier";

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const relatedPurchases = useMemo(
    () => (supplier ? purchases.filter((p) => p.supplier === supplier.name) : []),
    [supplier, purchases],
  );

  const totalPurchased = useMemo(
    () => relatedPurchases.reduce((sum, p) => sum + p.total, 0),
    [relatedPurchases],
  );

  const outstanding = useMemo(
    () => relatedPurchases.reduce((sum, p) => sum + Math.max(0, p.total - p.paid), 0),
    [relatedPurchases],
  );

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    const trimmedName = form.name.trim();
    if (trimmedName === "") {
      found.name = "Supplier name is required.";
    } else if (
      suppliers.some(
        (entry) => entry.id !== supplier?.id && entry.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      found.name = "A supplier with this name already exists.";
    }

    const trimmedEmail = form.email.trim();
    if (trimmedEmail !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      found.email = "Enter a valid email address.";
    }

    const openingBalance = Number(form.openingBalance);
    if (form.openingBalance.trim() === "" || !Number.isFinite(openingBalance) || openingBalance < 0) {
      found.openingBalance = "Opening balance cannot be negative.";
    }

    const creditLimit = Number(form.creditLimit);
    if (form.creditLimit.trim() === "" || !Number.isFinite(creditLimit) || creditLimit < 0) {
      found.creditLimit = "Credit limit cannot be negative.";
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

    const trimmedName = form.name.trim();
    const changes = {
      name: trimmedName,
      contact: form.contact.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      category: form.category.trim(),
      taxNumber: form.taxNumber.trim(),
      openingBalance: Math.max(0, Number(form.openingBalance)),
      creditLimit: Math.max(0, Number(form.creditLimit)),
    };

    if (mode === "edit" && supplier) {
      if (supplier.name !== trimmedName) {
        purchases
          .filter((p) => p.supplier === supplier.name)
          .forEach((p) => updatePurchase(p.id, { supplier: trimmedName }));
      }
      updateSupplier(supplier.id, changes);
      try {
        window.sessionStorage.setItem(SUPPLIER_UPDATED_FLAG, supplier.id);
      } catch {}
    } else {
      const newSupplier: Supplier = {
        id: id || `SUP_${Date.now()}`,
        ...changes,
        createdAt: new Date().toISOString(),
      };
      addSupplier(newSupplier);
      try {
        window.sessionStorage.setItem(SUPPLIER_CREATED_FLAG, newSupplier.id);
      } catch {}
    }

    router.push("/suppliers");
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
            <span className="crumb-current">{title}</span>
          </nav>
          <h1>{title}</h1>
        </div>
        <div className="heading-actions">
          <button type="button" className="ghost-button" onClick={() => router.push("/suppliers")}>
            Cancel
          </button>
          <button type="submit" form="supplier-form" className="primary-button">
            <Icon name={mode === "edit" ? "check" : "plus"} className="w-3.5 h-3.5" strokeWidth={2.2} />
            {mode === "edit" ? "Save changes" : "Create supplier"}
          </button>
        </div>
      </div>

      <form id="supplier-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading"><h2>Supplier Details</h2></div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label>Supplier ID</label>
                    <div className="detail-value">{id || "Auto-generated"}</div>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-name">Supplier Name <span className="required-mark">*</span></label>
                    <input
                      id="supplier-name"
                      className={`filter-input${errors.name ? " invalid" : ""}`}
                      type="text"
                      placeholder="e.g. Kigali Wholesale Ltd"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                    />
                    {errors.name && <p className="field-error">{errors.name}</p>}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-contact">Contact Person</label>
                    <input
                      id="supplier-contact"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. Aline Uwase"
                      value={form.contact}
                      onChange={(event) => setField("contact", event.target.value)}
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-category">Category</label>
                    <select
                      id="supplier-category"
                      className="filter-select"
                      value={form.category}
                      onChange={(event) => setField("category", event.target.value)}
                    >
                      {supplierCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-phone">Phone</label>
                    <input
                      id="supplier-phone"
                      className="filter-input"
                      type="tel"
                      placeholder="+250 788 000 000"
                      value={form.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-email">Email</label>
                    <input
                      id="supplier-email"
                      className={`filter-input${errors.email ? " invalid" : ""}`}
                      type="email"
                      placeholder="supplier@example.com"
                      value={form.email}
                      onChange={(event) => setField("email", event.target.value)}
                    />
                    {errors.email && <p className="field-error">{errors.email}</p>}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-tax">Tax Number</label>
                    <input
                      id="supplier-tax"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. TIN 102938475"
                      value={form.taxNumber}
                      onChange={(event) => setField("taxNumber", event.target.value)}
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-country">Country</label>
                    <select
                      id="supplier-country"
                      className="filter-select"
                      value={form.country}
                      onChange={(event) => setField("country", event.target.value)}
                    >
                      {supplierCountries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-city">City</label>
                    <input
                      id="supplier-city"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. Kigali"
                      value={form.city}
                      onChange={(event) => setField("city", event.target.value)}
                    />
                  </div>
                  <div className="filter-field span-2">
                    <label htmlFor="supplier-address">Address</label>
                    <textarea
                      id="supplier-address"
                      className="filter-textarea"
                      rows={2}
                      placeholder="Street, building, or area"
                      value={form.address}
                      onChange={(event) => setField("address", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading"><h2>Financials</h2></div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="supplier-opening-balance">Opening Balance</label>
                    <div className="input-suffix">
                      <input
                        id="supplier-opening-balance"
                        className={`filter-input${errors.openingBalance ? " invalid" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.openingBalance}
                        onChange={(event) => setField("openingBalance", event.target.value)}
                      />
                      <span>RWF</span>
                    </div>
                    {errors.openingBalance && <p className="field-error">{errors.openingBalance}</p>}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="supplier-credit-limit">Credit Limit</label>
                    <div className="input-suffix">
                      <input
                        id="supplier-credit-limit"
                        className={`filter-input${errors.creditLimit ? " invalid" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.creditLimit}
                        onChange={(event) => setField("creditLimit", event.target.value)}
                      />
                      <span>RWF</span>
                    </div>
                    {errors.creditLimit && <p className="field-error">{errors.creditLimit}</p>}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="details-column">
            <section className="panel">
              <div className="panel-heading"><h2>Summary</h2></div>
              <div className="panel-body">
                <div className="customer-form-profile">
                  <span className="customer-avatar">{initialsOf(form.name) || "S"}</span>
                  <div>
                    <strong>{form.name.trim() || "New supplier"}</strong>
                    <span>{form.category || "Supplier"}</span>
                  </div>
                </div>
                <div className="sale-summary-rows">
                  <div className="sale-summary-row"><span>Supplier ID</span><span>{id || "Auto-generated"}</span></div>
                  <div className="sale-summary-row"><span>Contact</span><span>{form.contact.trim() || "-"}</span></div>
                  <div className="sale-summary-row"><span>Email</span><span>{form.email.trim() || "-"}</span></div>
                  <div className="sale-summary-row"><span>Phone</span><span>{form.phone.trim() || "-"}</span></div>
                  <div className="sale-summary-row"><span>Location</span><span>{[form.city.trim(), form.country.trim()].filter(Boolean).join(", ") || "-"}</span></div>
                  <div className="sale-summary-row"><span>Opening balance</span><span>{formatMoney(Number(form.openingBalance) || 0)}</span></div>
                  <div className="sale-summary-row grand"><span>Credit limit</span><span>{formatMoney(Number(form.creditLimit) || 0)}</span></div>
                </div>
                <p className="warehouse-form-note">
                  Supplier names are linked to purchases. Renaming a supplier updates their purchase history automatically.
                </p>
              </div>
            </section>

            {mode === "edit" ? (
              <section className="panel">
                <div className="panel-heading"><h2>Purchase History</h2></div>
                <div className="panel-body">
                  <div className="sale-summary-rows">
                    <div className="sale-summary-row"><span>Orders</span><span>{relatedPurchases.length.toLocaleString()}</span></div>
                    <div className="sale-summary-row"><span>Total purchased</span><span>{formatMoney(totalPurchased)}</span></div>
                    <div className="sale-summary-row grand"><span>Outstanding</span><span>{formatMoney(outstanding)}</span></div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
