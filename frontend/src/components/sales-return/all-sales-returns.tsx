"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  ProductsPagination as Pagination,
  getPageList,
} from "@/components/products/products-pagination";
import { formatMoney } from "@/lib/sales-data";
import {
  returnItemCount,
  type SalesReturn,
  type SalesReturnReason,
  type SalesReturnResolution,
  type SalesReturnStatus,
} from "@/lib/sales-returns-data";
import {
  SALES_RETURN_CREATED_FLAG,
  SALES_RETURN_UPDATED_FLAG,
  useSalesReturns,
} from "./sales-returns-store";
import {
  SalesReturnsFilters,
  type SalesReturnFilterKey,
  type SalesReturnPeriod,
} from "./sales-returns-filters";
import {
  SalesReturnsTable,
  type SalesReturnSortDir,
  type SalesReturnSortKey,
} from "./sales-returns-table";
import { SalesReturnsSummary } from "./sales-returns-summary";

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadSalesReturnsCsv(rows: SalesReturn[]) {
  const header = [
    "Reference",
    "Date",
    "Original Sale",
    "Customer",
    "Warehouse",
    "Items",
    "Reason",
    "Resolution",
    "Refund Method",
    "Amount",
    "Status",
    "Restock",
    "Note",
  ];
  const lines = rows.map((record) =>
    [
      record.reference,
      record.date,
      record.saleReference,
      record.customer,
      record.warehouse,
      record.items
        .map((item) => `${item.name} x ${item.quantity}`)
        .join("; "),
      record.reason,
      record.resolution,
      record.refundMethod,
      record.amount,
      record.status,
      record.restock ? "Yes" : "No",
      record.note ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([`\ufeff${[header.join(","), ...lines].join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sales-returns-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function matchesPeriod(dateValue: string, period: SalesReturnPeriod) {
  if (!period) return true;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  if (period === "this-year") {
    return date.getFullYear() === now.getFullYear();
  }
  if (period === "this-month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return (
    date.getFullYear() === previous.getFullYear() &&
    date.getMonth() === previous.getMonth()
  );
}

export function AllSalesReturns() {
  const router = useRouter();
  const { salesReturns, deleteSalesReturn, hydrated } = useSalesReturns();
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState<SalesReturnStatus | "">("");
  const [reason, setReason] = useState<SalesReturnReason | "">("");
  const [resolution, setResolution] = useState<SalesReturnResolution | "">("");
  const [period, setPeriod] = useState<SalesReturnPeriod>("");
  const [sortKey, setSortKey] = useState<SalesReturnSortKey>("date");
  const [sortDir, setSortDir] = useState<SalesReturnSortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdReference, setCreatedReference] = useState<string | null>(null);

  const customers = useMemo(
    () =>
      Array.from(new Set(salesReturns.map((record) => record.customer))).sort(
        (left, right) => left.localeCompare(right),
      ),
    [salesReturns],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthEntries = salesReturns.filter((record) =>
      record.date.startsWith(monthPrefix),
    );
    const pendingEntries = salesReturns.filter(
      (record) => record.status === "Pending",
    );
    return {
      total: salesReturns.reduce((sum, record) => sum + record.amount, 0),
      count: salesReturns.length,
      monthAmount: monthEntries.reduce(
        (sum, record) => sum + record.amount,
        0,
      ),
      monthCount: monthEntries.length,
      pendingAmount: pendingEntries.reduce(
        (sum, record) => sum + record.amount,
        0,
      ),
      pendingCount: pendingEntries.length,
      itemsReturned: salesReturns.reduce(
        (sum, record) => sum + returnItemCount(record.items),
        0,
      ),
    };
  }, [salesReturns]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!hydrated) return;
    let created: string | null = null;
    let updated: string | null = null;
    try {
      created = window.sessionStorage.getItem(SALES_RETURN_CREATED_FLAG);
      if (created) {
        window.sessionStorage.removeItem(SALES_RETURN_CREATED_FLAG);
      }
      updated = window.sessionStorage.getItem(SALES_RETURN_UPDATED_FLAG);
      if (updated) {
        window.sessionStorage.removeItem(SALES_RETURN_UPDATED_FLAG);
      }
    } catch {
      return;
    }
    const reference = created ?? updated;
    if (!reference) return;
    setNotice(
      `Sales return ${reference} was ${created ? "recorded" : "updated"} successfully.`,
    );
    if (created) {
      setCreatedReference(created);
      setSearchQuery("");
      setCustomer("");
      setStatus("");
      setReason("");
      setResolution("");
      setPeriod("");
      setPage(1);
      const timer = window.setTimeout(() => {
        document
          .getElementById(`sales-return-row-${created}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [hydrated]);

  const filtered = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return salesReturns.filter((record) => {
      if (customer && record.customer !== customer) return false;
      if (status && record.status !== status) return false;
      if (reason && record.reason !== reason) return false;
      if (resolution && record.resolution !== resolution) return false;
      if (!matchesPeriod(record.date, period)) return false;
      if (!search) return true;
      const haystack =
        `${record.reference} ${record.saleReference} ${record.customer} ${record.warehouse} ${record.reason} ${record.resolution} ${record.refundMethod} ${record.status} ${record.note ?? ""} ${record.items.map((item) => `${item.name} ${item.code}`).join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [
    salesReturns,
    searchQuery,
    customer,
    status,
    reason,
    resolution,
    period,
  ]);

  const sorted = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((left, right) => {
      const a = left[sortKey];
      const b = right[sortKey];
      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * direction;
      }
      return String(a).localeCompare(String(b)) * direction;
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

  const handleFilter = (key: SalesReturnFilterKey, value: string) => {
    setPage(1);
    if (key === "search") setSearchQuery(value);
    else if (key === "customer") setCustomer(value);
    else if (key === "status") setStatus(value as SalesReturnStatus | "");
    else if (key === "reason") setReason(value as SalesReturnReason | "");
    else if (key === "resolution") {
      setResolution(value as SalesReturnResolution | "");
    } else if (key === "period") setPeriod(value as SalesReturnPeriod);
  };

  const toggleSort = (key: SalesReturnSortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handlePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleDelete = (record: SalesReturn) => {
    if (
      window.confirm(
        `Delete sales return "${record.reference}"? This cannot be undone.`,
      )
    ) {
      deleteSalesReturn(record.id);
      setNotice(`Sales return ${record.reference} was deleted.`);
    }
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Sales</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Sales Returns</span>
          </nav>
          <h1>Sales Returns</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => downloadSalesReturnsCsv(sorted)}
          >
            <Icon name="table" className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/sales-return/create")}
          >
            <Icon name="plus" className="w-3.5 h-3.5" strokeWidth={2.2} />
            Record Return
          </button>
        </div>
      </div>

      {notice ? (
        <div className="created-banner" role="status">
          {notice}
        </div>
      ) : null}

      <SalesReturnsSummary {...summary} />

      <SalesReturnsFilters
        search={searchQuery}
        customer={customer}
        status={status}
        reason={reason}
        resolution={resolution}
        period={period}
        customers={customers}
        onFilter={handleFilter}
      />

      <SalesReturnsTable
        rows={pageRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        createdReference={createdReference}
        onView={(record) =>
          router.push(`/sales-return/${encodeURIComponent(record.reference)}`)
        }
        onEdit={(record) =>
          router.push(
            `/sales-return/${encodeURIComponent(record.reference)}/edit`,
          )
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
