import { z } from "zod";
import type { QueryTag } from "@/lib/audit";
import type { SqlExecutor } from "@/lib/db";
import { badRequest, unprocessable } from "@/lib/errors";
import { uuid } from "@/lib/validation";

export const dateString = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid YYYY-MM-DD date.");

export const money = z.number().finite().nonnegative().max(999999999999.99);

export const paymentMethod = z.enum([
  "Bank Account",
  "MTN MoMo",
  "Airtel Money",
  "Cash",
]);

export const lineItemSchema = z
  .object({
    productId: uuid,
    quantity: z.number().int().positive().max(100000),
    unitPrice: money.optional(),
    discountAmount: money.optional(),
    taxAmount: money.optional(),
  })
  .strict();

export type LineItemInput = z.infer<typeof lineItemSchema>;

export type PreparedLineItem = {
  productId: string;
  nameSnapshot: string;
  codeSnapshot: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type DocumentTotals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function runTransaction(
  sql: SqlExecutor,
  queries: (tx: QueryTag) => any[],
): Promise<any[][]> {
  const transactionSql = sql as SqlExecutor & {
    transaction?: (fn: (tx: QueryTag) => any[]) => Promise<any[][]>;
  };
  if (typeof transactionSql.transaction !== "function") {
    throw new Error("Database transactions are not available.");
  }
  return transactionSql.transaction(queries);
}

export async function prepareDocumentItems(
  sql: SqlExecutor,
  items: LineItemInput[],
  priceField: "selling_price" | "cost_price",
): Promise<PreparedLineItem[]> {
  const ids = [...new Set(items.map((item) => item.productId))];
  const products = (await sql`
    select id, name, code, selling_price, cost_price
    from products
    where id = any(${ids}::uuid[]) and deleted_at is null
  `) as {
    id: string;
    name: string;
    code: string;
    selling_price: number | string;
    cost_price: number | string;
  }[];

  if (products.length !== ids.length) {
    throw badRequest("One or more selected products do not exist.");
  }

  const byId = new Map(products.map((product) => [product.id, product]));

  return items.map((item, index) => {
    const product = byId.get(item.productId);
    if (!product) throw badRequest("The selected product does not exist.");
    const unitPrice = item.unitPrice ?? Number(product[priceField]);
    const discountAmount = item.discountAmount ?? 0;
    const taxAmount = item.taxAmount ?? 0;
    const lineTotal = roundMoney(
      item.quantity * unitPrice - discountAmount + taxAmount,
    );
    if (lineTotal < 0) {
      throw unprocessable("Line discounts cannot exceed the line amount.");
    }
    return {
      productId: item.productId,
      nameSnapshot: product.name,
      codeSnapshot: product.code,
      quantity: item.quantity,
      unitPrice: roundMoney(unitPrice),
      costPrice: roundMoney(Number(product.cost_price)),
      discountAmount: roundMoney(discountAmount),
      taxAmount: roundMoney(taxAmount),
      lineTotal,
      sortOrder: index + 1,
    };
  });
}

export async function getUnitCostMap(
  sql: SqlExecutor,
  productIds: string[],
  warehouseId: string,
): Promise<Map<string, number>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();
  const rows = (await sql`
    select
      p.id,
      coalesce(nullif(sb.average_cost, 0), nullif(p.cost_price, 0), 0) as unit_cost
    from products p
    left join stock_balances sb
      on sb.product_id = p.id
     and sb.warehouse_id = ${warehouseId}::uuid
    where p.id = any(${ids}::uuid[])
  `) as { id: string; unit_cost: number | string }[];
  return new Map(rows.map((row) => [row.id, roundMoney(Number(row.unit_cost))]));
}

export function calculateTotals(
  items: PreparedLineItem[],
  headerDiscount = 0,
  headerTax = 0,
  headerShipping = 0,
): DocumentTotals {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  );
  const discountAmount = roundMoney(
    items.reduce((sum, item) => sum + item.discountAmount, headerDiscount),
  );
  const taxAmount = roundMoney(
    items.reduce((sum, item) => sum + item.taxAmount, headerTax),
  );
  const shippingAmount = roundMoney(headerShipping);
  const totalAmount = roundMoney(
    subtotal - discountAmount + taxAmount + shippingAmount,
  );
  if (totalAmount < 0) {
    throw unprocessable("Document discounts cannot exceed the subtotal.");
  }
  return {
    subtotal,
    discountAmount,
    taxAmount,
    shippingAmount,
    totalAmount,
  };
}

export function toStockItemsJson(items: { productId: string; quantity: number }[]) {
  return JSON.stringify(
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  );
}

export async function assertReferences(
  sql: SqlExecutor,
  input: {
    customerId?: string | null;
    supplierId?: string | null;
    warehouseId?: string | null;
    userId?: string | null;
  },
): Promise<void> {
  if (input.customerId) {
    const rows = await sql`
      select id from customers
      where id = ${input.customerId}::uuid and deleted_at is null
    `;
    if (!rows[0]) throw badRequest("The selected customer does not exist.");
  }
  if (input.supplierId) {
    const rows = await sql`
      select id from suppliers
      where id = ${input.supplierId}::uuid and deleted_at is null
    `;
    if (!rows[0]) throw badRequest("The selected supplier does not exist.");
  }
  if (input.warehouseId) {
    const rows = await sql`
      select id from warehouses
      where id = ${input.warehouseId}::uuid and deleted_at is null
    `;
    if (!rows[0]) throw badRequest("The selected warehouse does not exist.");
  }
  if (input.userId) {
    const rows = await sql`
      select id from app_users where id = ${input.userId}::uuid
    `;
    if (!rows[0]) throw badRequest("The selected user does not exist.");
  }
}

export function parseStoredItemsJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
