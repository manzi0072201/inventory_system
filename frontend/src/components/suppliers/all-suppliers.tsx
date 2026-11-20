"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { usePurchases } from "@/components/purchases/purchases-store";
import {
  SUPPLIER_CREATED_FLAG,
  SUPPLIER_UPDATED_FLAG,
  useSuppliers,
} from "./suppliers-store";
import {
  SuppliersFilters,
  type SupplierBalanceFilter,
  type SupplierFilterKey,
} from "./suppliers-filters";
import {
  SuppliersTable,
  type SupplierRow,
  type SuppliersSortDir,
  type SuppliersSortKey,
} from "./suppliers-table";
import type { SupplierMenuState } from "./supplier-menu";
import { SuppliersSummary } from "./suppliers-summary";
import { ProductsPagination as Pagination, getPageList } from "@/components/products/products-pagination";

export function AllSuppliers() {
  const router = useRouter();
  const { suppliers, deleteSupplier } = useSuppliers();
  const { purchases } = usePurchases();
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [balance, setBalance] = useState<SupplierBalanceFilter>("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<SuppliersSortKey>("name");
  const [sortDir, setSortDir] = useState<SuppliersSortDir>("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<SupplierMenuState | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [bannerKind, setBannerKind] = useState<"created" | "updated" | null>(null);

  const rows = useMemo<SupplierRow[]>(() => {
    const metrics = new Map<string, { count: number; total: number; outstanding: number; last: string }>();
    for (const purchase of purchases) {
      const current = metrics.get(purchase.supplier) ?? { count: 0, total: 0, outstanding: 0, last: "" };
      current.count += 1;
      current.total += purchase.total;
      current.outstanding += Math.max(0, purchase.total - purchase.paid);
      if (purchase.date > current.last) current.last = purchase.date;
      metrics.set(purchase.supplier, current);
    }
    return suppliers.map((supplier) => {
      const current = metrics.get(supplier.name);
      return {
        ...supplier,
        purchaseCount: current?.count ?? 0,
        totalPurchased: current?.total ?? 0,
        outstanding: (current?.outstanding ?? 0) + supplier.openingBalance,
        lastPurchase: current?.last ?? "",
      };
    });
  }, [suppliers, purchases]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      categories: new Set(rows.map((r) => r.category).filter(Boolean)).size,
      totalPurchases: rows.reduce((sum, r) => sum + r.totalPurchased, 0),
      outstanding: rows.reduce((sum, r) => sum + r.outstanding, 0),
    }),
    [rows],
  );

  useEffect(() => {
    let created: string | null = null;
    let updated: string | null = null;
    try {
      created = window.sessionStorage.getItem(SUPPLIER_CREATED_FLAG);
      if (created) window.sessionStorage.removeItem(SUPPLIER_CREATED_FLAG);
      updated = window.sessionStorage.getItem(SUPPLIER_UPDATED_FLAG);
      if (updated) window.sessionStorage.removeItem(SUPPLIER_UPDATED_FLAG);
    } catch {}
    const id = created ?? updated;
    if (id) {
      setCreatedId(id);
      setBannerKind(created ? "created" : "updated");
    }
    const timer = window.setTimeout(() => {
      setCreatedId(null);
      setBannerKind(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const closeMenu = () => setMenu(null);
  const openMenu = (id: string, button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const flip = window.innerHeight - rect.bottom < 160;
    setMenu({ id, top: flip ? rect.top - 6 : rect.bottom + 6, right: window.innerWidth - rect.right, flip });
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
  }, [nameQuery, emailQuery, category, country, balance, tableSearch, sortKey, sortDir, page, pageSize]);

  const filtered = useMemo(() => {
    const name = nameQuery.trim().toLowerCase();
    const email = emailQuery.trim().toLowerCase();
    const search = tableSearch.trim().toLowerCase();
    return rows.filter((supplier) => {
      if (name && !supplier.name.toLowerCase().includes(name)) return false;
      if (email && !supplier.email.toLowerCase().includes(email)) return false;
      if (category && supplier.category !== category) return false;
      if (country && supplier.country !== country) return false;
      if (balance === "with-balance" && supplier.outstanding <= 0) return false;
      if (balance === "clear" && supplier.outstanding > 0) return false;
      if (search) {
        const haystack = `${supplier.name} ${supplier.id} ${supplier.email} ${supplier.phone} ${supplier.contact} ${supplier.city} ${supplier.country} ${supplier.category}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [rows, nameQuery, emailQuery, category, country, balance, tableSearch]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
      return String(left).localeCompare(String(right)) * direction;
    });
  }, [filtered, sortKey, sortDir]);

  const totalCount = sorted.length;
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, lastPage);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageList = getPageList(currentPage, lastPage);

  useEffect(() => {
    if (!createdId) return;
    document.getElementById(`supplier-row-${createdId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [createdId, currentPage, pageSize, sortKey, sortDir]);

  const handleFilter = (key: SupplierFilterKey, value: string) => {
    setPage(1);
    if (key === "name") setNameQuery(value);
    else if (key === "email") setEmailQuery(value);
    else if (key === "category") setCategory(value);
    else if (key === "country") setCountry(value);
    else if (key === "balance") setBalance(value as SupplierBalanceFilter);
  };

  const toggleSort = (key: SuppliersSortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((e) => e !== id) : [...current, id]));
  };

  const handleSelectAll = (pageIds: string[], allSelected: boolean) => {
    setSelected((current) => (allSelected ? current.filter((id) => !pageIds.includes(id)) : [...new Set([...current, ...pageIds])]));
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

  const handleDelete = (id: string) => {
    const supplier = suppliers.find((entry) => entry.id === id);
    const label = supplier ? supplier.name : id;
    if (window.confirm(`Delete "${label}"? Their purchase history will remain unchanged. This cannot be undone.`)) {
      deleteSupplier(id);
      setSelected((current) => current.filter((entry) => entry !== id));
    }
    closeMenu();
  };

  const createdSupplier = createdId ? suppliers.find((entry) => entry.id === createdId) : undefined;

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Suppliers</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">All Suppliers</span>
          </nav>
          <h1>All Suppliers</h1>
        </div>
        <div className="heading-actions">
          <button type="button" className="primary-button" onClick={() => router.push("/suppliers/create")}>
            <Icon name="userPlus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Create supplier
          </button>
        </div>
      </div>

      {createdId && bannerKind ? (
        <div className="created-banner" role="status">
          <strong>{createdSupplier?.name ?? createdId}</strong> ({createdId}) was {bannerKind} successfully.
        </div>
      ) : null}

      <SuppliersSummary
        total={summary.total}
        categories={summary.categories}
        totalPurchases={summary.totalPurchases}
        outstanding={summary.outstanding}
      />

      <SuppliersFilters name={nameQuery} email={emailQuery} category={category} country={country} balance={balance} onFilter={handleFilter} />

      <SuppliersTable
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
        createdId={createdId}
        menu={menu}
        onMenuOpen={openMenu}
        onMenuClose={closeMenu}
        onView={(id) => router.push(`/suppliers/${encodeURIComponent(id)}`)}
        onEdit={(id) => router.push(`/suppliers/${encodeURIComponent(id)}/edit`)}
        onDelete={handleDelete}
        footer={<Pagination totalCount={totalCount} currentPage={currentPage} lastPage={lastPage} pageList={pageList} pageSize={pageSize} onPage={setPage} onPageSize={handlePageSize} />}
      />
    </div>
  );
}
