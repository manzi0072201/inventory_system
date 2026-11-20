"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useSales } from "@/components/sales/sales-store";
import {
  customerCountries,
  customerTypes,
  type Customer,
  type CustomerType,
} from "@/lib/customers-data";
import { formatMoney } from "@/lib/sales-data";
import {
  CUSTOMER_CREATED_FLAG,
  CUSTOMER_UPDATED_FLAG,
  useCustomers,
} from "./customers-store";

export type CustomerFormMode = "create" | "edit";

type FormState = {
  name: string;
  type: CustomerType;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  taxNumber: string;
  openingBalance: string;
  creditLimit: string;
};

type CustomerFormProps = {
  mode: CustomerFormMode;
  customer?: Customer;
};

function toForm(customer?: Customer): FormState {
  return {
    name: customer?.name ?? "",
    type: customer?.type ?? "Individual",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    country: customer?.country ?? "Rwanda",
    city: customer?.city ?? "",
    address: customer?.address ?? "",
    taxNumber: customer?.taxNumber ?? "",
    openingBalance: customer ? String(customer.openingBalance) : "0",
    creditLimit: customer ? String(customer.creditLimit) : "0",
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

export function CustomerForm({ mode, customer }: CustomerFormProps) {
  const router = useRouter();
  const { customers, addCustomer, updateCustomer, nextId } = useCustomers();
  const { sales, updateSales } = useSales();
  const [form, setForm] = useState<FormState>(() => toForm(customer));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const id = customer?.id ?? nextId;
  const title = mode === "edit" ? "Edit Customer" : "Create Customer";

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const relatedSales = useMemo(
    () =>
      customer
        ? sales.filter((sale) => sale.customer === customer.name)
        : [],
    [customer, sales],
  );

  const totalSpent = useMemo(
    () => relatedSales.reduce((sum, sale) => sum + sale.total, 0),
    [relatedSales],
  );

  const outstanding = useMemo(
    () =>
      relatedSales.reduce(
        (sum, sale) => sum + Math.max(0, sale.total - sale.paid),
        0,
      ),
    [relatedSales],
  );

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    const trimmedName = form.name.trim();

    if (trimmedName === "") {
      found.name = "Customer name is required.";
    } else if (
      customers.some(
        (entry) =>
          entry.id !== customer?.id &&
          entry.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      found.name = "A customer with this name already exists.";
    }

    const trimmedEmail = form.email.trim();
    if (
      trimmedEmail !== "" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      found.email = "Enter a valid email address.";
    }

    const openingBalance = Number(form.openingBalance);
    if (
      form.openingBalance.trim() === "" ||
      !Number.isFinite(openingBalance) ||
      openingBalance < 0
    ) {
      found.openingBalance = "Opening balance cannot be negative.";
    }

    const creditLimit = Number(form.creditLimit);
    if (
      form.creditLimit.trim() === "" ||
      !Number.isFinite(creditLimit) ||
      creditLimit < 0
    ) {
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
      type: form.type,
      email: form.email.trim(),
      phone: form.phone.trim(),
      country: form.country.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      taxNumber: form.taxNumber.trim(),
      openingBalance: Math.max(0, Number(form.openingBalance)),
      creditLimit: Math.max(0, Number(form.creditLimit)),
    };

    if (mode === "edit" && customer) {
      if (customer.name !== trimmedName) {
        const ids = sales
          .filter((sale) => sale.customer === customer.name)
          .map((sale) => sale.id);
        if (ids.length > 0) {
          updateSales(ids, { customer: trimmedName });
        }
      }
      updateCustomer(customer.id, changes);
      try {
        window.sessionStorage.setItem(CUSTOMER_UPDATED_FLAG, customer.id);
      } catch {
        // Flag is optional; navigation still works without it.
      }
    } else {
      const newCustomer: Customer = {
        id: id || `CUS_${Date.now()}`,
        ...changes,
        createdAt: new Date().toISOString(),
      };
      addCustomer(newCustomer);
      try {
        window.sessionStorage.setItem(CUSTOMER_CREATED_FLAG, newCustomer.id);
      } catch {
        // Flag is optional; navigation still works without it.
      }
    }

    router.push("/people");
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
            <span className="crumb-current">{title}</span>
          </nav>
          <h1>{title}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push("/people")}
          >
            Cancel
          </button>
          <button type="submit" form="customer-form" className="primary-button">
            <Icon
              name={mode === "edit" ? "check" : "plus"}
              className="w-3.5 h-3.5"
              strokeWidth={2.2}
            />
            {mode === "edit" ? "Save changes" : "Create customer"}
          </button>
        </div>
      </div>

      <form id="customer-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Customer Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label>Customer ID</label>
                    <div className="detail-value">
                      {id || "Auto-generated"}
                    </div>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-name">
                      Full Name <span className="required-mark">*</span>
                    </label>
                    <input
                      id="customer-name"
                      className={`filter-input${errors.name ? " invalid" : ""}`}
                      type="text"
                      placeholder="e.g. Aline Mukamana"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                    />
                    {errors.name && <p className="field-error">{errors.name}</p>}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-type">Customer Type</label>
                    <select
                      id="customer-type"
                      className="filter-select"
                      value={form.type}
                      onChange={(event) =>
                        setField("type", event.target.value as CustomerType)
                      }
                    >
                      {customerTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-phone">Phone</label>
                    <input
                      id="customer-phone"
                      className="filter-input"
                      type="tel"
                      placeholder="+250 788 000 000"
                      value={form.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-email">Email</label>
                    <input
                      id="customer-email"
                      className={`filter-input${errors.email ? " invalid" : ""}`}
                      type="email"
                      placeholder="customer@example.com"
                      value={form.email}
                      onChange={(event) => setField("email", event.target.value)}
                    />
                    {errors.email && (
                      <p className="field-error">{errors.email}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-tax">Tax Number</label>
                    <input
                      id="customer-tax"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. TIN 102938475"
                      value={form.taxNumber}
                      onChange={(event) =>
                        setField("taxNumber", event.target.value)
                      }
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-country">Country</label>
                    <select
                      id="customer-country"
                      className="filter-select"
                      value={form.country}
                      onChange={(event) =>
                        setField("country", event.target.value)
                      }
                    >
                      {customerCountries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-city">City</label>
                    <input
                      id="customer-city"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. Kigali"
                      value={form.city}
                      onChange={(event) => setField("city", event.target.value)}
                    />
                  </div>
                  <div className="filter-field span-2">
                    <label htmlFor="customer-address">Address</label>
                    <textarea
                      id="customer-address"
                      className="filter-textarea"
                      rows={2}
                      placeholder="Street, building, or area"
                      value={form.address}
                      onChange={(event) =>
                        setField("address", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Financials</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="customer-opening-balance">
                      Opening Balance
                    </label>
                    <div className="input-suffix">
                      <input
                        id="customer-opening-balance"
                        className={`filter-input${errors.openingBalance ? " invalid" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.openingBalance}
                        onChange={(event) =>
                          setField("openingBalance", event.target.value)
                        }
                      />
                      <span>RWF</span>
                    </div>
                    {errors.openingBalance && (
                      <p className="field-error">{errors.openingBalance}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="customer-credit-limit">Credit Limit</label>
                    <div className="input-suffix">
                      <input
                        id="customer-credit-limit"
                        className={`filter-input${errors.creditLimit ? " invalid" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.creditLimit}
                        onChange={(event) =>
                          setField("creditLimit", event.target.value)
                        }
                      />
                      <span>RWF</span>
                    </div>
                    {errors.creditLimit && (
                      <p className="field-error">{errors.creditLimit}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="details-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Summary</h2>
              </div>
              <div className="panel-body">
                <div className="customer-form-profile">
                  <span className="customer-avatar">
                    {initialsOf(form.name) || "C"}
                  </span>
                  <div>
                    <strong>{form.name.trim() || "New customer"}</strong>
                    <span>{form.type}</span>
                  </div>
                </div>
                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Customer ID</span>
                    <span>{id || "Auto-generated"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Email</span>
                    <span>{form.email.trim() || "-"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Phone</span>
                    <span>{form.phone.trim() || "-"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Location</span>
                    <span>
                      {[form.city.trim(), form.country.trim()]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Opening balance</span>
                    <span>{formatMoney(Number(form.openingBalance) || 0)}</span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>Credit limit</span>
                    <span>{formatMoney(Number(form.creditLimit) || 0)}</span>
                  </div>
                </div>
                <p className="warehouse-form-note">
                  Customer names are linked to sales. Renaming a customer
                  updates their sales history automatically.
                </p>
              </div>
            </section>

            {mode === "edit" ? (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Sales History</h2>
                </div>
                <div className="panel-body">
                  <div className="sale-summary-rows">
                    <div className="sale-summary-row">
                      <span>Orders</span>
                      <span>{relatedSales.length.toLocaleString()}</span>
                    </div>
                    <div className="sale-summary-row">
                      <span>Total spent</span>
                      <span>{formatMoney(totalSpent)}</span>
                    </div>
                    <div className="sale-summary-row grand">
                      <span>Outstanding</span>
                      <span>{formatMoney(outstanding)}</span>
                    </div>
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
