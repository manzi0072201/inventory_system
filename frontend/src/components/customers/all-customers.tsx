"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useSales } from "@/components/sales/sales-store";
import type { CustomerType } from "@/lib/customers-data";
import {
  CUSTOMER_CREATED_FLAG,
  CUSTOMER_UPDATED_FLAG,
  useCustomers,
} from "./customers-store";
import {
  CustomersFilters,
  type CustomerBalanceFilter,
  type CustomerFilterKey,
} from "./customers-filters";
import {
  CustomersTable,
  type CustomerRow,
  type CustomersSortDir,
  type CustomersSortKey,
} from "./customers-table";
import type { CustomerMenuState } from "./customer-menu";
import { CustomersSummary } from "./customers-summary";
import {
  ProductsPagination as Pagination,
  getPageList,
} from "@/components/products/products-pagination";

export function AllCustomers() {
  const router = useRouter();
  const { customers, deleteCustomer } = useCustomers();
  const { sales } = useSales();
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [type, setType] = useState<CustomerType | "">("");
  const [country, setCountry] = useState("");
  const [balance, setBalance] = useState<CustomerBalanceFilter>("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<CustomersSortKey>("name");
  const [sortDir, setSortDir] = useState<CustomersSortDir>("asc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<CustomerMenuState | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [bannerKind, setBannerKind] = useState<"created" | "updated" | null>(
    null,
  );

  const rows = useMemo<CustomerRow[]>(() => {
    const metrics = new Map<
      string,
      { count: number; total: number; outstanding: number; lastOrder: string }
    >();

    for (const sale of sales) {
      const current = metrics.get(sale.customer) ?? {
        count: 0,
        total: 0,
        outstanding: 0,
        lastOrder: "",
      };
      current.count += 1;
      current.total += sale.total;
      current.outstanding += Math.max(0, sale.total - sale.paid);
      if (sale.date > current.lastOrder) current.lastOrder = sale.date;
      metrics.set(sale.customer, current);
    }

    return customers.map((customer) => {
      const current = metrics.get(customer.name);
      return {
        ...customer,
        orderCount: current?.count ?? 0,
        totalSpent: current?.total ?? 0,
        outstanding: (current?.outstanding ?? 0) + customer.openingBalance,
        lastOrder: current?.lastOrder ?? "",
      };
    });
  }, [customers, sales]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      business: rows.filter((entry) => entry.type === "Business").length,
      totalSales: rows.reduce((sum, entry) => sum + entry.totalSpent, 0),
      outstanding: rows.reduce((sum, entry) => sum + entry.outstanding, 0),
    }),
    [rows],
  );

  useEffect(() => {
    let created: string | null = null;
    let updated: string | null = null;
    try {
      created = window.sessionStorage.getItem(CUSTOMER_CREATED_FLAG);
      if (created) window.sessionStorage.removeItem(CUSTOMER_CREATED_FLAG);
      updated = window.sessionStorage.getItem(CUSTOMER_UPDATED_FLAG);
      if (updated) window.sessionStorage.removeItem(CUSTOMER_UPDATED_FLAG);
    } catch {
      created = null;
      updated = null;
    }
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
    nameQuery,
    emailQuery,
    type,
    country,
    balance,
    tableSearch,
    sortKey,
    sortDir,
    page,
    pageSize,
  ]);

  const filtered = useMemo(() => {
    const name = nameQuery.trim().toLowerCase();
    const email = emailQuery.trim().toLowerCase();
    const search = tableSearch.trim().toLowerCase();
    return rows.filter((customer) => {
      if (name && !customer.name.toLowerCase().includes(name)) return false;
      if (email && !customer.email.toLowerCase().includes(email)) return false;
      if (type && customer.type !== type) return false;
      if (country && customer.country !== country) return false;
      if (balance === "with-balance" && customer.outstanding <= 0) return false;
      if (balance === "clear" && customer.outstanding > 0) return false;
      if (search) {
        const haystack =
          `${customer.name} ${customer.id} ${customer.email} ${customer.phone} ${customer.city} ${customer.country} ${customer.taxNumber}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [
    rows,
    nameQuery,
    emailQuery,
    type,
    country,
    balance,
    tableSearch,
  ]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
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
    if (!createdId) return;
    document
      .getElementById(`customer-row-${createdId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [createdId, currentPage, pageSize, sortKey, sortDir]);

  const handleFilter = (key: CustomerFilterKey, value: string) => {
    setPage(1);
    switch (key) {
      case "name":
        setNameQuery(value);
        break;
      case "email":
        setEmailQuery(value);
        break;
      case "type":
        setType(value as CustomerType | "");
        break;
      case "country":
        setCountry(value);
        break;
      case "balance":
        setBalance(value as CustomerBalanceFilter);
        break;
    }
  };

  const toggleSort = (key: CustomersSortKey) => {
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
    const customer = customers.find((entry) => entry.id === id);
    const label = customer ? customer.name : id;
    if (
      window.confirm(
        `Delete "${label}"? Their sales history will remain unchanged. This cannot be undone.`,
      )
    ) {
      deleteCustomer(id);
      setSelected((current) => current.filter((entry) => entry !== id));
    }
    closeMenu();
  };

  const createdCustomer = createdId
    ? customers.find((entry) => entry.id === createdId)
    : undefined;

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Customers</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">All Customers</span>
          </nav>
          <h1>All Customers</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/people/create")}
          >
            <Icon name="userPlus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Create customer
          </button>
        </div>
      </div>

      {createdId && bannerKind ? (
        <div className="created-banner" role="status">
          <strong>{createdCustomer?.name ?? createdId}</strong> (
          {createdId}) was {bannerKind} successfully.
        </div>
      ) : null}

      <CustomersSummary
        total={summary.total}
        business={summary.business}
        totalSales={summary.totalSales}
        outstanding={summary.outstanding}
      />

      <CustomersFilters
        name={nameQuery}
        email={emailQuery}
        type={type}
        country={country}
        balance={balance}
        onFilter={handleFilter}
      />

      <CustomersTable
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
        onView={(id) => router.push(`/people/${encodeURIComponent(id)}`)}
        onEdit={(id) =>
          router.push(`/people/${encodeURIComponent(id)}/edit`)
        }
        onDelete={handleDelete}
        footer={
          <Pagination
            totalCount={totalCount}
            currentPage={currentPage}
            lastPage={lastPage}
            pageList={pageList}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={handlePageSize}
          />
        }
      />
    </div>
  );
}
