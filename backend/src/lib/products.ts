import { toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { resolveStoredFile } from "@/lib/storage";

export type ProductRow = {
  id: string;
  code: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  brand_name?: string | null;
  category_name?: string | null;
  unit: string | null;
  type: string | null;
  image_url: string | null;
  image_bg: string | null;
  blend: boolean;
  cost_price: number | string;
  selling_price: number | string;
  active: boolean;
  created_at: unknown;
  updated_at: unknown;
};

const brandNames = new Map<string, string>();
const categoryNames = new Map<string, string>();

async function lookupName(
  table: "brands" | "product_categories",
  id: string | null,
  cache: Map<string, string>,
): Promise<string | null> {
  if (!id) return null;
  const cached = cache.get(id);
  if (cached) return cached;
  const sql = getSql();
  const rows =
    table === "brands"
      ? await sql`select name from brands where id = ${id}::uuid`
      : await sql`select name from product_categories where id = ${id}::uuid`;
  const name = typeof rows[0]?.name === "string" ? rows[0].name : null;
  if (name) cache.set(id, name);
  return name;
}

export async function resolveProductLookupIds(input: {
  brandId?: string | null;
  categoryId?: string | null;
  brand?: string | null;
  category?: string | null;
}): Promise<{ brandId: string | null; categoryId: string | null }> {
  const sql = getSql();
  let brandId = input.brandId ?? null;
  let categoryId = input.categoryId ?? null;

  if (input.brand !== undefined) {
    const name = input.brand?.trim();
    if (!name) {
      brandId = null;
    } else {
      const rows = await sql`
        insert into brands (name)
        values (${name})
        on conflict (name) do update set name = excluded.name
        returning id
      `;
      brandId = rows[0]?.id ?? null;
      if (brandId) brandNames.set(brandId, name);
    }
  }

  if (input.category !== undefined) {
    const name = input.category?.trim();
    if (!name) {
      categoryId = null;
    } else {
      const rows = await sql`
        insert into product_categories (name)
        values (${name})
        on conflict (name) do update set name = excluded.name
        returning id
      `;
      categoryId = rows[0]?.id ?? null;
      if (categoryId) categoryNames.set(categoryId, name);
    }
  }

  return { brandId, categoryId };
}

export async function mapProduct(row: ProductRow) {
  return {
    id: row.id,
    sku: row.code,
    code: row.code,
    name: row.name,
    brandId: row.brand_id,
    categoryId: row.category_id,
    brand:
      row.brand_name ??
      (await lookupName("brands", row.brand_id, brandNames)),
    category:
      row.category_name ??
      (await lookupName("product_categories", row.category_id, categoryNames)),
    unit: row.unit,
    type: row.type,
    imageUrl: await resolveStoredFile(row.image_url),
    imageBg: row.image_bg,
    blend: row.blend,
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    active: row.active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}
