"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  ProductsPagination as Pagination,
  getPageList,
} from "@/components/products/products-pagination";
import { formatMoney } from "@/lib/purchases-data";
import {
  purchaseReturnItemCount,
  type PurchaseReturn,
  type PurchaseReturnReason,
  type PurchaseReturnResolution,
  type PurchaseReturnStatus,
} from "@/lib/purchase-returns-data";
import {
  PURCHASE_RETURN_CREATED_FLAG,
  PURCHASE_RETURN_UPDATED_FLAG,
  usePurchaseReturns,
} from "./purchase-returns-store";
import {
  PurchaseReturnsFilters,
  type PurchaseReturnFilterKey,
  type PurchaseReturnPeriod,
} from "./purchase-returns-filters";
import {
  PurchaseReturnsTable,
  type PurchaseReturnSortDir,
  type PurchaseReturnSortKey,
} from "./purchase-returns-table";
import { PurchaseReturnsSummary } from "./purchase-returns-summary";

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadPurchaseReturnsCsv(rows: PurchaseReturn[]) {
  const header = [
    "Reference",
    "Date",
    "Original Purchase",
    "Supplier",
    "Warehouse",
    "Items",
    "Reason",
    "Resolution",
    "Refund Method",
    "Amount",
    "Status",
    "Deduct Stock",
    "Note",
  ];
  const lines = rows.map((record) =>
    [
      record.reference,
      record.date,
      record.purchaseReference,
      record.supplier,
      record.warehouse,
      record.items
        .map((item) => `${item.name} x ${item.quantity}`)
        .join("; "),
      record.reason,
      record.resolution,
      record.refundMethod,
      record.amount,
      record.status,
      record.deductStock ? "Yes" : "No",
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
  link.download = `purchase-returns-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function matchesPeriod(dateValue: string, period: PurchaseReturnPeriod) {
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

export function AllPurchaseReturns() {
  const router = useRouter();
  const { purchaseReturns, deletePurchaseReturn, hydrated } =
    usePurchaseReturns();
  const [searchQuery, setSearchQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState<PurchaseReturnStatus | "">("");
  const [reason, setReason] = useState<PurchaseReturnReason | "">("");
  const [resolution, setResolution] = useState<PurchaseReturnResolution | "">(
    "",
  );
  const [period, setPeriod] = useState<PurchaseReturnPeriod>("");
  const [sortKey, setSortKey] = useState<PurchaseReturnSortKey>("date");
  const [sortDir, setSortDir] = useState<PurchaseReturnSortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState<string | null>(null);
  const [createdReference, setCreatedReference] = useState<string | null>(null);

  const suppliers = useMemo(
    () =>
      Array.from(
        new Set(purchaseReturns.map((record) => record.supplier)),
      ).sort((left, right) => left.localeCompare(right)),
    [purchaseReturns],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthEntries = purchaseReturns.filter((record) =>
      record.date.startsWith(monthPrefix),
    );
    const pendingEntries = purchaseReturns.filter(
      (record) => record.status === "Pending",
    );
    return {
      total: purchaseReturns.reduce((sum, record) => sum + record.amount, 0),
      count: purchaseReturns.length,
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
      itemsReturned: purchaseReturns.reduce(
        (sum, record) => sum + purchaseReturnItemCount(record.items),
        0,
      ),
    };
  }, [purchaseReturns]);

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
      created = window.sessionStorage.getItem(PURCHASE_RETURN_CREATED_FLAG);
      if (created) {
        window.sessionStorage.removeItem(PURCHASE_RETURN_CREATED_FLAG);
      }
      updated = window.sessionStorage.getItem(PURCHASE_RETURN_UPDATED_FLAG);
      if (updated) {
        window.sessionStorage.removeItem(PURCHASE_RETURN_UPDATED_FLAG);
      }
    } catch {
      return;
    }
    const reference = created ?? updated;
    if (!reference) return;
    setNotice(
      `Purchase return ${reference} was ${created ? "recorded" : "updated"} successfully.`,
    );
    if (created) {
      setCreatedReference(created);
      setSearchQuery("");
      setSupplier("");
      setStatus("");
      setReason("");
      setResolution("");
      setPeriod("");
      setPage(1);
      const timer = window.setTimeout(() => {
        document
          .getElementById(`purchase-return-row-${created}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [hydrated]);

  const filtered = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return purchaseReturns.filter((record) => {
      if (supplier && record.supplier !== supplier) return false;
      if (status && record.status !== status) return false;
      if (reason && record.reason !== reason) return false;
      if (resolution && record.resolution !== resolution) return false;
      if (!matchesPeriod(record.date, period)) return false;
      if (!search) return true;
      const haystack =
        `${record.reference} ${record.purchaseReference} ${record.supplier} ${record.warehouse} ${record.reason} ${record.resolution} ${record.refundMethod} ${record.status} ${record.note ?? ""} ${record.items.map((item) => `${item.name} ${item.code}`).join(" ")}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [
    purchaseReturns,
    searchQuery,
    supplier,
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

  const handleFilter = (key: PurchaseReturnFilterKey, value: string) => {
    setPage(1);
    if (key === "search") setSearchQuery(value);
    else if (key === "supplier") setSupplier(value);
    else if (key === "status") setStatus(value as PurchaseReturnStatus | "");
    else if (key === "reason") setReason(value as PurchaseReturnReason | "");
    else if (key === "resolution") {
      setResolution(value as PurchaseReturnResolution | "");
    } else if (key === "period") setPeriod(value as PurchaseReturnPeriod);
  };

  const toggleSort = (key: PurchaseReturnSortKey) => {
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

  const handleDelete = (record: PurchaseReturn) => {
    if (
      window.confirm(
        `Delete purchase return "${record.reference}"? This cannot be undone.`,
      )
    ) {
      deletePurchaseReturn(record.id);
      setNotice(`Purchase return ${record.reference} was deleted.`);
    }
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Purchasing</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Purchase Returns</span>
          </nav>
          <h1>Purchase Returns</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => downloadPurchaseReturnsCsv(sorted)}
          >
            <Icon name="table" className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => router.push("/purchase-return/create")}
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

      <PurchaseReturnsSummary {...summary} />

      <PurchaseReturnsFilters
        search={searchQuery}
        supplier={supplier}
        status={status}
        reason={reason}
        resolution={resolution}
        period={period}
        suppliers={suppliers}
        onFilter={handleFilter}
      />

      <PurchaseReturnsTable
        rows={pageRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        createdReference={createdReference}
        onView={(record) =>
          router.push(
            `/purchase-return/${encodeURIComponent(record.reference)}`,
          )
        }
        onEdit={(record) =>
          router.push(
            `/purchase-return/${encodeURIComponent(record.reference)}/edit`,
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
