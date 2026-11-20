"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Product } from "@/lib/products-data";
import { ProductMenu, type MenuState } from "./product-menu";

export type SortKey =
  | "name"
  | "code"
  | "cost"
  | "price"
  | "brand"
  | "category"
  | "quantity"
  | "createdAt";

export type SortDir = "asc" | "desc";

const sortColumns: { key: SortKey; label: string; minWidth: number }[] = [
  { key: "name", label: "Name", minWidth: 260 },
  { key: "code", label: "Code", minWidth: 100 },
  { key: "cost", label: "Cost", minWidth: 80 },
  { key: "price", label: "Price", minWidth: 80 },
  { key: "brand", label: "Brand", minWidth: 90 },
  { key: "category", label: "Category", minWidth: 90 },
  { key: "quantity", label: "Quantity", minWidth: 100 },
];

type ProductsTableProps = {
  rows: Product[];
  tableSearch: string;
  onTableSearch: (value: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  selected: string[];
  onSelectToggle: (id: string) => void;
  onSelectAll: (pageIds: string[], allSelected: boolean) => void;
  createdCode: string | null;
  menu: MenuState | null;
  onMenuOpen: (id: string, button: HTMLElement) => void;
  onMenuClose: () => void;
  onDelete: (id: string) => void;
  footer: ReactNode;
};

export function ProductsTable({
  rows,
  tableSearch,
  onTableSearch,
  refreshing,
  onRefresh,
  sortKey,
  sortDir,
  onSort,
  selected,
  onSelectToggle,
  onSelectAll,
  createdCode,
  menu,
  onMenuOpen,
  onMenuClose,
  onDelete,
  footer,
}: ProductsTableProps) {
  const selectedOnPage = rows.filter((row) => selected.includes(row.id));
  const allPageSelected =
    rows.length > 0 && selectedOnPage.length === rows.length;
  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "⇅";

  return (
    <section className="panel">
      <div className="table-controls">
        <div className="table-search">
          <input
            placeholder="Search this table"
            type="text"
            value={tableSearch}
            onChange={(event) => onTableSearch(event.target.value)}
          />
          <Icon name="search" className="w-3.5 h-3.5" />
        </div>
        <div className="table-tools">
          <button type="button" className="tool-button" title="Table Columns">
            <Icon name="settings" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="tool-button"
            title="Refresh Table"
            onClick={onRefresh}
          >
            <Icon
              name="refresh"
              strokeWidth={1.8}
              className={refreshing ? "spin" : ""}
            />
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="products-table">
          <thead>
            <tr>
              <th className="checkbox-th" scope="col">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() =>
                    onSelectAll(
                      rows.map((row) => row.id),
                      allPageSelected,
                    )
                  }
                  aria-label="Select all products on this page"
                />
              </th>
              <th className="image-th" scope="col">
                Image
              </th>
              {sortColumns.map((column) => (
                <th
                  key={column.key}
                  className="sortable-th"
                  scope="col"
                  style={{ minWidth: column.minWidth }}
                >
                  <button type="button" onClick={() => onSort(column.key)}>
                    {column.label}
                    <span
                      className={`sort-arrow${sortKey === column.key ? " active" : ""}`}
                    >
                      {sortArrow(column.key)}
                    </span>
                  </button>
                </th>
              ))}
              <th className="right-align" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr
                key={product.id}
                id={`product-row-${product.id}`}
                className={createdCode === product.id ? "row-highlight" : ""}
              >
                <td className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selected.includes(product.id)}
                    onChange={() => onSelectToggle(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </td>
                <td>
                  <div
                    className="product-thumb"
                    style={{ background: product.imageBg }}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={
                          product.blend
                            ? { mixBlendMode: "multiply" }
                            : undefined
                        }
                      />
                    ) : (
                      <Icon name="products" className="thumb-fallback" />
                    )}
                  </div>
                </td>
                <td className="col-name">
                  <Link
                    href={`/products/${encodeURIComponent(product.id)}`}
                    className="product-link"
                  >
                    {product.name}
                  </Link>
                  <span className="unit-badge">{product.type}</span>
                </td>
                <td className="code-cell">
                  <Icon name="barcode" className="w-3.5 h-3.5" />
                  <span>{product.code}</span>
                </td>
                <td className="amount-cell">{product.cost.toFixed(2)}</td>
                <td className="amount-cell">{product.price.toFixed(2)}</td>
                <td>{product.brand}</td>
                <td>{product.category}</td>
                <td className="quantity-cell">
                  {product.quantity.toFixed(2)} {product.unit}
                </td>
                <td className="right-align">
                  <div className="row-actions">
                    <ProductMenu
                      productId={product.id}
                      menu={menu}
                      onOpen={onMenuOpen}
                      onClose={onMenuClose}
                      onDelete={onDelete}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="empty-row">
                <td colSpan={10}>No products match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}
