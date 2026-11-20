import type { Product } from "./products-data";
import type { Purchase } from "./purchases-data";
import type { Sale } from "./sales-data";

export type StockStatus =
  | "In Stock"
  | "Low Stock"
  | "Out of Stock"
  | "Not Stocked";

export type StockMovementType =
  | "Purchase"
  | "Sale"
  | "Adjustment"
  | "Transfer";

export type StockAdjustment = {
  id: string;
  date: string;
  productId: string;
  productName: string;
  productCode: string;
  warehouse: string;
  quantity: number;
  reason: string;
  note?: string;
};

export type StockMovement = {
  id: string;
  date: string;
  type: StockMovementType;
  reference: string;
  href?: string;
  productId: string;
  productName: string;
  productCode: string;
  warehouse: string;
  quantity: number;
  note?: string;
};

export type StockRow = {
  product: Product;
  onHand: number;
  reorderPoint: number;
  status: StockStatus;
  stockValue: number;
  lastMovement?: StockMovement;
};

export const stockStatuses: StockStatus[] = [
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Not Stocked",
];

export const stockMovementTypes: StockMovementType[] = [
  "Purchase",
  "Sale",
  "Adjustment",
  "Transfer",
];

export const stockReasons = [
  "Stock count",
  "Damaged",
  "Returned",
  "Transfer",
  "Other",
];

const reorderPoints: Record<string, number> = {
  "EL-0034": 120,
  "EL-0033": 90,
  "EL-0032": 70,
  "EL-0031": 80,
  "EL-0030": 100,
  "EL-0029": 120,
  "EL-0028": 110,
  "EL-0027": 150,
  "EL-0026": 180,
  "EL-0025": 210,
};

export function reorderPointFor(product: Product): number {
  return (
    reorderPoints[product.code] ??
    Math.max(20, Math.round(product.quantity * 0.25))
  );
}

export function stockStatusOf(
  onHand: number,
  reorderPoint: number,
  stocked = true,
): StockStatus {
  if (!stocked) return "Not Stocked";
  if (onHand <= 0) return "Out of Stock";
  if (onHand <= reorderPoint) return "Low Stock";
  return "In Stock";
}

export function stockStatusClass(status: StockStatus): string {
  return status.toLowerCase().replace(/\s+/g, "-");
}

export function movementTypeClass(type: StockMovementType): string {
  return type.toLowerCase();
}

function normalizeWarehouse(warehouse: string): string {
  return warehouse === "Electronics Shop" ? "Main Warehouse" : warehouse;
}

function poolForWarehouse(
  products: Product[],
  warehouse: string,
): Product[] {
  const normalized = normalizeWarehouse(warehouse);
  const matching = products.filter(
    (product) => product.warehouse === normalized,
  );
  return matching.length > 0 ? matching : products;
}

function numericReference(reference: string): number {
  const match = /(\d+)$/.exec(reference);
  return match ? Number(match[1]) : 0;
}

function dateValue(date: string): number {
  const parsed = Date.parse(`${date}T00:00:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildStockMovements(
  products: Product[],
  sales: Sale[],
  purchases: Purchase[],
  adjustments: StockAdjustment[],
  limit = 1000,
): StockMovement[] {
  const movements: StockMovement[] = [];

  for (const purchase of purchases) {
    const seed = numericReference(purchase.reference);
    const pool = poolForWarehouse(products, purchase.warehouse);
    if (pool.length === 0) continue;
    const product = pool[seed % pool.length];
    movements.push({
      id: `purchase-${purchase.reference}`,
      date: purchase.date,
      type: "Purchase",
      reference: purchase.reference,
      href: `/purchases/${encodeURIComponent(purchase.reference)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      warehouse: purchase.warehouse,
      quantity: 4 + (seed % 19),
      note: purchase.supplier,
    });
  }

  for (const sale of sales) {
    const seed = numericReference(sale.reference);
    const pool = poolForWarehouse(products, sale.warehouse);
    if (pool.length === 0) continue;
    const product = pool[(seed + 3) % pool.length];
    movements.push({
      id: `sale-${sale.reference}`,
      date: sale.date,
      type: "Sale",
      reference: sale.reference,
      href: `/sales/${encodeURIComponent(sale.reference)}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      warehouse: sale.warehouse,
      quantity: -(1 + (seed % 6)),
      note: sale.customer,
    });
  }

  for (const adjustment of adjustments) {
    movements.push({
      id: `adjustment-${adjustment.id}`,
      date: adjustment.date,
      type: "Adjustment",
      reference: adjustment.id,
      productId: adjustment.productId,
      productName: adjustment.productName,
      productCode: adjustment.productCode,
      warehouse: adjustment.warehouse,
      quantity: adjustment.quantity,
      note: adjustment.reason,
    });
  }

  return movements
    .sort((a, b) => {
      const byDate = dateValue(b.date) - dateValue(a.date);
      if (byDate !== 0) return byDate;
      return b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

export function buildStockRows(
  products: Product[],
  movements: StockMovement[],
): StockRow[] {
  const lastByProduct = new Map<string, StockMovement>();

  for (const movement of movements) {
    if (!lastByProduct.has(movement.productId)) {
      lastByProduct.set(movement.productId, movement);
    }
  }

  return products.map((product) => {
    const reorderPoint = reorderPointFor(product);
    return {
      product,
      onHand: product.quantity,
      reorderPoint,
      status: stockStatusOf(product.quantity, reorderPoint, product.stocked),
      stockValue: product.quantity * product.cost,
      lastMovement: lastByProduct.get(product.id),
    };
  });
}

export function nextAdjustmentReference(
  adjustments: StockAdjustment[],
): string {
  let max = 1000;
  for (const adjustment of adjustments) {
    const match = /^ADJ_(\d+)$/.exec(adjustment.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `ADJ_${max + 1}`;
}
