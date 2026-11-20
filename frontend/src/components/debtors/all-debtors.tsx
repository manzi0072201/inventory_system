"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useCustomers } from "@/components/customers/customers-store";
import { useSales } from "@/components/sales/sales-store";
import {
  DebtorsFilters,
  type DebtorFilterKey,
  type DebtorStatusFilter,
} from "./debtors-filters";
import {
  DebtorsTable,
  type DebtorRow,
  type DebtorsSortDir,
  type DebtorsSortKey,
} from "./debtors-table";
import type { DebtorMenuState } from "./debtor-menu";
import { DebtorsSummary } from "./debtors-summary";
import {
  ProductsPagination as Pagination,
  getPageList,
} from "@/components/products/products-pagination";

export function AllDebtors() {
  const router = useRouter();
  const { customers } = useCustomers();
  const { sales } = useSales();
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState<DebtorStatusFilter>("");
  const [minBalance, setMinBalance] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<DebtorsSortKey>("outstanding");
  const [sortDir, setSortDir] = useState<DebtorsSortDir>("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<DebtorMenuState | null>(null);

  const rows = useMemo<DebtorRow[]>(() => {
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

    return customers
      .map((customer) => {
        const current = metrics.get(customer.name);
        return {
          ...customer,
          orderCount: current?.count ?? 0,
          totalSpent: current?.total ?? 0,
          outstanding: (current?.outstanding ?? 0) + customer.openingBalance,
          lastOrder: current?.lastOrder ?? "",
        };
      })
      .filter((customer) => customer.outstanding > 0);
  }, [customers, sales]);

  const summary = useMemo(() => {
    const totalOutstanding = rows.reduce((sum, entry) => sum + entry.outstanding, 0);
    return {
      totalDebtors: rows.length,
      totalOutstanding,
      averageBalance: rows.length > 0 ? totalOutstanding / rows.length : 0,
      overLimit: rows.filter(
        (entry) => entry.creditLimit > 0 && entry.outstanding > entry.creditLimit,
      ).length,
    };
  }, [rows]);

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
  }, [
    nameQuery,
    emailQuery,
    country,
    status,
    minBalance,
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
    const minimum = minBalance.trim() ? Number.parseFloat(minBalance) : 0;

    return rows.filter((debtor) => {
      if (name && !debtor.name.toLowerCase().includes(name)) return false;
      if (email && !debtor.email.toLowerCase().includes(email)) return false;
      if (country && debtor.country !== country) return false;
      if (status === "over-limit" && !(debtor.creditLimit > 0 && debtor.outstanding > debtor.creditLimit)) return false;
      if (status === "within-limit" && debtor.creditLimit > 0 && debtor.outstanding > debtor.creditLimit) return false;
      if (Number.isFinite(minimum) && minimum > 0 && debtor.outstanding < minimum) return false;
      if (search) {
        const haystack =
          `${debtor.name} ${debtor.id} ${debtor.email} ${debtor.phone} ${debtor.city} ${debtor.country} ${debtor.taxNumber}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [rows, nameQuery, emailQuery, country, status, minBalance, tableSearch]);

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

  const handleFilter = (key: DebtorFilterKey, value: string) => {
    setPage(1);
    switch (key) {
      case "name":
        setNameQuery(value);
        break;
      case "email":
        setEmailQuery(value);
        break;
      case "country":
        setCountry(value);
        break;
      case "status":
        setStatus(value as DebtorStatusFilter);
        break;
      case "minBalance":
        setMinBalance(value);
        break;
    }
  };

  const toggleSort = (key: DebtorsSortKey) => {
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

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Debtors</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">All Debtors</span>
          </nav>
          <h1>All Debtors</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/people")}
          >
            <Icon name="people" className="w-3.5 h-3.5" strokeWidth={2.2} />
            View customers
          </button>
        </div>
      </div>

      <DebtorsSummary
        totalDebtors={summary.totalDebtors}
        totalOutstanding={summary.totalOutstanding}
        averageBalance={summary.averageBalance}
        overLimit={summary.overLimit}
      />

      <DebtorsFilters
        name={nameQuery}
        email={emailQuery}
        country={country}
        status={status}
        minBalance={minBalance}
        onFilter={handleFilter}
      />

      <DebtorsTable
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
        menu={menu}
        onMenuOpen={openMenu}
        onMenuClose={closeMenu}
        onView={(id) => router.push(`/people/${encodeURIComponent(id)}`)}
        onEdit={(id) => router.push(`/people/${encodeURIComponent(id)}/edit`)}
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
