"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/components/products/products-store";
import { formatMoney } from "@/lib/sales-data";
import type { Warehouse } from "@/lib/warehouses-data";
import {
  useWarehouses,
  WAREHOUSE_CREATED_FLAG,
  WAREHOUSE_UPDATED_FLAG,
} from "./warehouses-store";

export type WarehouseFormMode = "create" | "edit";

type FormState = {
  name: string;
  manager: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  capacity: string;
};

type WarehouseFormProps = {
  mode: WarehouseFormMode;
  warehouse?: Warehouse;
};

function toForm(warehouse?: Warehouse): FormState {
  return {
    name: warehouse?.name ?? "",
    manager: warehouse?.manager ?? "",
    phone: warehouse?.phone ?? "",
    email: warehouse?.email ?? "",
    city: warehouse?.city ?? "",
    address: warehouse?.address ?? "",
    capacity: warehouse ? String(warehouse.capacity) : "1000",
  };
}

export function WarehouseForm({ mode, warehouse }: WarehouseFormProps) {
  const router = useRouter();
  const { products, updateProducts } = useProducts();
  const { warehouses, addWarehouse, updateWarehouse, nextCode } =
    useWarehouses();
  const [form, setForm] = useState<FormState>(() => toForm(warehouse));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const code = warehouse?.code ?? nextCode;
  const title = mode === "edit" ? "Edit Warehouse" : "Create Warehouse";

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const assignedProducts = useMemo(
    () =>
      warehouse
        ? products.filter((product) => product.warehouse === warehouse.name)
        : [],
    [products, warehouse],
  );

  const stockUnits = useMemo(
    () => assignedProducts.reduce((sum, product) => sum + product.quantity, 0),
    [assignedProducts],
  );

  const stockValue = useMemo(
    () =>
      assignedProducts.reduce(
        (sum, product) => sum + product.quantity * product.cost,
        0,
      ),
    [assignedProducts],
  );

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    const trimmedName = form.name.trim();

    if (trimmedName === "") {
      found.name = "Warehouse name is required.";
    } else if (
      warehouses.some(
        (entry) =>
          entry.id !== warehouse?.id &&
          entry.name.trim().toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      found.name = "A warehouse with this name already exists.";
    }

    const trimmedEmail = form.email.trim();
    if (
      trimmedEmail !== "" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      found.email = "Enter a valid email address.";
    }

    const capacityValue = Number(form.capacity);
    if (
      form.capacity.trim() === "" ||
      !Number.isFinite(capacityValue) ||
      capacityValue <= 0
    ) {
      found.capacity = "Capacity must be greater than zero.";
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
      manager: form.manager.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      capacity: Math.round(Number(form.capacity)),
    };

    if (mode === "edit" && warehouse) {
      if (warehouse.name !== trimmedName) {
        const ids = products
          .filter((product) => product.warehouse === warehouse.name)
          .map((product) => product.id);
        if (ids.length > 0) {
          updateProducts(ids, { warehouse: trimmedName });
        }
      }
      updateWarehouse(warehouse.id, changes);
      try {
        window.sessionStorage.setItem(WAREHOUSE_UPDATED_FLAG, warehouse.code);
      } catch {
        // Flag is optional; navigation still works without it.
      }
    } else {
      const newWarehouse: Warehouse = {
        id: code || `WH-${Date.now()}`,
        code: code || `WH-${Date.now()}`,
        ...changes,
        createdAt: new Date().toISOString(),
      };
      addWarehouse(newWarehouse);
      try {
        window.sessionStorage.setItem(
          WAREHOUSE_CREATED_FLAG,
          newWarehouse.code,
        );
      } catch {
        // Flag is optional; navigation still works without it.
      }
    }

    router.push("/warehouses");
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Inventory</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/warehouses")}
            >
              Warehouses
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
            onClick={() => router.push("/warehouses")}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="warehouse-form"
            className="primary-button"
          >
            <Icon
              name={mode === "edit" ? "check" : "plus"}
              className="w-3.5 h-3.5"
              strokeWidth={2.2}
            />
            {mode === "edit" ? "Save changes" : "Create warehouse"}
          </button>
        </div>
      </div>

      <form id="warehouse-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Warehouse Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label>Warehouse Code</label>
                    <div className="detail-value">{code || "Auto-generated"}</div>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="warehouse-name">
                      Warehouse Name <span className="required-mark">*</span>
                    </label>
                    <input
                      id="warehouse-name"
                      className={`filter-input${errors.name ? " invalid" : ""}`}
                      type="text"
                      placeholder="e.g. Main Warehouse"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                    />
                    {errors.name && (
                      <p className="field-error">{errors.name}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="warehouse-manager">Manager</label>
                    <input
                      id="warehouse-manager"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. Aline Mukamana"
                      value={form.manager}
                      onChange={(event) =>
                        setField("manager", event.target.value)
                      }
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="warehouse-phone">Phone</label>
                    <input
                      id="warehouse-phone"
                      className="filter-input"
                      type="tel"
                      placeholder="+250 788 000 000"
                      value={form.phone}
                      onChange={(event) =>
                        setField("phone", event.target.value)
                      }
                    />
                  </div>
                  <div className="filter-field">
                    <label htmlFor="warehouse-email">Email</label>
                    <input
                      id="warehouse-email"
                      className={`filter-input${errors.email ? " invalid" : ""}`}
                      type="email"
                      placeholder="warehouse@example.com"
                      value={form.email}
                      onChange={(event) =>
                        setField("email", event.target.value)
                      }
                    />
                    {errors.email && (
                      <p className="field-error">{errors.email}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="warehouse-city">City</label>
                    <input
                      id="warehouse-city"
                      className="filter-input"
                      type="text"
                      placeholder="e.g. Kigali"
                      value={form.city}
                      onChange={(event) => setField("city", event.target.value)}
                    />
                  </div>
                  <div className="filter-field span-2">
                    <label htmlFor="warehouse-address">Address</label>
                    <textarea
                      id="warehouse-address"
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
                <h2>Capacity</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="warehouse-capacity">
                      Capacity (units) <span className="required-mark">*</span>
                    </label>
                    <div className="input-suffix">
                      <input
                        id="warehouse-capacity"
                        className={`filter-input${errors.capacity ? " invalid" : ""}`}
                        type="number"
                        min="1"
                        step="1"
                        value={form.capacity}
                        onChange={(event) =>
                          setField("capacity", event.target.value)
                        }
                      />
                      <span>units</span>
                    </div>
                    {errors.capacity && (
                      <p className="field-error">{errors.capacity}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label>Status</label>
                    <div className="detail-value">Active</div>
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
                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Warehouse</span>
                    <span>{form.name.trim() || "New warehouse"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Code</span>
                    <span>{code || "Auto-generated"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Location</span>
                    <span>{form.city.trim() || "-"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Capacity</span>
                    <span>
                      {form.capacity.trim() === ""
                        ? "-"
                        : `${Number(form.capacity).toLocaleString()} units`}
                    </span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>Status</span>
                    <span>Active</span>
                  </div>
                </div>
                <p className="warehouse-form-note">
                  Warehouses group products and stock movements. Renaming a
                  warehouse updates every product assigned to it.
                </p>
              </div>
            </section>

            {mode === "edit" ? (
              <section className="panel">
                <div className="panel-heading">
                  <h2>Assigned Stock</h2>
                </div>
                <div className="panel-body">
                  <div className="sale-summary-rows">
                    <div className="sale-summary-row">
                      <span>Products</span>
                      <span>{assignedProducts.length.toLocaleString()}</span>
                    </div>
                    <div className="sale-summary-row">
                      <span>Stock units</span>
                      <span>{stockUnits.toLocaleString()}</span>
                    </div>
                    <div className="sale-summary-row grand">
                      <span>Stock value</span>
                      <span>{formatMoney(stockValue)}</span>
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
