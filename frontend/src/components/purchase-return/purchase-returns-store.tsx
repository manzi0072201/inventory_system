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
import { usePurchases } from "@/components/purchases/purchases-store";
import { api, ApiClientError } from "@/lib/api";
import type {
  BackendPurchaseReturn,
  BackendReturnItem,
} from "@/lib/api-types";
import { isPaymentMethod } from "@/lib/payments-data";
import {
  isPurchaseReturnReason,
  isPurchaseReturnResolution,
  isPurchaseReturnStatus,
  type PurchaseReturn,
  type PurchaseReturnItem,
  type PurchaseReturnReason,
  type PurchaseReturnResolution,
  type PurchaseReturnStatus,
} from "@/lib/purchase-returns-data";

export const PURCHASE_RETURN_CREATED_FLAG = "stocky:created-purchase-return";

export const PURCHASE_RETURN_UPDATED_FLAG = "stocky:updated-purchase-return";

type PurchaseReturnsContextValue = {
  purchaseReturns: PurchaseReturn[];
  addPurchaseReturn: (record: PurchaseReturn) => void;
  updatePurchaseReturn: (
    id: string,
    changes: Partial<PurchaseReturn>,
  ) => void;
  deletePurchaseReturn: (id: string) => void;
  nextReference: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const PurchaseReturnsContext =
  createContext<PurchaseReturnsContextValue | null>(null);

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function mapItems(items: BackendReturnItem[]): PurchaseReturnItem[] {
  return items.map((item) => ({
    purchaseItemId: item.id,
    productId: item.productId,
    name: item.name,
    code: item.code,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

function mapReturn(
  row: BackendPurchaseReturn,
  items: BackendReturnItem[] = [],
): PurchaseReturn {
  return {
    id: row.id,
    reference: row.reference,
    date: dateOnly(row.date),
    purchaseReference: row.purchaseReference ?? "",
    supplier: row.supplierName ?? row.supplierId,
    warehouse: row.warehouseName ?? row.warehouseId,
    items: mapItems(items),
    reason: isPurchaseReturnReason(row.reason) ? row.reason : "Other",
    resolution: isPurchaseReturnResolution(row.resolution)
      ? row.resolution
      : "Refund",
    status: isPurchaseReturnStatus(row.status) ? row.status : "Pending",
    refundMethod: isPaymentMethod(row.refundMethod)
      ? row.refundMethod
      : "Cash",
    amount: row.amount,
    deductStock: row.deductStock,
    note: row.note ?? undefined,
    createdAt: row.createdAt ?? "",
  };
}

function suggestNextReference(items: PurchaseReturn[]): string {
  let max = 10012;
  for (const item of items) {
    const match = /^PR_(\d+)$/.exec(item.reference);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PR_${max + 1}`;
}

async function loadDetails(
  rows: BackendPurchaseReturn[],
): Promise<PurchaseReturn[]> {
  return Promise.all(
    rows.map(async (row) => {
      try {
        const detail = await api.purchaseReturn(row.id);
        return mapReturn(row, detail.items);
      } catch {
        return mapReturn(row);
      }
    }),
  );
}

async function resolvePurchaseItems(record: PurchaseReturn) {
  const { items: purchases } = await api.purchases();
  const purchase = purchases.find(
    (item) =>
      item.reference === record.purchaseReference ||
      item.id === record.purchaseReference,
  );
  if (!purchase) {
    throw new Error(`Purchase "${record.purchaseReference}" was not found.`);
  }
  const detail = await api.purchase(purchase.id);
  const items = record.items.map((item) => {
    const match =
      (item.purchaseItemId
        ? detail.items.find((entry) => entry.id === item.purchaseItemId)
        : undefined) ??
      detail.items.find(
        (entry) =>
          entry.productId === item.productId ||
          entry.code === item.code ||
          entry.name === item.name,
      );
    if (!match) {
      throw new Error(`A purchase item for "${item.name}" was not found.`);
    }
    return { purchaseItemId: match.id, quantity: item.quantity };
  });
  return { purchaseId: purchase.id, items };
}

export function PurchaseReturnsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { reload: reloadPurchases } = usePurchases();
  const [items, setItems] = useState<PurchaseReturn[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.purchaseReturns();
      setItems(await loadDetails(rows));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load purchase returns."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addPurchaseReturn = useCallback(
    (record: PurchaseReturn) => {
      void (async () => {
        try {
          const { purchaseId, items: purchaseItems } =
            await resolvePurchaseItems(record);
          await api.createPurchaseReturn({
            purchaseId,
            date: record.date,
            reason: record.reason,
            resolution: record.resolution,
            status: record.status,
            refundMethod: record.refundMethod,
            note: record.note || null,
            deductStock: record.deductStock,
            items: purchaseItems,
          });
          await Promise.all([load(), reloadPurchases()]);
        } catch (cause) {
          setError(errorMessage(cause, "Unable to save the purchase return."));
        }
      })();
    },
    [load, reloadPurchases],
  );

  const updatePurchaseReturn = useCallback(
    (_id: string, _changes: Partial<PurchaseReturn>) => {
      setError("Editing purchase returns is not available in the backend yet.");
      void load();
    },
    [load],
  );

  const deletePurchaseReturn = useCallback(
    (_id: string) => {
      setError("Deleting purchase returns is not available in the backend yet.");
      void load();
    },
    [load],
  );

  const value = useMemo<PurchaseReturnsContextValue>(
    () => ({
      purchaseReturns: items,
      addPurchaseReturn,
      updatePurchaseReturn,
      deletePurchaseReturn,
      nextReference: suggestNextReference(items),
      hydrated,
      error,
      reload: load,
    }),
    [
      items,
      addPurchaseReturn,
      updatePurchaseReturn,
      deletePurchaseReturn,
      hydrated,
      error,
      load,
    ],
  );

  return (
    <PurchaseReturnsContext.Provider value={value}>
      {children}
    </PurchaseReturnsContext.Provider>
  );
}

export function usePurchaseReturns(): PurchaseReturnsContextValue {
  const context = useContext(PurchaseReturnsContext);
  if (!context) {
    throw new Error(
      "usePurchaseReturns must be used within a PurchaseReturnsProvider",
    );
  }
  return context;
}

export type {
  PurchaseReturnReason,
  PurchaseReturnResolution,
  PurchaseReturnStatus,
};
