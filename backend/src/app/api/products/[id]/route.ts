import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import {
  badRequest,
  conflict,
  isForeignKeyViolation,
  isUniqueViolation,
  notFound,
} from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import {
  mapProduct,
  resolveProductLookupIds,
  type ProductRow,
} from "@/lib/products";
import {
  deleteManagedObject,
  isValidStoredFileForScope,
} from "@/lib/storage";
import { parseJson, parseUuid, storedFileValue, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const money = z.number().nonnegative().max(999999999999.99);

const updateSchema = z
  .object({
    code: z.string().trim().min(1).max(50),
    name: z.string().trim().min(2).max(200),
    brandId: uuid.nullish(),
    categoryId: uuid.nullish(),
    brand: z.string().trim().max(120).nullish(),
    category: z.string().trim().max(120).nullish(),
    unit: z.string().trim().max(50).nullish(),
    type: z.string().trim().max(50).nullish(),
    imageUrl: storedFileValue
      .nullish()
      .refine(
        (value) => value == null || isValidStoredFileForScope(value, "product"),
        "Must be a URL or a products/ object key.",
      ),
    imageBg: z.string().trim().max(50).nullish(),
    blend: z.boolean(),
    costPrice: money,
    sellingPrice: money,
    active: z.boolean(),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    await requirePermission(request, "products");
    const id = parseUuid((await context.params).id);
    const rows = (await getSql()`
      select * from products where id = ${id}::uuid and deleted_at is null
    `) as ProductRow[];
    if (!rows[0]) throw notFound("Product not found.");
    return ok(await mapProduct(rows[0]));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "products");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const beforeRows = (await sql`
      select * from products where id = ${id}::uuid and deleted_at is null
    `) as ProductRow[];
    if (!beforeRows[0]) throw notFound("Product not found.");
    const before = await mapProduct(beforeRows[0]);

    const input = await parseJson(request, updateSchema);
    const hasBrandInput =
      input.brand !== undefined || input.brandId !== undefined;
    const hasCategoryInput =
      input.category !== undefined || input.categoryId !== undefined;
    const { brandId, categoryId } = await resolveProductLookupIds(input);
    try {
      const rows = (await sql`
        update products
        set
          code = coalesce(${input.code ?? null}, code),
          name = coalesce(${input.name ?? null}, name),
          brand_id = case when ${hasBrandInput} then ${brandId ?? null}::uuid else brand_id end,
          category_id = case when ${hasCategoryInput} then ${categoryId ?? null}::uuid else category_id end,
          unit = case when ${input.unit !== undefined} then ${input.unit ?? null} else unit end,
          type = case when ${input.type !== undefined} then ${input.type ?? null} else type end,
          image_url = case when ${input.imageUrl !== undefined} then ${input.imageUrl ?? null} else image_url end,
          image_bg = case when ${input.imageBg !== undefined} then ${input.imageBg ?? null} else image_bg end,
          blend = coalesce(${input.blend ?? null}, blend),
          cost_price = coalesce(${input.costPrice ?? null}, cost_price),
          selling_price = coalesce(${input.sellingPrice ?? null}, selling_price),
          active = coalesce(${input.active ?? null}, active),
          updated_at = now()
        where id = ${id}::uuid and deleted_at is null
        returning *
      `) as ProductRow[];

      const product = await mapProduct(rows[0]);
      const previousImage = beforeRows[0].image_url;
      if (
        input.imageUrl !== undefined &&
        previousImage &&
        previousImage !== input.imageUrl
      ) {
        await deleteManagedObject(previousImage);
      }
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "product.update",
        entityType: "product",
        entityId: id,
        beforeData: before,
        afterData: product,
        ...requestMeta(request),
      });
      return ok(product);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A product with that SKU already exists.");
      }
      if (isForeignKeyViolation(error)) {
        throw badRequest("The selected brand or category does not exist.");
      }
      throw error;
    }
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "products");
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const beforeRows = (await sql`
      select * from products where id = ${id}::uuid and deleted_at is null
    `) as ProductRow[];
    if (!beforeRows[0]) throw notFound("Product not found.");

    await sql`
      update products
      set deleted_at = now(), active = false, updated_at = now()
      where id = ${id}::uuid and deleted_at is null
    `;
    const previousImage = beforeRows[0].image_url;
    if (previousImage) {
      await deleteManagedObject(previousImage);
    }
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "product.delete",
      entityType: "product",
      entityId: id,
      beforeData: await mapProduct(beforeRows[0]),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
