"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/components/products/products-store";
import { useSales } from "@/components/sales/sales-store";
import { usePurchases } from "@/components/purchases/purchases-store";
import { useStockAdjustments } from "@/components/stock/stock-store";
import {
  StockTable,
  type StockSortDir,
  type StockSortKey,
} from "@/components/stock/stock-table";
import {
  StockPagination,
  getPageList,
} from "@/components/stock/stock-pagination";
import { formatMoney } from "@/lib/sales-data";
import {
  buildStockMovements,
  buildStockRows,
  type StockRow,
} from "@/lib/stock-data";
import type { Warehouse } from "@/lib/warehouses-data";
import {
  useWarehouses,
  WAREHOUSE_CREATED_FLAG,
  WAREHOUSE_UPDATED_FLAG,
} from "./warehouses-store";

type Notice = {
  tone: "success" | "error";
  message: string;
};

type WarehouseMetrics = Warehouse & {
  rows: StockRow[];
  productCount: number;
  units: number;
  value: number;
  low: number;
  out: number;
  utilization: number;
  lastMovement: string;
};

function sortValue(row: StockRow, key: StockSortKey): string | number {
  switch (key) {
    case "product":
      return row.product.name;
    case "warehouse":
      return row.product.warehouse;
    case "category":
      return row.product.category;
    case "onHand":
      return row.onHand;
    case "reorderPoint":
      return row.reorderPoint;
    case "status":
      return row.status;
    case "unitCost":
      return row.product.cost;
    case "stockValue":
      return row.stockValue;
    case "lastMovement":
      return row.lastMovement?.date ?? "";
  }
}

