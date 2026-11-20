"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSales } from "@/components/sales/sales-store";
import { api, ApiClientError } from "@/lib/api";
import type {
  BackendReturnItem,
  BackendSaleReturn,
} from "@/lib/api-types";
import {
  isPaymentMethod,
} from "@/lib/payments-data";
import {
  isSalesReturnReason,
  isSalesReturnResolution,
  isSalesReturnStatus,
  type SalesReturn,
  type SalesReturnItem,
  type SalesReturnReason,
  type SalesReturnResolution,
  type SalesReturnStatus,
} from "@/lib/sales-returns-data";

export const SALES_RETURN_CREATED_FLAG = "stocky:created-sales-return";

export const SALES_RETURN_UPDATED_FLAG = "stocky:updated-sales-return";

type SalesReturnsContextValue = {
  salesReturns: SalesReturn[];
  addSalesReturn: (record: SalesReturn) => void;
  updateSalesReturn: (id: string, changes: Partial<SalesReturn>) => void;
  deleteSalesReturn: (id: string) => void;
  nextReference: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SalesReturnsContext = createContext<SalesReturnsContextValue | null>(
  null,
);

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function mapItems(items: BackendReturnItem[]): SalesReturnItem[] {
  return items.map((item) => ({
    saleItemId: item.id,
    productId: item.productId,
    name: item.name,
    code: item.code,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

function mapReturn(
  row: BackendSaleReturn,
  items: BackendReturnItem[] = [],
): SalesReturn {
  return {
    id: row.id,
    reference: row.reference,
    date: dateOnly(row.date),
    saleReference: row.saleReference ?? "",
    customer: row.customerName ?? row.customerId,
    warehouse: row.warehouseName ?? row.warehouseId,
    items: mapItems(items),
    reason: isSalesReturnReason(row.reason) ? row.reason : "Other",
    resolution: isSalesReturnResolution(row.resolution)
      ? row.resolution
      : "Refund",
    status: isSalesReturnStatus(row.status) ? row.status : "Pending",
    refundMethod: isPaymentMethod(row.refundMethod)
      ? row.refundMethod
      : "Cash",
    amount: row.amount,
    restock: row.restock,
    note: row.note ?? undefined,
    createdAt: row.createdAt ?? "",
  };
}

function suggestNextReference(items: SalesReturn[]): string {
  let max = 10012;
  for (const item of items) {
    const match = /^SR_(\d+)$/.exec(item.reference);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `SR_${max + 1}`;
}

async function loadDetails(rows: BackendSaleReturn[]): Promise<SalesReturn[]> {
  return Promise.all(
    rows.map(async (row) => {
      try {
        const detail = await api.salesReturn(row.id);
        return mapReturn(row, detail.items);
      } catch {
        return mapReturn(row);
      }
    }),
  );
}

async function resolveSaleItems(record: SalesReturn) {
  const { items: sales } = await api.sales();
  const sale = sales.find(
    (item) =>
      item.reference === record.saleReference || item.id === record.saleReference,
  );
  if (!sale) {
    throw new Error(`Sale "${record.saleReference}" was not found.`);
  }
  const detail = await api.sale(sale.id);
  const items = record.items.map((item) => {
    const match =
      (item.saleItemId
        ? detail.items.find((entry) => entry.id === item.saleItemId)
        : undefined) ??
      detail.items.find(
        (entry) =>
          entry.productId === item.productId ||
          entry.code === item.code ||
          entry.name === item.name,
      );
    if (!match) {
      throw new Error(`A sale item for "${item.name}" was not found.`);
    }
    return { saleItemId: match.id, quantity: item.quantity };
  });
  return { saleId: sale.id, items };
}

export function SalesReturnsProvider({ children }: { children: ReactNode }) {
  const { reload: reloadSales } = useSales();
  const [items, setItems] = useState<SalesReturn[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.salesReturns();
      setItems(await loadDetails(rows));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load sales returns."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addSalesReturn = useCallback(
    (record: SalesReturn) => {
      void (async () => {
        try {
          const { saleId, items: saleItems } = await resolveSaleItems(record);
          await api.createSalesReturn({
            saleId,
            date: record.date,
            reason: record.reason,
            resolution: record.resolution,
            status: record.status,
            refundMethod: record.refundMethod,
            note: record.note || null,
            restock: record.restock,
            items: saleItems,
          });
          await Promise.all([load(), reloadSales()]);
        } catch (cause) {
          setError(errorMessage(cause, "Unable to save the sales return."));
        }
      })();
    },
    [load, reloadSales],
  );

  const updateSalesReturn = useCallback(
    (_id: string, _changes: Partial<SalesReturn>) => {
      setError("Editing sales returns is not available in the backend yet.");
      void load();
    },
    [load],
  );

  const deleteSalesReturn = useCallback(
    (_id: string) => {
      setError("Deleting sales returns is not available in the backend yet.");
      void load();
    },
    [load],
  );

  const value = useMemo<SalesReturnsContextValue>(
    () => ({
      salesReturns: items,
      addSalesReturn,
      updateSalesReturn,
      deleteSalesReturn,
      nextReference: suggestNextReference(items),
      hydrated,
      error,
      reload: load,
    }),
    [
      items,
      addSalesReturn,
      updateSalesReturn,
      deleteSalesReturn,
      hydrated,
      error,
      load,
    ],
  );

  return (
    <SalesReturnsContext.Provider value={value}>
      {children}
    </SalesReturnsContext.Provider>
  );
}

export function useSalesReturns(): SalesReturnsContextValue {
  const context = useContext(SalesReturnsContext);
  if (!context) {
    throw new Error(
      "useSalesReturns must be used within a SalesReturnsProvider",
    );
  }
  return context;
}

export type {
  SalesReturnReason,
  SalesReturnResolution,
  SalesReturnStatus,
};
