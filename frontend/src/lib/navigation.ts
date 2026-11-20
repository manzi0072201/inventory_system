import type { IconName } from "@/components/ui/icon";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Main",
    items: [{ label: "Dashboard", href: "/", icon: "dashboard" }],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", href: "/products", icon: "products" },
      { label: "Stock Management", href: "/stock", icon: "stock" },
      { label: "Warehouses", href: "/warehouses", icon: "warehouse" },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Sales", href: "/sales", icon: "sales" },
      { label: "Sales Returns", href: "/sales-return", icon: "salesReturn" },
    ],
  },
  {
    title: "Purchasing",
    items: [
      { label: "Purchases", href: "/purchases", icon: "purchases" },
      { label: "Purchase Returns", href: "/purchase-return", icon: "purchaseReturn" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Customers", href: "/people", icon: "people" },
      { label: "Suppliers", href: "/suppliers", icon: "truck" },
      { label: "Debtors", href: "/debtors", icon: "wallet" },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Payments", href: "/payments", icon: "card" },
      { label: "Expenses", href: "/expenses", icon: "expenses" },
    ],
  },
  {
    title: "Analytics",
    items: [{ label: "Reports", href: "/reports", icon: "reports" }],
  },
  {
    title: "Administration",
    items: [
      { label: "Audit Logs", href: "/audit-logs", icon: "reports" },
      { label: "Employees & Roles", href: "/user-management", icon: "userManagement" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

export const navItems: NavItem[] = [
  ...navGroups.flatMap((group) => group.items),
  { label: "Announcements", href: "/announcements", icon: "announcements" },
];
