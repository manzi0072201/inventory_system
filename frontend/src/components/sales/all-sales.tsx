"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { paymentStatusOf, soldProductNames } from "@/lib/sales-data";
import { useSettings } from "@/components/settings/settings-store";
import { SalesSummary } from "./sales-summary";
import { SalesFilters, type SalesFilterKey } from "./sales-filters";
import {
  SalesTable,
  type SalesSortDir,
  type SalesSortKey,
} from "./sales-table";
import { SalesPagination, getPageList } from "./sales-pagination";
import type { SaleMenuState } from "./sale-menu";
import { downloadSalesCsv, printSalesPdf } from "./sales-io";
import { CREATED_FLAG, UPDATED_FLAG, useSales } from "./sales-store";

export function AllSales() {
  const router = useRouter();
  const { sales, deleteSale } = useSales();
  const { settings } = useSettings();
  const [date, setDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [shippingStatus, setShippingStatus] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<SalesSortKey>("date");
  const [sortDir, setSortDir] = useState<SalesSortDir>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<SaleMenuState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdReference, setCreatedReference] = useState<string | null>(null);
  const [bannerKind, setBannerKind] = useState<"created" | "updated" | null>(
    null,
  );

  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let created: string | null = null;
    let updated: string | null = null;
    try {
      created = window.sessionStorage.getItem(CREATED_FLAG);
      if (created) window.sessionStorage.removeItem(CREATED_FLAG);
      updated = window.sessionStorage.getItem(UPDATED_FLAG);
      if (updated) window.sessionStorage.removeItem(UPDATED_FLAG);
    } catch {
      created = null;
      updated = null;
    }
    const reference = created ?? updated;
    if (reference) {
      setCreatedReference(reference);
      setBannerKind(created ? "created" : "updated");
    }
    const timer = window.setTimeout(() => {
      setCreatedReference(null);
      setBannerKind(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const closeMenu = () => setMenu(null);

  const openMenu = (id: string, button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const flip = window.innerHeight - rect.bottom < 160;
    const right = Math.max(
      8,
      Math.min(window.innerWidth - rect.right, window.innerWidth - 140),
    );
    setMenu({
      id,
      top: flip ? rect.top - 6 : rect.bottom + 6,
      right,
      flip,
    });
  };

  useEffect(() => {
    if (!menu) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("[data-menu-root]")) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [menu]);

  useEffect(() => {
    closeMenu();
  }, [
    date,
    customer,
    warehouse,
    status,
    paymentStatus,
    shippingStatus,
    tableSearch,
    sortKey,
    sortDir,
    page,
    pageSize,
  ]);

  const filtered = useMemo(() => {
    const search = tableSearch.trim().toLowerCase();
    return sales.filter((sale) => {
      if (date && sale.date !== date) return false;
      if (customer && sale.customer !== customer) return false;
      if (warehouse && sale.warehouse !== warehouse) return false;
      if (status && sale.status !== status) return false;
      if (paymentStatus && paymentStatusOf(sale) !== paymentStatus) return false;
      if (shippingStatus && sale.shippingStatus !== shippingStatus) return false;
      if (search) {
        const haystack =
          `${sale.reference} ${sale.seller} ${sale.customer} ${soldProductNames(sale)} ${sale.warehouse} ${sale.status} ${sale.shippingStatus}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [
    sales,
    date,
    customer,
    warehouse,
    status,
    paymentStatus,
    shippingStatus,
    tableSearch,
  ]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sortKey === "products" ? soldProductNames(a) : a[sortKey];
      const right = sortKey === "products" ? soldProductNames(b) : b[sortKey];
      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [filtered, sortKey, sortDir]);

  const summary = useMemo(() => {
    const total = sales.reduce((sum, sale) => sum + sale.total, 0);
    const paid = sales.reduce((sum, sale) => sum + sale.paid, 0);
    return {
      count: sales.length,
      total,
      paid,
    };
  }, [sales]);

  const totalCount = sorted.length;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const pageList = getPageList(currentPage, lastPage);

  useEffect(() => {
    if (!createdReference) return;
    document
      .getElementById(`sale-row-${createdReference}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [createdReference, sales, currentPage, pageSize, sortKey, sortDir]);

  const handleFilter = (key: SalesFilterKey, value: string) => {
    setPage(1);
    switch (key) {
      case "date":
        setDate(value);
        break;
      case "customer":
        setCustomer(value);
        break;
      case "warehouse":
        setWarehouse(value);
        break;
      case "status":
        setStatus(value);
        break;
      case "paymentStatus":
        setPaymentStatus(value);
        break;
      case "shippingStatus":
        setShippingStatus(value);
        break;
    }
  };

  const toggleSort = (key: SalesSortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  };

  const handleSelectAll = (pageIds: string[], allSelected: boolean) => {
    setSelected((current) =>
      allSelected
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    );
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

  const handleDelete = async (id: string) => {
    const sale = sales.find((entry) => entry.id === id);
    const label = sale ? sale.reference : id;
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      try {
        await deleteSale(id);
        setSelected((current) => current.filter((entry) => entry !== id));
        setNotice(`Sale ${label} deleted successfully.`);
      } catch {
        closeMenu();
        return;
      }
    }
    closeMenu();
  };

  const openView = (id: string) => {
    const sale = sales.find((entry) => entry.id === id);
    if (sale) {
      router.push(`/sales/${encodeURIComponent(sale.reference)}`);
    }
  };

  const openEdit = (id: string) => {
    const sale = sales.find((entry) => entry.id === id);
    if (sale) {
      router.push(`/sales/${encodeURIComponent(sale.reference)}/edit`);
    }
  };

  const pagination = (
    <SalesPagination
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
            <span className="crumb-link">Sales</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">VVT-All Sales</span>
          </nav>
          <h1>VVT-All Sales</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => printSalesPdf(sorted, settings.logoUrl)}
          >
            <Icon name="purchases" className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => downloadSalesCsv(sorted)}
          >
            <Icon name="table" className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/sales/create")}
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Create Sale
          </button>
        </div>
      </div>

      {notice ? (
        <div className="created-banner" role="status">
          {notice}
        </div>
      ) : null}

      {createdReference && bannerKind ? (
        <div className="created-banner" role="status">
          Sale <strong>{createdReference}</strong> was {bannerKind} successfully.
        </div>
      ) : null}

      <SalesSummary {...summary} />

      <SalesFilters
        date={date}
        customer={customer}
        warehouse={warehouse}
        status={status}
        paymentStatus={paymentStatus}
        shippingStatus={shippingStatus}
        onFilter={handleFilter}
      />

      <SalesTable
        rows={pageRows}
        tableSearch={tableSearch}
        onTableSearch={handleTableSearch}
        refreshing={refreshing}
        onRefresh={refresh}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        selected={selected}
        onSelectToggle={toggleSelect}
        onSelectAll={handleSelectAll}
        createdReference={createdReference}
        menu={menu}
        onMenuOpen={openMenu}
        onMenuClose={closeMenu}
        onView={openView}
        onEdit={openEdit}
        onDelete={handleDelete}
        footer={pagination}
      />

    </div>
  );
}
