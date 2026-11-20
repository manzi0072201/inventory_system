import { forbidden } from "@/lib/errors";

export const PERMISSION_KEYS = [
  "sales",
  "sales_returns",
  "products",
  "stock",
  "warehouses",
  "purchases",
  "purchase_returns",
  "customers",
  "suppliers",
  "debtors",
  "payments",
  "expenses",
  "reports",
  "settings",
  "notifications",
  "announcements",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type AppRole = "super_admin" | "admin";
export type PermissionMap = Partial<Record<PermissionKey, boolean>>;

const adminDefaults: Record<PermissionKey, boolean> = {
  sales: true,
  sales_returns: true,
  products: true,
  stock: true,
  warehouses: false,
  purchases: false,
  purchase_returns: false,
  customers: true,
  suppliers: false,
  debtors: true,
  payments: true,
  expenses: false,
  reports: true,
  settings: false,
  notifications: true,
  announcements: false,
};

const superAdminDefaults = Object.fromEntries(
  PERMISSION_KEYS.map((key) => [key, true]),
) as Record<PermissionKey, boolean>;

export const ROLE_DEFAULTS: Record<AppRole, Record<PermissionKey, boolean>> = {
  super_admin: superAdminDefaults,
  admin: adminDefaults,
};

export function hasPermission(
  role: AppRole,
  overrides: PermissionMap | null | undefined,
  key: PermissionKey,
): boolean {
  return overrides?.[key] ?? ROLE_DEFAULTS[role][key];
}

export function assertPermission(
  role: AppRole,
  overrides: PermissionMap | null | undefined,
  key: PermissionKey,
): void {
  if (!hasPermission(role, overrides, key)) {
    throw forbidden(`Missing permission: ${key}.`);
  }
}
