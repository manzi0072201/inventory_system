"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import type { BackendPayment } from "@/lib/api-types";
import { formatMoney } from "@/lib/sales-data";
import {
  paymentMethods,
  type PaymentMethod,
  type PaymentSource,
} from "@/lib/payments-data";
import {
  PaymentsFilters,
  type PaymentFilterKey,
} from "./payments-filters";
import {
  PaymentsTable,
  type PaymentRow,
  type PaymentsSortDir,
  type PaymentsSortKey,
} from "./payments-table";
import { PaymentsSummary } from "./payments-summary";
import {
  ProductsPagination as Pagination,
  getPageList,
} from "@/components/products/products-pagination";

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function dateOnly(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function sourceOf(value: string): PaymentSource | null {
  if (value === "sale" || value === "sale_return") return "Sale";
  if (value === "purchase" || value === "purchase_return") return "Purchase";
  if (value === "expense") return "Expense";
  return null;
}

function methodOf(value: string): PaymentMethod {
  return value === "Bank Account" ||
    value === "MTN MoMo" ||
    value === "Airtel Money" ||
    value === "Cash"
    ? value
    : "Cash";
}

export function AllPayments() {
  const [records, setRecords] = useState<PaymentRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceQuery, setReferenceQuery] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | "">("");
  const [sourceFilter, setSourceFilter] = useState<PaymentSource | "">("");
  const [tableSearch, setTableSearch] = useState("");
  const [sortKey, setSortKey] = useState<PaymentsSortKey>("date");
  const [sortDir, setSortDir] = useState<PaymentsSortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [paymentResult, saleResult, purchaseResult, expenseResult] =
        await Promise.all([
          api.payments(),
          api.sales(),
          api.purchases(),
          api.expenses(),
        ]);
      const saleReferences = new Map(
        saleResult.items.map((sale) => [sale.id, sale.reference]),
      );
      const purchaseReferences = new Map(
        purchaseResult.items.map((purchase) => [purchase.id, purchase.reference]),
      );
      const expenseReferences = new Map(
        expenseResult.items.map((expense) => [expense.id, expense.reference]),
      );
      const mapRows = (rows: BackendPayment[]): PaymentRow[] =>
        rows.flatMap((row) => {
          const source = sourceOf(row.sourceType);
          if (!source) return [];
          const sourceId = row.sourceId ?? "";
          const reference =
            (source === "Sale"
              ? saleReferences.get(sourceId)
              : source === "Purchase"
                ? purchaseReferences.get(sourceId)
                : expenseReferences.get(sourceId)) ?? row.reference;
          const href =
            source === "Sale"
              ? `/sales/${encodeURIComponent(reference)}`
              : source === "Purchase"
                ? `/purchases/${encodeURIComponent(reference)}`
                : `/expenses/${encodeURIComponent(sourceId || reference)}/edit`;
          return [
            {
              id: row.id,
              date: dateOnly(row.paidAt),
              reference,
              party: row.partyName ?? "Unknown",
              source,
              amount: row.amount,
              method: methodOf(row.method),
              href,
            },
          ];
        });
      setRecords(mapRows(paymentResult.items));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load payments."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(() => {
    const result = paymentMethods.reduce(
      (accumulator, method) => {
        accumulator[method] = { amount: 0, count: 0 };
        return accumulator;
      },
      {} as Record<PaymentMethod, { amount: number; count: number }>,
    );
    for (const payment of records) {
      result[payment.method].amount += payment.amount;
      result[payment.method].count += 1;
    }
    return result;
  }, [records]);

  const totalPaid = records.reduce((sum, payment) => sum + payment.amount, 0);

  const filtered = useMemo(() => {
    const reference = referenceQuery.trim().toLowerCase();
    const party = partyQuery.trim().toLowerCase();
    const search = tableSearch.trim().toLowerCase();
    return records.filter((payment) => {
      if (reference && !payment.reference.toLowerCase().includes(reference)) {
        return false;
      }
      if (party && !payment.party.toLowerCase().includes(party)) {
        return false;
      }
      if (methodFilter && payment.method !== methodFilter) return false;
      if (sourceFilter && payment.source !== sourceFilter) return false;
      if (search) {
        const haystack =
          `${payment.reference} ${payment.party} ${payment.source} ${payment.date} ${payment.method}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [
    records,
    referenceQuery,
    partyQuery,
    methodFilter,
    sourceFilter,
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

  const handleFilter = (key: PaymentFilterKey, value: string) => {
    setPage(1);
    switch (key) {
      case "reference":
        setReferenceQuery(value);
        break;
      case "party":
        setPartyQuery(value);
        break;
      case "method":
        setMethodFilter(value as PaymentMethod | "");
        break;
      case "source":
        setSourceFilter(value as PaymentSource | "");
        break;
    }
  };

  const toggleSort = (key: PaymentsSortKey) => {
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
    void load().finally(() => setRefreshing(false));
  };

  return (
    <div className="products-page">
      <div className="list-heading">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span className="crumb-link">Payments</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">All Payments</span>
          </nav>
          <h1>All Payments</h1>
          <p className="stock-panel-note">
            {records.length.toLocaleString()} payments · {formatMoney(totalPaid)}{" "}
            recorded across sales, purchases, and expenses. Payment methods are
            set on each source document.
          </p>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <PaymentsSummary totals={totals} />

      <PaymentsFilters
        reference={referenceQuery}
        party={partyQuery}
        method={methodFilter}
        source={sourceFilter}
        onFilter={handleFilter}
      />

      <PaymentsTable
        rows={hydrated ? pageRows : []}
        tableSearch={tableSearch}
        onTableSearch={handleTableSearch}
        refreshing={refreshing}
        onRefresh={refresh}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
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
