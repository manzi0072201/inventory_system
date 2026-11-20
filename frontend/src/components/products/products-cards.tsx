"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Product } from "@/lib/products-data";
import { ProductMenu, type MenuState } from "./product-menu";

type ProductsCardsProps = {
  rows: Product[];
  createdCode: string | null;
  menu: MenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onDelete: (id: string) => void;
};

export function ProductsCards({
  rows,
  createdCode,
  menu,
  onMenuOpen,
  onMenuClose,
  onDelete,
}: ProductsCardsProps) {
  return (
    <div className="product-cards">
      {rows.map((product) => (
        <article
          key={product.id}
          id={`product-row-${product.id}`}
          className={`product-card${
            createdCode === product.id ? " row-highlight" : ""
          }`}
        >
          <div
            className="product-thumb card-thumb"
            style={{ background: product.imageBg }}
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
              <Icon name="products" className="thumb-fallback" />
            )}
          </div>
          <div className="card-body">
            <Link
              href={`/products/${encodeURIComponent(product.id)}`}
              className="product-link"
            >
              {product.name}
            </Link>
            <span className="unit-badge">{product.type}</span>
            <div className="code-cell">
              <Icon name="barcode" className="w-3.5 h-3.5" />
              <span>{product.code}</span>
            </div>
          </div>
          <dl className="card-meta">
            <div>
              <dt>Brand</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{product.category}</dd>
            </div>
            <div>
              <dt>Warehouse</dt>
              <dd>{product.warehouse}</dd>
            </div>
          </dl>
          <div className="card-foot">
            <div className="card-amounts">
              <div>
                <small>Cost</small>
                <strong>{product.cost.toFixed(2)}</strong>
              </div>
              <div>
                <small>Price</small>
                <strong>{product.price.toFixed(2)}</strong>
              </div>
              <div>
                <small>Quantity</small>
                <strong>
                  {product.quantity.toFixed(2)} {product.unit}
                </strong>
              </div>
            </div>
            <ProductMenu
              productId={product.id}
              menu={menu}
              onOpen={onMenuOpen}
              onClose={onMenuClose}
              onDelete={onDelete}
            />
          </div>
        </article>
      ))}
      {rows.length === 0 && (
        <div className="empty-row cards-empty">
          No products match your filters
        </div>
      )}
    </div>
  );
}
