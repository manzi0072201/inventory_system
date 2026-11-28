"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useProducts } from "@/components/products/products-store";
import { useSales } from "@/components/sales/sales-store";
import { usePurchases } from "@/components/purchases/purchases-store";
import { formatMoney } from "@/lib/sales-data";
import {
  buildStockMovements,
  buildStockRows,
  type StockRow,
  type StockStatus,
} from "@/lib/stock-data";
import { StockSummary } from "./stock-summary";
import { StockFilters, type StockFilterKey } from "./stock-filters";
import {
  StockTable,
  type StockSortDir,
  type StockSortKey,
} from "./stock-table";
import { StockMovements } from "./stock-movements";
import { StockPagination, getPageList } from "./stock-pagination";
import { downloadStockCsv, printStockPdf } from "./stock-io";
import { useStockAdjustments } from "./stock-store";

function sortValue(row: StockRow, key: StockSortKey): string | number {
  switch (key) {
    case "product":
      return row.product.name;
    case "warehouse":
      return row.product.warehouse;
    case "category":
      return row.product.category;
    case "beginningStock":
      return row.beginningStock;
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

export function StockManagement() {
  const router = useRouter();
  const { products } = useProducts();
  const { sales } = useSales();
  const { purchases } = usePurchases();
  const { adjustments } = useStockAdjustments();

  const [warehouse, setWarehouse] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<StockSortKey>("product");
  const [sortDir, setSortDir] = useState<StockSortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [movementLimit, setMovementLimit] = useState(8);

  const movements = useMemo(
    () => buildStockMovements(products, sales, purchases, adjustments),
    [products, sales, purchases, adjustments],
  );

  const rows = useMemo(
    () => buildStockRows(products, movements),
    [products, movements],
  );

  const summary = useMemo(() => {
    const totalUnits = rows.reduce((sum, row) => sum + row.onHand, 0);
    const stockValue = rows.reduce((sum, row) => sum + row.stockValue, 0);
    const lowStock = rows.filter((row) => row.status === "Low Stock").length;
    const outOfStock = rows.filter(
      (row) => row.status === "Out of Stock",
    ).length;
    const notStocked = rows.filter((row) => row.status === "Not Stocked").length;
    return {
      totalUnits,
      stockValue,
      lowStock,
      outOfStock,
      notStocked,
      inStock: rows.length - lowStock - outOfStock - notStocked,
    };
  }, [rows]);

  const openSales = useMemo(
    () => sales.filter((sale) => sale.status !== "Completed"),
    [sales],
  );
  const openPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.status !== "Received"),
    [purchases],
  );
  const openSalesValue = useMemo(
    () => openSales.reduce((sum, sale) => sum + sale.total, 0),
    [openSales],
  );
  const openPurchasesValue = useMemo(
    () => openPurchases.reduce((sum, purchase) => sum + purchase.total, 0),
    [openPurchases],
  );

  const filtered = useMemo(() => {
    const search = tableSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (warehouse && row.product.warehouse !== warehouse) return false;
      if (category && row.product.category !== category) return false;
      if (brand && row.product.brand !== brand) return false;
      if (status && row.status !== status) return false;
      if (search) {
        const haystack =
          `${row.product.name} ${row.product.code} ${row.product.brand} ${row.product.category} ${row.product.warehouse} ${row.status}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [rows, warehouse, category, brand, status, tableSearch]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sortValue(a, sortKey);
      const right = sortValue(b, sortKey);
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [filtered, sortKey, sortDir]);

  const totalCount = sorted.length;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageList = getPageList(currentPage, lastPage);

  const filteredMovements = useMemo(
    () =>
      movements.filter(
        (movement) => !movementType || movement.type === movementType,
      ),
    [movements, movementType],
  );
  const visibleMovements = filteredMovements.slice(0, movementLimit);

  const health: { label: string; count: number; status: StockStatus }[] = [
    { label: "In Stock", count: summary.inStock, status: "In Stock" },
    { label: "Low Stock", count: summary.lowStock, status: "Low Stock" },
    { label: "Out of Stock", count: summary.outOfStock, status: "Out of Stock" },
    {
      label: "Not Stocked",
      count: summary.notStocked,
      status: "Not Stocked",
    },
  ];

  const handleFilter = (key: StockFilterKey, value: string) => {
    setPage(1);
    switch (key) {
      case "warehouse":
        setWarehouse(value);
        break;
      case "category":
        setCategory(value);
        break;
      case "brand":
        setBrand(value);
        break;
      case "status":
        setStatus(value);
        break;
    }
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

  const openAdjust = (productId: string | null) => {
    if (!productId) {
      router.push("/stock/adjust");
      return;
    }
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;
    router.push(`/stock/${encodeURIComponent(product.code)}/adjust`);
  };

  const handleMovementType = (value: string) => {
    setMovementType(value);
    setMovementLimit(8);
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
            <span className="crumb-current">Stock Management</span>
          </nav>
          <h1>Stock Management</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => printStockPdf(sorted)}
          >
            <Icon name="purchases" className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => downloadStockCsv(sorted)}
          >
            <Icon name="table" className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => openAdjust(null)}
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Adjust Stock
          </button>
        </div>
      </div>

      <StockSummary
        totalUnits={summary.totalUnits}
        stockValue={summary.stockValue}
        lowStock={summary.lowStock}
        outOfStock={summary.outOfStock}
      />

      <div className="stock-insight-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Stock Health</h2>
            <span className="stock-panel-note">
              {rows.length.toLocaleString()} products
            </span>
          </div>
          <div className="panel-body">
            <div className="stock-health-rows">
              {health.map((entry) => {
                const percent =
                  rows.length > 0
                    ? Math.round((entry.count / rows.length) * 100)
                    : 0;
                return (
                  <div key={entry.label} className="stock-health-row">
                    <span className="stock-health-label">
                      <i
                        className={`stock-health-dot ${entry.status.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      {entry.label}
                    </span>
                    <span className="stock-health-track">
                      <span
                        className={`stock-health-fill ${entry.status.toLowerCase().replace(/\s+/g, "-")}`}
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="stock-health-count">
                      {entry.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>Sales &amp; Purchase Links</h2>
            <span className="stock-panel-note">Open commitments</span>
          </div>
          <div className="panel-body">
            <div className="stock-commitment-grid">
              <Link href="/sales" className="stock-commitment-card">
                <span className="stock-commitment-icon sales">
                  <Icon name="sales" className="w-4 h-4" />
                </span>
                <span className="stock-commitment-copy">
                  <span>Open sales orders</span>
                  <strong>{openSales.length.toLocaleString()}</strong>
                  <small>{formatMoney(openSalesValue)}</small>
                </span>
                <Icon
                  name="arrowRight"
                  className="w-3.5 h-3.5 stock-commitment-arrow"
                />
              </Link>
              <Link href="/purchases" className="stock-commitment-card">
                <span className="stock-commitment-icon purchases">
                  <Icon name="purchases" className="w-4 h-4" />
                </span>
                <span className="stock-commitment-copy">
                  <span>Open purchase orders</span>
                  <strong>{openPurchases.length.toLocaleString()}</strong>
                  <small>{formatMoney(openPurchasesValue)}</small>
                </span>
                <Icon
                  name="arrowRight"
                  className="w-3.5 h-3.5 stock-commitment-arrow"
                />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <StockFilters
        warehouse={warehouse}
        category={category}
        brand={brand}
        status={status}
        onFilter={handleFilter}
      />

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

      <StockMovements
        movements={visibleMovements}
        totalCount={filteredMovements.length}
        movementType={movementType}
        onMovementType={handleMovementType}
        onLoadMore={() => setMovementLimit((limit) => limit + 8)}
        canLoadMore={visibleMovements.length < filteredMovements.length}
      />
    </div>
  );
}
