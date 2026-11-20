"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  productBrands,
  productCategories,
  productWarehouses,
  type Product,
} from "@/lib/products-data";
import { useProducts, UPDATED_FLAG } from "./products-store";
import { ProductImagePanel, DEFAULT_IMAGE_BG } from "./product-image-panel";

const unitOptions = ["pc", "kg", "g", "l", "ml", "box", "pack", "set"];
const typeOptions = ["Single", "Variable"];

type FormState = {
  name: string;
  code: string;
  brand: string;
  category: string;
  type: string;
  unit: string;
  cost: string;
  price: string;
  quantity: string;
  warehouse: string;
  image: string;
  imageBg: string;
};

function numberValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function toForm(product: Product): FormState {
  return {
    name: product.name,
    code: product.code,
    brand: product.brand,
    category: product.category,
    type: product.type,
    unit: product.unit,
    cost: String(product.cost),
    price: String(product.price),
    quantity: String(product.quantity),
    warehouse: product.warehouse,
    image: product.image,
    imageBg: product.imageBg || DEFAULT_IMAGE_BG,
  };
}

export function EditProduct({ code }: { code: string }) {
  const router = useRouter();
  const { products, updateProduct, hydrated } = useProducts();

  const product = products.find(
    (entry) => entry.code === code || entry.id === code,
  );

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (product) setForm(toForm(product));
  }, [product]);

  if (!hydrated || (product && !form)) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading product…</div>
        </section>
      </div>
    );
  }

  if (!product || !form) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Products</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/products")}
              >
                All Products
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Product</span>
            </nav>
            <h1>Edit Product</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No product found with code <strong>{code}</strong>. It may have
              been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/products")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to All Products
            </button>
          </div>
        </section>
      </div>
    );
  }

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const isCodeTaken = (value: string) =>
    products.some(
      (entry) =>
        entry.id !== product.id &&
        entry.code.trim().toLowerCase() === value.trim().toLowerCase(),
    );

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (form.name.trim() === "") found.name = "Product name is required";
    if (form.code.trim() === "") found.code = "Product code is required";
    else if (isCodeTaken(form.code))
      found.code = "This code is already in use";
    if (form.brand.trim() === "") found.brand = "Brand is required";
    if (form.category.trim() === "") found.category = "Category is required";
    if (form.warehouse.trim() === "") found.warehouse = "Warehouse is required";
    if (numberValue(form.cost) === null) found.cost = "Enter a valid cost";
    if (numberValue(form.price) === null) found.price = "Enter a valid price";
    if (numberValue(form.quantity) === null)
      found.quantity = "Enter a valid quantity";
    return found;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (imageUploading) return;
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = document.querySelector<HTMLElement>(".field-error");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    const newCode = form.code.trim();
    updateProduct(product.id, {
      id: newCode,
      code: newCode,
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim(),
      cost: Number(form.cost),
      price: Number(form.price),
      quantity: Number(form.quantity),
      unit: form.unit,
      type: form.type,
      warehouse: form.warehouse,
      image: form.image.trim(),
      imageBg: form.imageBg || DEFAULT_IMAGE_BG,
    });
    try {
      window.sessionStorage.setItem(UPDATED_FLAG, newCode);
    } catch {
      // Flag is a nicety only; navigation still works without it.
    }
    router.push("/products");
  };

  const detailsHref = `/products/${encodeURIComponent(product.id)}`;

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Products</span>
            <span className="crumb-sep">/</span>
            <span
              className="crumb-link"
              onClick={() => router.push("/products")}
            >
              All Products
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-link" onClick={() => router.push(detailsHref)}>
              {product.name}
            </span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Edit Product</span>
          </nav>
          <h1>Edit Product</h1>
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
            form="edit-product-form"
            className="primary-button"
            disabled={imageUploading}
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Save changes
          </button>
        </div>
      </div>

      <form id="edit-product-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Product Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field span-2">
                    <label htmlFor="product-name">Product Name</label>
                    <input
                      id="product-name"
                      className={`filter-input${errors.name ? " invalid" : ""}`}
                      placeholder="e.g. Bose QuietComfort Ultra Headphones"
                      type="text"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                    />
                    {errors.name && (
                      <p className="field-error">{errors.name}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-code">Code Product</label>
                    <input
                      id="product-code"
                      className={`filter-input${errors.code ? " invalid" : ""}`}
                      placeholder="e.g. EL-0035"
                      type="text"
                      value={form.code}
                      onChange={(event) => setField("code", event.target.value)}
                    />
                    {errors.code && (
                      <p className="field-error">{errors.code}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-brand">Brand</label>
                    <input
                      id="product-brand"
                      className={`filter-input${errors.brand ? " invalid" : ""}`}
                      placeholder="Choose or type a brand"
                      type="text"
                      list="brand-options"
                      value={form.brand}
                      onChange={(event) => setField("brand", event.target.value)}
                    />
                    <datalist id="brand-options">
                      {productBrands.map((brand) => (
                        <option key={brand} value={brand} />
                      ))}
                    </datalist>
                    {errors.brand && (
                      <p className="field-error">{errors.brand}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-category">Category</label>
                    <input
                      id="product-category"
                      className={`filter-input${errors.category ? " invalid" : ""}`}
                      placeholder="Choose or type a category"
                      type="text"
                      list="category-options"
                      value={form.category}
                      onChange={(event) =>
                        setField("category", event.target.value)
                      }
                    />
                    <datalist id="category-options">
                      {productCategories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    {errors.category && (
                      <p className="field-error">{errors.category}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-type">Product Type</label>
                    <select
                      id="product-type"
                      className="filter-select"
                      value={form.type}
                      onChange={(event) => setField("type", event.target.value)}
                    >
                      {typeOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-unit">Unit</label>
                    <select
                      id="product-unit"
                      className="filter-select"
                      value={form.unit}
                      onChange={(event) => setField("unit", event.target.value)}
                    >
                      {unitOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Pricing &amp; Stock</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label htmlFor="product-cost">Cost</label>
                    <input
                      id="product-cost"
                      className={`filter-input${errors.cost ? " invalid" : ""}`}
                      placeholder="e.g. 320.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost}
                      onChange={(event) => setField("cost", event.target.value)}
                    />
                    {errors.cost && (
                      <p className="field-error">{errors.cost}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-price">Price</label>
                    <input
                      id="product-price"
                      className={`filter-input${errors.price ? " invalid" : ""}`}
                      placeholder="e.g. 429.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(event) =>
                        setField("price", event.target.value)
                      }
                    />
                    {errors.price && (
                      <p className="field-error">{errors.price}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-quantity">Quantity</label>
                    <input
                      id="product-quantity"
                      className={`filter-input${errors.quantity ? " invalid" : ""}`}
                      placeholder="e.g. 109.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.quantity}
                      onChange={(event) =>
                        setField("quantity", event.target.value)
                      }
                    />
                    {errors.quantity && (
                      <p className="field-error">{errors.quantity}</p>
                    )}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="product-warehouse">Warehouse</label>
                    <select
                      id="product-warehouse"
                      className={`filter-select${errors.warehouse ? " invalid" : ""}`}
                      value={form.warehouse}
                      onChange={(event) =>
                        setField("warehouse", event.target.value)
                      }
                    >
                      <option value="">Choose Warehouse</option>
                      {productWarehouses.map((warehouse) => (
                        <option key={warehouse}>{warehouse}</option>
                      ))}
                    </select>
                    {errors.warehouse && (
                      <p className="field-error">{errors.warehouse}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <ProductImagePanel
            image={form.image}
            imageBg={form.imageBg}
            onImage={(value) => setField("image", value)}
            onImageBg={(value) => setField("imageBg", value)}
            onBusyChange={setImageUploading}
          />
        </div>
      </form>
    </div>
  );
}
