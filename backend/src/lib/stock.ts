import type { SqlExecutor } from "@/lib/db";
import { unprocessable } from "@/lib/errors";

export type StockMovementType =
  | "purchase"
  | "sale"
  | "adjustment"
  | "transfer"
  | "sale_return"
  | "purchase_return";

export type StockStatus =
  | "Out of Stock"
  | "Low Stock"
  | "In Stock"
  | "Not Stocked";

export function mapStockStatus(
  quantityOnHand: number,
  reorderPoint: number,
  criticalPoint: number,
): StockStatus {
  if (quantityOnHand <= 0) return "Out of Stock";
  if (quantityOnHand <= criticalPoint || quantityOnHand <= reorderPoint) {
    return "Low Stock";
  }
  return "In Stock";
}

export async function getStockBalance(
  sql: SqlExecutor,
  productId: string,
  warehouseId: string,
): Promise<number | null> {
  const rows = await sql`
    select quantity_on_hand
    from stock_balances
    where product_id = ${productId}::uuid and warehouse_id = ${warehouseId}::uuid
  `;
  const row = rows[0] as { quantity_on_hand: number | string } | undefined;
  return row ? Number(row.quantity_on_hand) : null;
}

export async function applyStockMovement(
  sql: SqlExecutor,
  input: {
    productId: string;
    warehouseId: string;
    movementType: StockMovementType;
    quantityDelta: number;
    occurredAt?: string;
    referenceType?: string;
    referenceId?: string | null;
    note?: string | null;
    createdBy?: string | null;
  },
): Promise<number> {
  const current = await getStockBalance(sql, input.productId, input.warehouseId);
  const next = (current ?? 0) + input.quantityDelta;
  if (next < 0) {
    throw unprocessable("Insufficient stock; the movement was not recorded.");
  }

  await sql`
    insert into stock_balances (product_id, warehouse_id, quantity_on_hand)
    values (${input.productId}::uuid, ${input.warehouseId}::uuid, 0)
    on conflict (product_id, warehouse_id) do nothing
  `;

  const rows = await sql`
    update stock_balances
    set quantity_on_hand = ${next}, updated_at = now()
    where product_id = ${input.productId}::uuid
      and warehouse_id = ${input.warehouseId}::uuid
      and quantity_on_hand + ${input.quantityDelta} >= 0
    returning quantity_on_hand
  `;
  if (!rows[0]) {
    throw unprocessable("Stock changed during the request; try again.");
  }

  await sql`
    insert into stock_movements (
      product_id,
      warehouse_id,
      movement_type,
      quantity_delta,
      balance_after,
      reference_type,
      reference_id,
      occurred_at,
      note,
      created_by
    )
    values (
      ${input.productId}::uuid,
      ${input.warehouseId}::uuid,
      ${input.movementType},
      ${input.quantityDelta},
      ${Number((rows[0] as { quantity_on_hand: number | string }).quantity_on_hand)},
      ${input.referenceType ?? null},
      ${input.referenceId ?? null}::uuid,
      ${input.occurredAt ?? null}::date,
      ${input.note ?? null},
      ${input.createdBy ?? null}::uuid
    )
  `;

  return Number((rows[0] as { quantity_on_hand: number | string }).quantity_on_hand);
}
