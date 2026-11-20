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
import type { BackendWarehouse } from "@/lib/api-types";
import type { Warehouse } from "@/lib/warehouses-data";

export const WAREHOUSE_CREATED_FLAG = "stocky:warehouse-created-code";

export const WAREHOUSE_UPDATED_FLAG = "stocky:warehouse-updated-code";

type WarehousesContextValue = {
  warehouses: Warehouse[];
  addWarehouse: (warehouse: Warehouse) => void;
  updateWarehouse: (id: string, changes: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  nextCode: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const WarehousesContext = createContext<WarehousesContextValue | null>(null);

function suggestNextCode(items: Warehouse[]): string {
  let max = 0;
  for (const item of items) {
    const match = /^WH-(\d+)$/.exec(item.code);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `WH-${String(max + 1).padStart(3, "0")}`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiClientError ? cause.message : fallback;
}

function mapWarehouse(row: BackendWarehouse): Warehouse {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address ?? "",
    city: row.city ?? "",
    manager: row.manager ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    capacity: row.capacity ?? 0,
    createdAt: row.createdAt,
  };
}

function toBackendInput(warehouse: Partial<Warehouse>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (warehouse.code !== undefined) input.code = warehouse.code;
  if (warehouse.name !== undefined) input.name = warehouse.name;
  if (warehouse.address !== undefined) input.address = warehouse.address || null;
  if (warehouse.city !== undefined) input.city = warehouse.city || null;
  if (warehouse.manager !== undefined) input.manager = warehouse.manager || null;
  if (warehouse.phone !== undefined) input.phone = warehouse.phone || null;
  if (warehouse.email !== undefined) input.email = warehouse.email || null;
  if (warehouse.capacity !== undefined) input.capacity = warehouse.capacity;
  return input;
}

export function WarehousesProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Warehouse[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.warehouses();
      setItems(result.items.map(mapWarehouse));
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load warehouses."));
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addWarehouse = useCallback(
    (warehouse: Warehouse) => {
      void (async () => {
        try {
          await api.createWarehouse(toBackendInput(warehouse));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to add warehouse."));
        }
      })();
    },
    [load],
  );

  const updateWarehouse = useCallback(
    (id: string, changes: Partial<Warehouse>) => {
      void (async () => {
        try {
          await api.updateWarehouse(id, toBackendInput(changes));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update warehouse."));
        }
      })();
    },
    [load],
  );

  const deleteWarehouse = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await api.deleteWarehouse(id);
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to delete warehouse."));
        }
      })();
    },
    [load],
  );

  const value = useMemo<WarehousesContextValue>(
    () => ({
      warehouses: items,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      nextCode: suggestNextCode(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addWarehouse, updateWarehouse, deleteWarehouse, hydrated, error, load],
  );

  return (
    <WarehousesContext.Provider value={value}>
      {children}
    </WarehousesContext.Provider>
  );
}

export function useWarehouses(): WarehousesContextValue {
  const context = useContext(WarehousesContext);
  if (!context) {
    throw new Error("useWarehouses must be used within a WarehousesProvider");
  }
  return context;
}
