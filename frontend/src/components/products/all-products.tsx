"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useProducts, CREATED_FLAG, UPDATED_FLAG } from "./products-store";
import type { MenuState } from "./product-menu";
import {
  ProductsFilters,
  type FilterKey,
  type ProductsView,
} from "./products-filters";
import { ProductsTable, type SortKey, type SortDir } from "./products-table";
import { ProductsCards } from "./products-cards";
import { ProductsPagination, getPageList } from "./products-pagination";
import { ImportProducts } from "./import-products";
import { downloadProductsCsv, printProductsPdf } from "./products-io";

export function AllProducts() {
  const router = useRouter();
  const { products, deleteProduct } = useProducts();
  const [codeQuery, setCodeQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [view, setView] = useState<ProductsView>("table");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [bannerKind, setBannerKind] = useState<"created" | "updated" | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
    const code = created ?? updated;
    if (code) {
      setCreatedCode(code);
      setBannerKind(created ? "created" : "updated");
    }
    const timer = window.setTimeout(() => {
      setCreatedCode(null);
      setBannerKind(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const closeMenu = () => setMenu(null);

  const openMenu = (id: string, button: HTMLElement) => {
    const rect = button.getBoundingClientRect();
    const flip = window.innerHeight - rect.bottom < 160;
    setMenu({
      id,
      top: flip ? rect.top - 6 : rect.bottom + 6,
      right: window.innerWidth - rect.right,
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
  }, [codeQuery, nameQuery, category, brand, warehouse, tableSearch, sortKey, sortDir, page, pageSize]);

  const filtered = useMemo(() => {
    const code = codeQuery.trim().toLowerCase();
    const name = nameQuery.trim().toLowerCase();
    const search = tableSearch.trim().toLowerCase();
    return products.filter((product) => {
      if (code && !product.code.toLowerCase().includes(code)) return false;
      if (name && !product.name.toLowerCase().includes(name)) return false;
      if (category && product.category !== category) return false;
      if (brand && product.brand !== brand) return false;
      if (warehouse && product.warehouse !== warehouse) return false;
      if (search) {
        const haystack =
          `${product.name} ${product.code} ${product.brand} ${product.category}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [products, codeQuery, nameQuery, category, brand, warehouse, tableSearch]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left =
        sortKey === "createdAt" ? (a.createdAt ?? 0) : a[sortKey];
      const right =
        sortKey === "createdAt" ? (b.createdAt ?? 0) : b[sortKey];
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

  useEffect(() => {
    if (!createdCode) return;
    document
      .getElementById(`product-row-${createdCode}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [createdCode, view, currentPage, pageSize, sortKey, sortDir]);

  const handleFilter = (key: FilterKey, value: string) => {
    setPage(1);
    switch (key) {
      case "code":
        setCodeQuery(value);
        break;
      case "name":
        setNameQuery(value);
        break;
      case "category":
        setCategory(value);
        break;
      case "brand":
        setBrand(value);
        break;
      case "warehouse":
        setWarehouse(value);
        break;
    }
  };

  const toggleSort = (key: SortKey) => {
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

  const handleDelete = (id: string) => {
    const product = products.find((entry) => entry.id === id);
    const label = product ? product.name : id;
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      deleteProduct(id);
      setSelected((current) => current.filter((entry) => entry !== id));
    }
    closeMenu();
  };

  const pagination = (
    <ProductsPagination
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
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Products</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">All Products</span>
          </nav>
          <h1>All Products</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => printProductsPdf(sorted)}
          >
            <Icon name="purchases" className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => downloadProductsCsv(sorted)}
          >
            <Icon name="table" className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setImportOpen(true)}
          >
            <Icon name="upload" className="w-3.5 h-3.5" />
            Import products
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/products/create")}
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Create product
          </button>
        </div>
      </div>

      {notice ? (
        <div className="created-banner" role="status">
          {notice}
        </div>
      ) : null}

      {createdCode && bannerKind ? (
        <div className="created-banner" role="status">
          <strong>
            {products.find((entry) => entry.id === createdCode)?.name ??
              createdCode}
          </strong>{" "}
          ({createdCode}) was {bannerKind} successfully.
        </div>
      ) : null}

      <ProductsFilters
        code={codeQuery}
        name={nameQuery}
        category={category}
        brand={brand}
        warehouse={warehouse}
        view={view}
        onFilter={handleFilter}
        onView={setView}
      />

      {view === "table" ? (
        <ProductsTable
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
          createdCode={createdCode}
          menu={menu}
          onMenuOpen={openMenu}
          onMenuClose={closeMenu}
          onDelete={handleDelete}
          footer={pagination}
        />
      ) : (
        <>
          <ProductsCards
            rows={pageRows}
            createdCode={createdCode}
            menu={menu}
            onMenuOpen={openMenu}
            onMenuClose={closeMenu}
            onDelete={handleDelete}
          />
          <section className="panel">{pagination}</section>
        </>
      )}

      <ImportProducts
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(count) => {
          setPage(1);
          setNotice(
            `Imported ${count} product${count === 1 ? "" : "s"} successfully.`,
          );
        }}
      />
    </div>
  );
}
