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
import { api, ApiClientError } from "@/lib/api";
import type { BackendPurchase } from "@/lib/api-types";
import { defaultPaymentMethod, isPaymentMethod } from "@/lib/payments-data";
import { type Purchase, type PurchaseStatus } from "@/lib/purchases-data";

export const CREATED_FLAG = "stocky:created-purchase";

export const UPDATED_FLAG = "stocky:updated-purchase";

type PurchasesContextValue = {
  purchases: Purchase[];
  addPurchase: (purchase: Purchase) => void;
  updatePurchase: (id: string, changes: Partial<Purchase>) => void;
  deletePurchase: (id: string) => Promise<void>;
  nextReference: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function statusOf(value: string): PurchaseStatus {
  return value === "Cancelled" ? "Cancelled" : (value as PurchaseStatus);
}

function mapPurchase(row: BackendPurchase): Purchase {
  return {
    id: row.id,
    date: dateOnly(row.date),
    reference: row.reference,
    supplier: row.supplierName ?? row.supplierId,
    buyer: row.buyerName ?? row.buyerId,
    warehouse: row.warehouseName ?? row.warehouseId,
    status: statusOf(row.status),
    currency: row.currency,
    total: row.totalAmount,
    paid: row.paidAmount,
    paymentMethod: isPaymentMethod(row.paymentMethod)
      ? row.paymentMethod
      : defaultPaymentMethod(row.reference),
    shippingStatus: row.shippingStatus ?? "",
    note: row.note ?? undefined,
  };
}

function suggestNextReference(items: Purchase[]): string {
  let max = 45060;
  for (const item of items) {
    const match = /^PO_(\d+)$/.exec(item.reference);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `PO_${max + 1}`;
}

async function resolveSupplierId(name: string): Promise<string> {
  const { items } = await api.suppliers();
  const match = items.find(
    (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (match) return match.id;
  const created = await api.createSupplier({ name: name.trim() });
  return created.id;
}

async function resolveWarehouseId(name: string): Promise<string> {
  const { items } = await api.warehouses();
  const match = items.find(
    (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (match) return match.id;
  throw new Error(`Warehouse "${name}" does not exist in the backend.`);
}

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Purchase[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.purchases();
      setItems(rows.map(mapPurchase));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load purchases."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addPurchase = useCallback(
    (purchase: Purchase) => {
      void (async () => {
        try {
          const [supplierId, warehouseId] = await Promise.all([
            resolveSupplierId(purchase.supplier),
            resolveWarehouseId(purchase.warehouse),
          ]);
          if (!purchase.lineItems?.length) {
            throw new Error("Add at least one product before saving the purchase.");
          }
          await api.createPurchase({
            supplierId,
            warehouseId,
            date: purchase.date,
            status:
              purchase.status === "Cancelled" ? "Pending" : purchase.status,
            currency: purchase.currency,
            paymentMethod: purchase.paymentMethod,
            paidAmount: purchase.paid,
            shippingStatus: purchase.shippingStatus || null,
            note: purchase.note || null,
            items: purchase.lineItems,
          });
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to save the purchase."));
        }
      })();
    },
    [load],
  );

  const updatePurchase = useCallback(
    (id: string, changes: Partial<Purchase>) => {
      void (async () => {
        try {
          const input: Record<string, unknown> = {};
          if (changes.date) input.date = dateOnly(changes.date);
          if (changes.currency) input.currency = changes.currency;
          if (changes.paymentMethod) input.paymentMethod = changes.paymentMethod;
          if (changes.shippingStatus !== undefined) {
            input.shippingStatus = changes.shippingStatus || null;
          }
          if (changes.note !== undefined) input.note = changes.note || null;
          if (changes.supplier) {
            input.supplierId = await resolveSupplierId(changes.supplier);
          }
          if (changes.warehouse) {
            input.warehouseId = await resolveWarehouseId(changes.warehouse);
          }
          if (Object.keys(input).length > 0) {
            await api.updatePurchase(id, input);
          }
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update the purchase."));
        }
      })();
    },
    [load],
  );

  const deletePurchase = useCallback(
    async (id: string) => {
      try {
        await api.deletePurchase(id);
        await load();
      } catch (cause) {
        setError(errorMessage(cause, "Unable to delete the purchase."));
        throw cause;
      }
    },
    [load],
  );

  const value = useMemo<PurchasesContextValue>(
    () => ({
      purchases: items,
      addPurchase,
      updatePurchase,
      deletePurchase,
      nextReference: suggestNextReference(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addPurchase, updatePurchase, deletePurchase, hydrated, error, load],
  );

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesContextValue {
  const context = useContext(PurchasesContext);
  if (!context) {
    throw new Error("usePurchases must be used within a PurchasesProvider");
  }
  return context;
}
