export type Product = {
  id: string;
  name: string;
  code: string;
  cost: number;
  price: number;
  brand: string;
  category: string;
  quantity: number;
  stocked?: boolean;
  unit: string;
  type: string;
  warehouse: string;
  image: string;
  imageBg: string;
  blend?: boolean;
  createdAt?: number;
};

export const productCategories = ["Audio", "Tablets"];

export const productBrands = ["Apple", "Bose", "Sony", "Samsung"];

export const productWarehouses = ["Main Warehouse", "Secondary Warehouse"];

export type ProductOptionKind = "brand" | "category" | "unit";

type StoredOptions = Record<ProductOptionKind, string[]>;

const OPTION_STORAGE_KEY = "stocky.product-options.v1";

function emptyOptions(): StoredOptions {
  return { brand: [], category: [], unit: [] };
}

function readOptions(): StoredOptions {
  if (typeof window === "undefined") return emptyOptions();
  try {
    const raw = window.localStorage.getItem(OPTION_STORAGE_KEY);
    if (!raw) return emptyOptions();
    const parsed = JSON.parse(raw) as Partial<StoredOptions>;
    const clean = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    return {
      brand: clean(parsed.brand),
      category: clean(parsed.category),
      unit: clean(parsed.unit),
    };
  } catch {
    return emptyOptions();
  }
}

export function getCustomOptions(kind: ProductOptionKind): string[] {
  return readOptions()[kind];
}

export function rememberCustomOption(
  kind: ProductOptionKind,
  value: string,
): string[] {
  const trimmed = value.trim();
  const options = readOptions();
  if (
    trimmed &&
    !options[kind].some(
      (item) => item.trim().toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    options[kind] = [...options[kind], trimmed];
    try {
      window.localStorage.setItem(OPTION_STORAGE_KEY, JSON.stringify(options));
    } catch {
      return options[kind];
    }
  }
  return options[kind];
}
