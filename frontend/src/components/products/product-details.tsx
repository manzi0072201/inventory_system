"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "./products-store";

const DEFAULT_IMAGE_BG = "#f3f4f6";

export function ProductDetails({ code }: { code: string }) {
  const router = useRouter();
  const { products, deleteProduct, hydrated } = useProducts();

  const product = products.find(
    (entry) => entry.code === code || entry.id === code,
  );

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading product…</div>
        </section>
      </div>
    );
  }

  if (!product) {
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
              <span className="crumb-current">Product Details</span>
            </nav>
            <h1>Product Details</h1>
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

  const margin = product.price - product.cost;
  const marginPercent = product.cost > 0 ? (margin / product.cost) * 100 : null;
  const inventoryValue = product.cost * product.quantity;
  const retailValue = product.price * product.quantity;
  const imageSource = product.image
    ? product.image.startsWith("data:")
      ? "Uploaded from device"
      : product.image
    : "No image set";
  const recordCreated = product.createdAt
    ? new Date(product.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : "—";

  const handleDelete = () => {
    if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      deleteProduct(product.id);
      router.push("/products");
    }
  };

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
            <span className="crumb-current">{product.name}</span>
          </nav>
          <h1>{product.name}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              router.push(`/products/${encodeURIComponent(product.id)}/edit`)
            }
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Edit product
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => window.print()}
          >
            <Icon name="purchases" className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            type="button"
            className="ghost-button danger"
            onClick={handleDelete}
          >
            <Icon name="trash" className="w-3.5 h-3.5" />
            Delete product
          </button>
        </div>
      </div>

      <div className="details-layout">
        <div className="details-column">
          <section className="panel">
            <div className="panel-heading">
              <h2>Product Details</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field span-2">
                  <label>Product Name</label>
                  <div className="detail-value">
                    <span className="truncate">{product.name}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Code Product</label>
                  <div className="detail-value">
                    <Icon name="barcode" className="w-3.5 h-3.5" />
                    <span className="truncate">{product.code}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Product ID</label>
                  <div className="detail-value">
                    <span className="truncate">{product.id}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Brand</label>
                  <div className="detail-value">
                    <span className="truncate">{product.brand}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Category</label>
                  <div className="detail-value">
                    <span className="truncate">{product.category}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Product Type</label>
                  <div className="detail-value">
                    <span className="unit-badge">{product.type}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Unit</label>
                  <div className="detail-value">
                    <span className="truncate">{product.unit}</span>
                  </div>
                </div>
                <div className="filter-field span-2">
                  <label>Warehouse</label>
                  <div className="detail-value">
                    <span className="truncate">{product.warehouse}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Pricing &amp; Stock</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Cost</label>
                  <div className="detail-value">
                    <span className="truncate">{product.cost.toFixed(2)}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Price</label>
                  <div className="detail-value">
                    <span className="truncate">{product.price.toFixed(2)}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Margin per unit</label>
                  <div
                    className={`detail-value${
                      margin > 0 ? " positive" : margin < 0 ? " negative" : ""
                    }`}
                  >
                    <span className="truncate">
                      {margin.toFixed(2)}
                      {marginPercent !== null
                        ? ` (${marginPercent.toFixed(1)}%)`
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Quantity</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {product.quantity.toFixed(2)} {product.unit}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Inventory value (cost)</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {inventoryValue.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Retail value (price)</label>
                  <div className="detail-value">
                    <span className="truncate">{retailValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h2>Record Information</h2>
            </div>
            <div className="panel-body form-body">
              <div className="detail-grid">
                <div className="filter-field">
                  <label>Record created</label>
                  <div className="detail-value">
                    <span className="truncate">{recordCreated}</span>
                  </div>
                </div>
                <div className="filter-field">
                  <label>Origin</label>
                  <div className="detail-value">
                    <span className="truncate">
                      {product.createdAt ? "Created in app" : "Catalog item"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <h2>Product Image</h2>
          </div>
          <div className="panel-body form-body image-body">
            <div
              className="product-thumb details-thumb"
              style={{ background: product.imageBg || DEFAULT_IMAGE_BG }}
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  style={
                    product.blend ? { mixBlendMode: "multiply" } : undefined
                  }
                />
              ) : (
                <Icon name="products" className="create-thumb-fallback" />
              )}
            </div>
            <div className="filter-field">
              <label>Thumbnail background</label>
              <div className="detail-value">
                <span
                  className="color-chip"
                  style={{ background: product.imageBg || DEFAULT_IMAGE_BG }}
                />
                <span className="truncate">{product.imageBg}</span>
              </div>
            </div>
            <div className="filter-field span-2">
              <label>Image source</label>
              <div className="detail-value">
                <span className="truncate">{imageSource}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
