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
import type { BackendProduct, BackendStockRow } from "@/lib/api-types";
import type { Product } from "@/lib/products-data";

export const CREATED_FLAG = "stocky:created-code";

export const UPDATED_FLAG = "stocky:updated-code";

type ProductsContextValue = {
  products: Product[];
  addProduct: (product: Product) => void;
  addProducts: (products: Product[]) => void;
  updateProduct: (id: string, changes: Partial<Product>) => void;
  updateProducts: (ids: string[], changes: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  nextCode: string;
  hydrated: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

function suggestNextCode(items: Product[]): string {
  let max = 0;
  for (const item of items) {
    const match = /^EL-(\d+)$/.exec(item.code);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `EL-${String(max + 1).padStart(4, "0")}`;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiClientError ? cause.message : fallback;
}

function stockByProduct(rows: BackendStockRow[]) {
  const result = new Map<string, { quantity: number; warehouse: string }>();
  for (const row of rows) {
    const current = result.get(row.productId) ?? { quantity: 0, warehouse: "" };
    current.quantity += row.quantityOnHand;
    if (!current.warehouse) current.warehouse = row.warehouseName;
    result.set(row.productId, current);
  }
  return result;
}

function mapProduct(
  row: BackendProduct,
  stock: Map<string, { quantity: number; warehouse: string }>,
): Product {
  const balance = stock.get(row.id);
  return {
    id: row.id,
    code: row.sku,
    name: row.name,
    cost: row.costPrice,
    price: row.sellingPrice,
    brand: row.brand ?? "",
    category: row.category ?? "",
    quantity: balance?.quantity ?? 0,
    stocked: Boolean(balance),
    unit: row.unit ?? "",
    type: row.type ?? "",
    warehouse: balance?.warehouse ?? "",
    image: row.imageUrl ?? "",
    imageBg: row.imageBg ?? "",
    blend: row.blend,
    createdAt: row.createdAt ? Date.parse(row.createdAt) : undefined,
  };
}

function toBackendInput(product: Partial<Product>): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (product.code !== undefined) input.code = product.code;
  if (product.name !== undefined) input.name = product.name;
  if (product.brand !== undefined) input.brand = product.brand || null;
  if (product.category !== undefined) input.category = product.category || null;
  if (product.unit !== undefined) input.unit = product.unit || null;
  if (product.type !== undefined) input.type = product.type || null;
  if (product.image !== undefined) input.imageUrl = product.image || null;
  if (product.imageBg !== undefined) input.imageBg = product.imageBg || null;
  if (product.blend !== undefined) input.blend = product.blend;
  if (product.cost !== undefined) input.costPrice = product.cost;
  if (product.price !== undefined) input.sellingPrice = product.price;
  return input;
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [products, stock] = await Promise.all([api.products(), api.stock()]);
      const balances = stockByProduct(stock.items);
      setItems(products.items.map((row) => mapProduct(row, balances)));
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load products."));
      setItems([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addProduct = useCallback(
    (product: Product) => {
      void (async () => {
        try {
          await api.createProduct(toBackendInput(product));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to add product."));
        }
      })();
    },
    [load],
  );

  const addProducts = useCallback(
    (incoming: Product[]) => {
      if (incoming.length === 0) return;
      void (async () => {
        try {
          for (const product of incoming) {
            await api.createProduct(toBackendInput(product));
          }
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to import products."));
        }
      })();
    },
    [load],
  );

  const updateProduct = useCallback(
    (id: string, changes: Partial<Product>) => {
      void (async () => {
        try {
          await api.updateProduct(id, toBackendInput(changes));
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update product."));
        }
      })();
    },
    [load],
  );

  const updateProducts = useCallback(
    (ids: string[], changes: Partial<Product>) => {
      void (async () => {
        try {
          for (const id of ids) {
            await api.updateProduct(id, toBackendInput(changes));
          }
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to update products."));
        }
      })();
    },
    [load],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      void (async () => {
        try {
          await api.deleteProduct(id);
          await load();
        } catch (cause) {
          setError(errorMessage(cause, "Unable to delete product."));
        }
      })();
    },
    [load],
  );

  const value = useMemo<ProductsContextValue>(
    () => ({
      products: items,
      addProduct,
      addProducts,
      updateProduct,
      updateProducts,
      deleteProduct,
      nextCode: suggestNextCode(items),
      hydrated,
      error,
      reload: load,
    }),
    [
      items,
      addProduct,
      addProducts,
      updateProduct,
      updateProducts,
      deleteProduct,
      hydrated,
      error,
      load,
    ],
  );

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextValue {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
