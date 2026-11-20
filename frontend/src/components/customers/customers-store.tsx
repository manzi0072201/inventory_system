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
import type { BackendCustomer } from "@/lib/api-types";
import type { Customer, CustomerType } from "@/lib/customers-data";

export const CUSTOMER_CREATED_FLAG = "stocky:created-customer";

export const CUSTOMER_UPDATED_FLAG = "stocky:updated-customer";

type CustomersContextValue = {
  customers: Customer[];
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, changes: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  nextId: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const CustomersContext = createContext<CustomersContextValue | null>(null);

function suggestNextId(items: Customer[]): string {
  let max = 1000;
  for (const item of items) {
    const match = /^CUS_(\d+)$/.exec(item.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `CUS_${max + 1}`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiClientError ? cause.message : fallback;
}

function mapCustomer(row: BackendCustomer): Customer {
  return {
    id: row.id,
    name: row.name,
    type: (row.type === "Business" ? "Business" : "Individual") as CustomerType,
    email: row.email ?? "",
    phone: row.phone ?? "",
    country: row.country ?? "",
    city: row.city ?? "",
    address: row.address ?? "",
    taxNumber: row.taxNumber ?? "",
    openingBalance: row.openingBalance,
    creditLimit: row.creditLimit,
    createdAt: row.createdAt,
  };
}

function toBackendInput(customer: Partial<Customer>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (customer.name !== undefined) input.name = customer.name;
  if (customer.type !== undefined) input.type = customer.type;
  if (customer.email !== undefined) input.email = customer.email || null;
  if (customer.phone !== undefined) input.phone = customer.phone || null;
  if (customer.country !== undefined) input.country = customer.country || null;
  if (customer.city !== undefined) input.city = customer.city || null;
  if (customer.address !== undefined) input.address = customer.address || null;
  if (customer.taxNumber !== undefined) input.taxNumber = customer.taxNumber || null;
  if (customer.openingBalance !== undefined) {
    input.openingBalance = customer.openingBalance;
  }
  if (customer.creditLimit !== undefined) input.creditLimit = customer.creditLimit;
  return input;
}

export function CustomersProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Customer[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.customers();
      setItems(result.items.map(mapCustomer));
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load customers."));
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addCustomer = useCallback(
    (customer: Customer) => {
      void (async () => {
        try {
          await api.createCustomer(toBackendInput(customer));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to add customer."));
        }
      })();
    },
    [load],
  );

  const updateCustomer = useCallback(
    (id: string, changes: Partial<Customer>) => {
      void (async () => {
        try {
          await api.updateCustomer(id, toBackendInput(changes));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update customer."));
        }
      })();
    },
    [load],
  );

  const deleteCustomer = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await api.deleteCustomer(id);
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to delete customer."));
        }
      })();
    },
    [load],
  );

  const value = useMemo<CustomersContextValue>(
    () => ({
      customers: items,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      nextId: suggestNextId(items),
      hydrated,
      error,
      reload: load,
    }),
    [items, addCustomer, updateCustomer, deleteCustomer, hydrated, error, load],
  );

  return (
    <CustomersContext.Provider value={value}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers(): CustomersContextValue {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error("useCustomers must be used within a CustomersProvider");
  }
  return context;
}
