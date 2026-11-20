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
import type { BackendSupplier } from "@/lib/api-types";
import type { Supplier } from "@/lib/suppliers-data";

export const SUPPLIER_CREATED_FLAG = "stocky:created-supplier";

export const SUPPLIER_UPDATED_FLAG = "stocky:updated-supplier";

type SuppliersContextValue = {
  suppliers: Supplier[];
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, changes: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  nextId: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const SuppliersContext = createContext<SuppliersContextValue | null>(null);

function suggestNextId(items: Supplier[]): string {
  let max = 1000;
  for (const item of items) {
    const match = /^SUP_(\d+)$/i.exec(item.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `SUP_${max + 1}`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiClientError ? cause.message : fallback;
}

function mapSupplier(row: BackendSupplier): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    country: row.country ?? "",
    city: row.city ?? "",
    address: row.address ?? "",
    category: row.category ?? "",
    taxNumber: row.taxNumber ?? "",
    openingBalance: row.openingBalance,
    creditLimit: row.creditLimit,
    createdAt: row.createdAt,
  };
}

function toBackendInput(supplier: Partial<Supplier>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (supplier.name !== undefined) input.name = supplier.name;
  if (supplier.contact !== undefined) input.contact = supplier.contact || null;
  if (supplier.email !== undefined) input.email = supplier.email || null;
  if (supplier.phone !== undefined) input.phone = supplier.phone || null;
  if (supplier.country !== undefined) input.country = supplier.country || null;
  if (supplier.city !== undefined) input.city = supplier.city || null;
  if (supplier.address !== undefined) input.address = supplier.address || null;
  if (supplier.category !== undefined) input.category = supplier.category || null;
  if (supplier.taxNumber !== undefined) input.taxNumber = supplier.taxNumber || null;
  if (supplier.openingBalance !== undefined) {
    input.openingBalance = supplier.openingBalance;
  }
  if (supplier.creditLimit !== undefined) input.creditLimit = supplier.creditLimit;
  return input;
}

export function SuppliersProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Supplier[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.suppliers();
      setItems(result.items.map(mapSupplier));
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load suppliers."));
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addSupplier = useCallback(
    (supplier: Supplier) => {
      void (async () => {
        try {
          await api.createSupplier(toBackendInput(supplier));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to add supplier."));
        }
      })();
    },
    [load],
  );

  const updateSupplier = useCallback(
    (id: string, changes: Partial<Supplier>) => {
      void (async () => {
        try {
          await api.updateSupplier(id, toBackendInput(changes));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update supplier."));
        }
      })();
    },
    [load],
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await api.deleteSupplier(id);
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to delete supplier."));
        }
      })();
    },
    [load],
  );

  const value = useMemo<SuppliersContextValue>(
    () => ({
      suppliers: items,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      nextId: suggestNextId(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addSupplier, updateSupplier, deleteSupplier, hydrated, error, load],
  );

  return (
    <SuppliersContext.Provider value={value}>
      {children}
    </SuppliersContext.Provider>
  );
}

export function useSuppliers(): SuppliersContextValue {
  const context = useContext(SuppliersContext);
  if (!context) {
    throw new Error("useSuppliers must be used within a SuppliersProvider");
  }
  return context;
}
