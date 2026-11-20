import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { mapStockStatus } from "@/lib/stock";
import { parseJson, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    productId: uuid,
    warehouseId: uuid,
    reorderPoint: z.number().int().nonnegative(),
    criticalPoint: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => value.criticalPoint <= value.reorderPoint, {
    message: "Critical point cannot be greater than reorder point.",
    path: ["criticalPoint"],
  });

type ThresholdRow = {
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: number | string;
  reorder_point: number | string;
  critical_point: number | string;
  average_cost: number | string;
  product_code: string;
  product_name: string;
  warehouse_code: string;
  warehouse_name: string;
};

function mapThreshold(row: ThresholdRow) {
  const quantityOnHand = Number(row.quantity_on_hand);
  const reorderPoint = Number(row.reorder_point);
  const criticalPoint = Number(row.critical_point);
  return {
    productId: row.product_id,
    productCode: row.product_code,
    productName: row.product_name,
    warehouseId: row.warehouse_id,
    warehouseCode: row.warehouse_code,
    warehouseName: row.warehouse_name,
    quantityOnHand,
    reorderPoint,
    criticalPoint,
    averageCost: Number(row.average_cost),
    status: mapStockStatus(quantityOnHand, reorderPoint, criticalPoint),
  };
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, "stock");
    const input = await parseJson(request, schema);
    const sql = getSql();

    const products = (await sql`
      select id from products
      where id = ${input.productId}::uuid and deleted_at is null
    `) as { id: string }[];
    if (!products[0]) throw badRequest("The selected product does not exist.");

    const warehouses = (await sql`
      select id from warehouses
      where id = ${input.warehouseId}::uuid and deleted_at is null
    `) as { id: string }[];
    if (!warehouses[0]) throw badRequest("The selected warehouse does not exist.");

    const beforeRows = (await sql`
      select * from stock_balances
      where product_id = ${input.productId}::uuid
        and warehouse_id = ${input.warehouseId}::uuid
    `) as ThresholdRow[];

    await sql`
      insert into stock_balances (
        product_id, warehouse_id, quantity_on_hand, reorder_point, critical_point
      )
      values (
        ${input.productId}::uuid,
        ${input.warehouseId}::uuid,
        0,
        ${input.reorderPoint},
        ${input.criticalPoint}
      )
      on conflict (product_id, warehouse_id) do update
      set reorder_point = excluded.reorder_point,
          critical_point = excluded.critical_point,
          updated_at = now()
    `;

    const rows = (await sql`
      select
        b.product_id,
        b.warehouse_id,
        b.quantity_on_hand,
        b.reorder_point,
        b.critical_point,
        b.average_cost,
        p.code as product_code,
        p.name as product_name,
        w.code as warehouse_code,
        w.name as warehouse_name
      from stock_balances b
      join products p on p.id = b.product_id
      join warehouses w on w.id = b.warehouse_id
      where b.product_id = ${input.productId}::uuid
        and b.warehouse_id = ${input.warehouseId}::uuid
    `) as ThresholdRow[];

    const threshold = mapThreshold(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "stock.threshold.update",
      entityType: "stock_balance",
      entityId: `${input.productId}:${input.warehouseId}`,
      beforeData: beforeRows[0] ?? null,
      afterData: threshold,
      ...requestMeta(request),
    });
    return ok(threshold);
  } catch (error) {
    return failUnexpected(error);
  }
}
