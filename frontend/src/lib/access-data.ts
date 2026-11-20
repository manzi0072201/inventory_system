export type UserRole = "super_admin" | "admin";
export type UserStatus = "Active" | "Suspended";

export type PermissionKey =
  | "sales"
  | "sales_returns"
  | "products"
  | "stock"
  | "warehouses"
  | "purchases"
  | "purchase_returns"
  | "customers"
  | "suppliers"
  | "debtors"
  | "payments"
  | "expenses"
  | "reports"
  | "settings"
  | "notifications"
  | "announcements";

export type AdminPermissions = Record<PermissionKey, boolean>;

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  shopZone: string;
  phone: string;
  avatarUrl?: string;
  permissions: AdminPermissions;
  createdAt: string;
  lastLogin: string | null;
};

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  description: string;
};

export type PermissionGroup = {
  title: string;
  description: string;
  permissions: PermissionDefinition[];
};

export const roleLabels: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Shop Admin",
};

export const defaultAdminPermissions: AdminPermissions = {
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

export const permissionGroups: PermissionGroup[] = [
  {
    title: "Shop & Sales",
    description: "Day-to-day shop counter access and customer-facing work.",
    permissions: [
      {
        key: "sales",
        label: "Sales & POS",
        description: "Open the POS, create sales, and print receipts.",
      },
      {
        key: "sales_returns",
        label: "Sales Returns",
        description: "Receive returned goods and issue sales refunds.",
      },
      {
        key: "customers",
        label: "Customers",
        description: "Create, edit, and view customer accounts.",
      },
      {
        key: "debtors",
        label: "Debtors",
        description: "View customer balances and follow up on credit.",
      },
      {
        key: "payments",
        label: "Payments",
        description: "Record customer payments and shop collections.",
      },
    ],
  },
  {
    title: "Inventory",
    description: "Product and stock controls needed to run the shop floor.",
    permissions: [
      {
        key: "products",
        label: "Products",
        description: "View and maintain the shop product catalog.",
      },
      {
        key: "stock",
        label: "Stock Management",
        description: "Adjust stock, transfer items, and record counts.",
      },
      {
        key: "warehouses",
        label: "Warehouses",
        description: "Create and manage warehouse locations.",
      },
    ],
  },
  {
    title: "Purchasing",
    description: "Supplier purchasing is usually reserved for head office.",
    permissions: [
      {
        key: "purchases",
        label: "Purchases",
        description: "Create purchase orders and receive supplier goods.",
      },
      {
        key: "purchase_returns",
        label: "Purchase Returns",
        description: "Return goods to suppliers and manage claims.",
      },
      {
        key: "suppliers",
        label: "Suppliers",
        description: "Create, edit, and view supplier records.",
      },
    ],
  },
  {
    title: "Finance & Insights",
    description: "Operational finance visibility without company-wide control.",
    permissions: [
      {
        key: "expenses",
        label: "Expenses",
        description: "Record shop expenses and attach supporting notes.",
      },
      {
        key: "reports",
        label: "Reports",
        description: "View and export shop performance reports.",
      },
    ],
  },
  {
    title: "Administration",
    description: "Backend access for configuration, alerts, and broadcasts.",
    permissions: [
      {
        key: "settings",
        label: "Settings",
        description: "Change company configuration and upload company branding.",
      },
      {
        key: "notifications",
        label: "Notifications",
        description: "View and manage backend-issued notifications.",
      },
      {
        key: "announcements",
        label: "Announcements",
        description: "Create and manage company announcements.",
      },
    ],
  },
];

export const permissionKeys = permissionGroups.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
);

export const routePermissions: Record<string, PermissionKey> = {
  "/products": "products",
  "/stock": "stock",
  "/warehouses": "warehouses",
  "/sales": "sales",
  "/sales-return": "sales_returns",
  "/purchases": "purchases",
  "/purchase-return": "purchase_returns",
  "/people": "customers",
  "/suppliers": "suppliers",
  "/debtors": "debtors",
  "/payments": "payments",
  "/expenses": "expenses",
  "/reports": "reports",
};

export function normalizePermissions(value: unknown): AdminPermissions {
  const next = { ...defaultAdminPermissions };
  if (typeof value !== "object" || value === null) return next;
  const candidate = value as Partial<Record<PermissionKey, unknown>>;
  for (const key of permissionKeys) {
    if (typeof candidate[key] === "boolean") {
      next[key] = candidate[key];
    }
  }
  return next;
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "super_admin" || value === "admin";
}

export function isUserStatus(value: unknown): value is UserStatus {
  return value === "Active" || value === "Suspended";
}

export function requiredPermissionForPath(
  pathname: string,
): PermissionKey | null {
  let match: { href: string; permission: PermissionKey } | null = null;
  for (const [href, permission] of Object.entries(routePermissions)) {
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      if (!match || href.length > match.href.length) {
        match = { href, permission };
      }
    }
  }
  return match?.permission ?? null;
}

export function canAccessPath(user: AppUser, pathname: string): boolean {
  if (user.role === "super_admin") return true;
  if (
    pathname === "/" ||
    pathname === "/announcements" ||
    pathname.startsWith("/announcements/")
  ) {
    return true;
  }
  if (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/user-management" ||
    pathname.startsWith("/user-management/")
  ) {
    return false;
  }
  const permission = requiredPermissionForPath(pathname);
  return permission ? user.permissions[permission] : true;
}

export function countEnabledPermissions(permissions: AdminPermissions): number {
  return permissionKeys.filter((key) => permissions[key]).length;
}

export function roleLabel(role: UserRole): string {
  return roleLabels[role];
}
