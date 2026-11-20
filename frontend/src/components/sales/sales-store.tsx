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
import type { BackendSale } from "@/lib/api-types";
import {
  defaultPaymentMethod,
  isPaymentMethod,
} from "@/lib/payments-data";
import { type Sale, type SaleStatus } from "@/lib/sales-data";

export const CREATED_FLAG = "stocky:created-sale";

export const UPDATED_FLAG = "stocky:updated-sale";

type SalesContextValue = {
  sales: Sale[];
  addSale: (sale: Sale) => void;
  updateSale: (id: string, changes: Partial<Sale>) => void;
  updateSales: (ids: string[], changes: Partial<Sale>) => void;
  deleteSale: (id: string) => Promise<void>;
  nextReference: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SalesContext = createContext<SalesContextValue | null>(null);

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function dateOnly(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function statusOf(value: string): SaleStatus {
  return value === "Cancelled" ? "Cancelled" : (value as SaleStatus);
}

function mapSale(row: BackendSale): Sale {
  return {
    id: row.id,
    date: dateOnly(row.date),
    reference: row.reference,
    seller: row.sellerName ?? row.sellerId,
    customer: row.customerName ?? row.customerId,
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

function suggestNextReference(items: Sale[]): string {
  let max = 33060;
  for (const item of items) {
    const match = /^SL_(\d+)$/.exec(item.reference);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `SL_${max + 1}`;
}

async function resolveCustomerId(name: string): Promise<string> {
  const { items } = await api.customers();
  const match = items.find(
    (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (match) return match.id;
  const created = await api.createCustomer({ name: name.trim(), type: "Individual" });
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

export function SalesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Sale[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.sales();
      setItems(rows.map(mapSale));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load sales."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addSale = useCallback(
    (sale: Sale) => {
      void (async () => {
        try {
          const [customerId, warehouseId] = await Promise.all([
            resolveCustomerId(sale.customer),
            resolveWarehouseId(sale.warehouse),
          ]);
          if (!sale.lineItems?.length) {
            throw new Error("Add at least one product before saving the sale.");
          }
          await api.createSale({
            customerId,
            warehouseId,
            date: sale.date,
            status: sale.status === "Cancelled" ? "Completed" : sale.status,
            currency: sale.currency,
            paymentMethod: sale.paymentMethod,
            paidAmount: sale.paid,
            shippingStatus: sale.shippingStatus || null,
            note: sale.note || null,
            items: sale.lineItems,
          });
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to save the sale."));
        }
      })();
    },
    [load],
  );

  const updateSale = useCallback(
    (id: string, changes: Partial<Sale>) => {
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
          if (changes.customer) {
            input.customerId = await resolveCustomerId(changes.customer);
          }
          if (changes.warehouse) {
            input.warehouseId = await resolveWarehouseId(changes.warehouse);
          }
          if (Object.keys(input).length > 0) {
            await api.updateSale(id, input);
          }
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update the sale."));
        }
      })();
    },
    [load],
  );

  const updateSales = useCallback(
    (_ids: string[], _changes: Partial<Sale>) => {
      window.setTimeout(() => void load(), 250);
    },
    [load],
  );

  const deleteSale = useCallback(
    async (id: string) => {
      try {
        await api.deleteSale(id);
        await load();
      } catch (cause) {
        setError(errorMessage(cause, "Unable to delete the sale."));
        throw cause;
      }
    },
    [load],
  );

  const value = useMemo<SalesContextValue>(
    () => ({
      sales: items,
      addSale,
      updateSale,
      updateSales,
      deleteSale,
      nextReference: suggestNextReference(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addSale, updateSale, updateSales, deleteSale, hydrated, error, load],
  );

  return (
    <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
  );
}

export function useSales(): SalesContextValue {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error("useSales must be used within a SalesProvider");
  }
  return context;
}
