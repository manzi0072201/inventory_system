import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import {
  badRequest,
  conflict,
  isForeignKeyViolation,
  isUniqueViolation,
} from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import {
  mapProduct,
  resolveProductLookupIds,
  type ProductRow,
} from "@/lib/products";
import { isValidStoredFileForScope } from "@/lib/storage";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery, storedFileValue, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const money = z.number().nonnegative().max(999999999999.99);

const fields = {
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
  blend: z.boolean().optional(),
  costPrice: money.optional(),
  sellingPrice: money.optional(),
};

const createSchema = z
  .object({ ...fields, active: z.boolean().optional().default(true) })
  .strict();

const updateSchema = z.object(fields).partial().strict();

const listSchema = z
  .object({
    q: z.string().trim().max(120).optional(),
    active: z.enum(["true", "false"]).optional(),
    brandId: uuid.optional(),
    categoryId: uuid.optional(),
  })
  .strict();

export async function GET(request: Request) {
  try {
    await requirePermission(request, "products");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["code", "name", "costPrice", "sellingPrice", "createdAt", "updatedAt"],
      "name",
      "asc",
    );

    const rows = (await sql`
      select * from products where deleted_at is null
    `) as ProductRow[];

    const term = query.q?.toLowerCase();
    let items = await Promise.all(rows.map(mapProduct));
    if (term) {
      items = items.filter((item) =>
        [item.sku, item.name, item.unit, item.type].some((value) =>
          value?.toLowerCase().includes(term),
        ),
      );
    }
    if (query.active) {
      const active = query.active === "true";
      items = items.filter((item) => item.active === active);
    }
    if (query.brandId) {
      items = items.filter((item) => item.brandId === query.brandId);
    }
    if (query.categoryId) {
      items = items.filter((item) => item.categoryId === query.categoryId);
    }

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "products");
    const input = await parseJson(request, createSchema);
    const sql = getSql();
    const { brandId, categoryId } = await resolveProductLookupIds(input);

    try {
      const rows = (await sql`
        insert into products (
          code, name, brand_id, category_id, unit, type,
          image_url, image_bg, blend, cost_price, selling_price, active
        )
        values (
          ${input.code}, ${input.name},           ${brandId ?? null}::uuid,
          ${categoryId ?? null}::uuid, ${input.unit ?? null},

          ${input.type ?? null}, ${input.imageUrl ?? null},
          ${input.imageBg ?? null}, ${input.blend ?? false},
          ${input.costPrice ?? 0}, ${input.sellingPrice ?? 0}, ${input.active}
        )
        returning *
      `) as ProductRow[];

      const product = await mapProduct(rows[0]);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "product.create",
        entityType: "product",
        entityId: product.id,
        afterData: product,
        ...requestMeta(request),
      });
      return ok(product, 201);
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
