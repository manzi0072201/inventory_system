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
import { useProducts } from "@/components/products/products-store";
import { api, ApiClientError } from "@/lib/api";
import type { BackendStockAdjustment } from "@/lib/api-types";
import {
  nextAdjustmentReference,
  type StockAdjustment,
} from "@/lib/stock-data";

type StockContextValue = {
  adjustments: StockAdjustment[];
  addAdjustment: (adjustment: StockAdjustment) => void;
  nextReference: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const StockContext = createContext<StockContextValue | null>(null);

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiClientError ? cause.message : fallback;
}

function mapAdjustment(row: BackendStockAdjustment): StockAdjustment {
  return {
    id: row.reference,
    date: row.date,
    productId: row.productId,
    productName: row.productName,
    productCode: row.productCode,
    warehouse: row.warehouseName,
    quantity: row.quantityDelta,
    reason: row.reason,
    note: row.note ?? undefined,
  };
}

export function StockProvider({ children }: { children: ReactNode }) {
  const { reload: reloadProducts } = useProducts();
  const [items, setItems] = useState<StockAdjustment[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.stockAdjustments();
      setItems(result.items.map(mapAdjustment));
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load stock adjustments."));
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addAdjustment = useCallback(
    (adjustment: StockAdjustment) => {
      void (async () => {
        try {
          const warehouses = await api.warehouses();
          const warehouse =
            warehouses.items.find(
              (item) => item.name === adjustment.warehouse,
            ) ?? warehouses.items[0];
          if (!warehouse) {
            throw new ApiClientError(
              422,
              "WAREHOUSE_REQUIRED",
              "Create a warehouse before adjusting stock.",
            );
          }
          await api.createStockAdjustment({
            productId: adjustment.productId,
            warehouseId: warehouse.id,
            quantityDelta: adjustment.quantity,
            reason: adjustment.reason,
            date: adjustment.date,
            note: adjustment.note ?? null,
          });
          await Promise.all([load(), reloadProducts()]);
        } catch (cause) {
          setError(errorMessage(cause, "Unable to record stock adjustment."));
        }
      })();
    },
    [load, reloadProducts],
  );

  const value = useMemo<StockContextValue>(
    () => ({
      adjustments: items,
      addAdjustment,
      nextReference: nextAdjustmentReference(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addAdjustment, hydrated, error, load],
  );

  return (
    <StockContext.Provider value={value}>{children}</StockContext.Provider>
  );
}

export function useStockAdjustments(): StockContextValue {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error(
      "useStockAdjustments must be used within a StockProvider",
    );
  }
  return context;
}