export function WarehouseManagement() {
  const router = useRouter();
  const { products } = useProducts();
  const { sales } = useSales();
  const { purchases } = usePurchases();
  const { adjustments } = useStockAdjustments();
  const { warehouses, deleteWarehouse } = useWarehouses();

  const [selectedId, setSelectedId] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [banner, setBanner] = useState<{
    tone: "created" | "updated";
    code: string;
  } | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<StockSortKey>("product");
  const [sortDir, setSortDir] = useState<StockSortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let created: string | null = null;
    let updated: string | null = null;
    try {
      created = window.sessionStorage.getItem(WAREHOUSE_CREATED_FLAG);
      updated = window.sessionStorage.getItem(WAREHOUSE_UPDATED_FLAG);
      if (created) {
        window.sessionStorage.removeItem(WAREHOUSE_CREATED_FLAG);
      }
      if (updated) {
        window.sessionStorage.removeItem(WAREHOUSE_UPDATED_FLAG);
      }
    } catch {
      return;
    }

    const code = created ?? updated;
    if (!code) return;

    setBanner({ tone: created ? "created" : "updated", code });
    if (created) setSelectedId(code);

    const timer = window.setTimeout(() => setBanner(null), 4500);
    return () => window.clearTimeout(timer);
  }, []);

  const movements = useMemo(
    () => buildStockMovements(products, sales, purchases, adjustments),
    [products, sales, purchases, adjustments],
  );

  const rows = useMemo(
    () => buildStockRows(products, movements),
    [products, movements],
  );

  const metrics = useMemo<WarehouseMetrics[]>(
    () =>
      warehouses.map((warehouse) => {
        const warehouseRows = rows.filter(
          (row) => row.product.warehouse === warehouse.name,
        );
        const units = warehouseRows.reduce((sum, row) => sum + row.onHand, 0);
        const value = warehouseRows.reduce(
          (sum, row) => sum + row.stockValue,
          0,
        );
        const low = warehouseRows.filter(
          (row) => row.status === "Low Stock",
        ).length;
        const out = warehouseRows.filter(
          (row) => row.status === "Out of Stock",
        ).length;
        const lastMovement = warehouseRows.reduce((latest, row) => {
          const date = row.lastMovement?.date ?? "";
          return date > latest ? date : latest;
        }, "");
        const utilization =
          warehouse.capacity > 0
            ? Math.min(100, Math.round((units / warehouse.capacity) * 100))
            : 0;

        return {
          ...warehouse,
          rows: warehouseRows,
          productCount: warehouseRows.length,
          units,
          value,
          low,
          out,
          utilization,
          lastMovement,
        };
      }),
    [warehouses, rows],
  );

  const totals = useMemo(() => {
    const totalUnits = rows.reduce((sum, row) => sum + row.onHand, 0);
    const stockValue = rows.reduce((sum, row) => sum + row.stockValue, 0);
    const lowStock = rows.filter((row) => row.status === "Low Stock").length;
    const outOfStock = rows.filter(
      (row) => row.status === "Out of Stock",
    ).length;
    return { totalUnits, stockValue, lowStock, outOfStock };
  }, [rows]);

  const selected =
    metrics.find((entry) => entry.id === selectedId) ?? metrics[0] ?? null;

  const filteredRows = useMemo(() => {
    if (!selected) return [];
    const search = tableSearch.trim().toLowerCase();
    if (!search) return selected.rows;
    return selected.rows.filter((row) => {
      const haystack =
        `${row.product.name} ${row.product.code} ${row.product.brand} ${row.product.category} ${row.status}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [selected, tableSearch]);

  const sortedRows = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [filteredRows, sortKey, sortDir]);

  const totalCount = sortedRows.length;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pageRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageList = getPageList(currentPage, lastPage);

  const selectWarehouse = (id: string) => {
    setSelectedId(id);
    setTableSearch("");
    setPage(1);
  };

  const openCreate = () => {
    router.push("/warehouses/create");
  };

  const openEdit = (warehouse: Warehouse) => {
    router.push(`/warehouses/${encodeURIComponent(warehouse.code)}/edit`);
  };

  const handleDelete = (warehouse: WarehouseMetrics) => {
    if (warehouse.productCount > 0) {
      setNotice({
        tone: "error",
        message: `Move the ${warehouse.productCount} product${warehouse.productCount === 1 ? "" : "s"} assigned to ${warehouse.name} before deleting it.`,
      });
      return;
    }
    if (!window.confirm(`Delete "${warehouse.name}"? This cannot be undone.`)) {
      return;
    }
    deleteWarehouse(warehouse.id);
    if (selectedId === warehouse.id) setSelectedId("");
    setNotice({
      tone: "success",
      message: `${warehouse.name} was deleted.`,
    });
  };

  const toggleSort = (key: StockSortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleTableSearch = (value: string) => {
    setTableSearch(value);
    setPage(1);
  };

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 1300);
  };

  const openDetail = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    router.push(`/stock/${encodeURIComponent(product.code)}`);
  };

  const openAdjust = (productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    router.push(`/stock/${encodeURIComponent(product.code)}/adjust`);
  };

  const pagination = (
    <StockPagination
      totalCount={totalCount}
      currentPage={currentPage}
      lastPage={lastPage}
      pageList={pageList}
      pageSize={pageSize}
      onPage={setPage}
      onPageSize={handlePageSize}
    />
  );

  return (
    <div className="sales-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Inventory</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Warehouses</span>
          </nav>
          <h1>Warehouses</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push("/stock")}
          >
            <Icon name="stock" className="w-3.5 h-3.5" />
            Stock management
          </button>
          <button type="button" className="primary-button" onClick={openCreate}>
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Add warehouse
          </button>
        </div>
      </div>

      {banner ? (
        <div className="created-banner" role="status">
          <strong>
            {warehouses.find((entry) => entry.id === banner.code)?.name ??
              banner.code}
          </strong>{" "}
          ({banner.code}) was {banner.tone} successfully.
        </div>
      ) : null}

      {notice ? (
        <div
          className={`created-banner${notice.tone === "error" ? " error" : ""}`}
          role="status"
        >
          {notice.message}
        </div>
      ) : null}

      <section className="stock-summary-grid">
        <div className="sales-summary-card">
          <div className="sales-summary-icon purple">
            <Icon name="warehouse" className="w-4 h-4" />
          </div>
          <div className="sales-summary-copy">
            <span>Total Warehouses</span>
            <strong>{warehouses.length.toLocaleString()}</strong>
          </div>
        </div>
        <div className="sales-summary-card">
          <div className="sales-summary-icon blue">
            <Icon name="stock" className="w-4 h-4" />
          </div>
          <div className="sales-summary-copy">
            <span>Total Stock Units</span>
            <strong>{totals.totalUnits.toLocaleString()}</strong>
          </div>
        </div>
        <div className="sales-summary-card">
          <div className="sales-summary-icon green">
            <Icon name="money" className="w-4 h-4" />
          </div>
          <div className="sales-summary-copy">
            <span>Stock Value</span>
            <strong>{formatMoney(totals.stockValue)}</strong>
          </div>
        </div>
        <div className="sales-summary-card">
          <div className="sales-summary-icon amber">
            <Icon name="alert" className="w-4 h-4" />
          </div>
          <div className="sales-summary-copy">
            <span>Low Stock Items</span>
            <strong>{totals.lowStock.toLocaleString()}</strong>
          </div>
        </div>
      </section>

      {metrics.length > 0 ? (
        <section className="warehouse-grid">
          {metrics.map((warehouse) => {
            const health =
              warehouse.out > 0
                ? { label: "Needs attention", className: "out-of-stock" }
                : warehouse.low > 0
                  ? { label: "Low stock", className: "low-stock" }
                  : { label: "Healthy", className: "in-stock" };
            return (
              <article
                key={warehouse.id}
                className={`warehouse-card${selected?.id === warehouse.id ? " active" : ""}`}
              >
                <button
                  type="button"
                  className="warehouse-card-select"
                  onClick={() => selectWarehouse(warehouse.id)}
                >
                  <span className="warehouse-card-top">
                    <span className="warehouse-icon">
                      <Icon name="warehouse" className="w-4 h-4" />
                    </span>
                    <span className="warehouse-card-title">
                      <strong>{warehouse.name}</strong>
                      <span>
                        {warehouse.code} · {warehouse.city || "No city"}
                      </span>
                    </span>
                    <span className={`status-pill ${health.className}`}>
                      {health.label}
                    </span>
                  </span>

                  <span className="warehouse-card-stats">
                    <span>
                      <small>Products</small>
                      <strong>{warehouse.productCount}</strong>
                    </span>
                    <span>
                      <small>Units</small>
                      <strong>{warehouse.units.toLocaleString()}</strong>
                    </span>
                    <span>
                      <small>Stock value</small>
                      <strong>{formatMoney(warehouse.value)}</strong>
                    </span>
                  </span>

                  <span className="warehouse-capacity">
                    <span className="warehouse-capacity-meta">
                      <span>Capacity used</span>
                      <strong>{warehouse.utilization}%</strong>
                    </span>
                    <span className="stock-health-track">
                      <span
                        className={`stock-health-fill${warehouse.utilization >= 90 ? " low-stock" : ""}`}
                        style={{ width: `${warehouse.utilization}%` }}
                      />
                    </span>
                    <span className="warehouse-capacity-note">
                      {warehouse.units.toLocaleString()} of{" "}
                      {warehouse.capacity.toLocaleString()} units
                    </span>
                  </span>
                </button>

                <div className="warehouse-card-tools">
                  <button
                    type="button"
                    className="tool-button"
                    title="Edit warehouse"
                    onClick={() => openEdit(warehouse)}
                  >
                    <Icon name="edit" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    className="tool-button"
                    title="Delete warehouse"
                    onClick={() => handleDelete(warehouse)}
                  >
                    <Icon name="trash" strokeWidth={1.8} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="panel">
          <div className="panel-body warehouse-empty">
            No warehouses yet. Add your first warehouse to start organizing
            stock.
          </div>
        </section>
      )}

      {selected ? (
        <>
          <section className="panel">
            <div className="panel-heading">
              <h2>{selected.name}</h2>
              <span className="stock-panel-note">
                {selected.code} · {selected.city || "No city"}
              </span>
            </div>
            <div className="panel-body">
              <div className="warehouse-detail-grid">
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="warehouse" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Address</span>
                    <strong>{selected.address || "No address"}</strong>
                    <small>{selected.city || "No city"}</small>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="people" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Manager</span>
                    <strong>{selected.manager || "Unassigned"}</strong>
                    <small>{selected.phone || "No phone"}</small>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="mail" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Contact</span>
                    <strong>{selected.email || "No email"}</strong>
                    <small>{selected.phone || "No phone"}</small>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="stock" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Capacity</span>
                    <strong>
                      {selected.units.toLocaleString()} /{" "}
                      {selected.capacity.toLocaleString()} units
                    </strong>
                    <small>{selected.utilization}% used</small>
                  </div>
                </div>
              </div>

              <div className="warehouse-detail-metrics">
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="products" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Products</span>
                    <strong>{selected.productCount}</strong>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="money" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Stock value</span>
                    <strong>{formatMoney(selected.value)}</strong>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="alertCircle" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Low stock</span>
                    <strong>{selected.low}</strong>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="alert" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Out of stock</span>
                    <strong>{selected.out}</strong>
                  </div>
                </div>
                <div className="warehouse-detail-item">
                  <span className="warehouse-detail-icon">
                    <Icon name="history" className="w-4 h-4" />
                  </span>
                  <div>
                    <span>Last movement</span>
                    <strong>{selected.lastMovement || "No movement"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="warehouse-stock-head">
            <div>
              <h2>{selected.name} stock</h2>
              <span className="stock-panel-note">
                {selected.productCount} product
                {selected.productCount === 1 ? "" : "s"} assigned
              </span>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => router.push("/stock")}
            >
              <Icon name="stock" className="w-3.5 h-3.5" />
              Open stock management
            </button>
          </div>

          <StockTable
            rows={pageRows}
            tableSearch={tableSearch}
            onTableSearch={handleTableSearch}
            refreshing={refreshing}
            onRefresh={refresh}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onView={openDetail}
            onAdjust={openAdjust}
            footer={pagination}
          />
        </>
      ) : null}

    </div>
  );
}
