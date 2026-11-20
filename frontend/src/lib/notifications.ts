import type { PermissionKey } from "./access-data";
import type { Customer } from "./customers-data";
import type { Expense } from "./expenses-data";
import type { Product } from "./products-data";
import { dueOf as purchaseDueOf, type Purchase } from "./purchases-data";
import type { PurchaseReturn } from "./purchase-returns-data";
import { dueOf as saleDueOf, formatMoney, type Sale } from "./sales-data";
import type { SalesReturn } from "./sales-returns-data";
import type { SystemSettings } from "./settings-data";
import {
  reorderPointFor,
  stockStatusOf,
  type StockAdjustment,
} from "./stock-data";
import type { Supplier } from "./suppliers-data";

export type NotificationKind = "alert" | "activity";

export type NotificationTone = "danger" | "warning" | "success" | "info";

export type NotificationCategory =
  | "stock"
  | "sales"
  | "purchase"
  | "sales-return"
  | "purchase-return"
  | "customer"
  | "supplier"
  | "expense";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  tone: NotificationTone;
  title: string;
  description: string;
  href: string;
  occurredAt: string;
};

export type NotificationFeed = {
  alerts: AppNotification[];
  activities: AppNotification[];
};

export type NotificationBuildInput = {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  salesReturns: SalesReturn[];
  purchaseReturns: PurchaseReturn[];
  expenses: Expense[];
  adjustments: StockAdjustment[];
  customers: Customer[];
  suppliers: Supplier[];
  settings: SystemSettings;
  can: (permission: PermissionKey) => boolean;
};

const MAX_ACTIVITIES = 10;
const MAX_STOCK_NAMES = 2;

function timeOf(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function latestDate(values: string[]): string {
  return values.reduce(
    (latest, value) => (timeOf(value) > timeOf(latest) ? value : latest),
    "",
  );
}

function stableKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}

function productNames(products: Product[]): string {
  const names = products
    .slice(0, MAX_STOCK_NAMES)
    .map((product) => product.name)
    .join(", ");
  const remaining = products.length - MAX_STOCK_NAMES;
  return remaining > 0 ? `${names} +${remaining} more` : names;
}

function sortByNewest(
  first: AppNotification,
  second: AppNotification,
): number {
  const byDate = timeOf(second.occurredAt) - timeOf(first.occurredAt);
  return byDate !== 0 ? byDate : first.id.localeCompare(second.id);
}

function toneRank(tone: NotificationTone): number {
  switch (tone) {
    case "danger":
      return 0;
    case "warning":
      return 1;
    case "info":
      return 2;
    case "success":
      return 3;
  }
}

type BalanceMetric = {
  id: string;
  name: string;
  hasRecord: boolean;
  opening: number;
  salesDue: number;
  purchaseDue: number;
  count: number;
  amount: number;
  lastDate: string;
};

function emptyBalance(
  name: string,
  id: string,
  hasRecord: boolean,
): BalanceMetric {
  return {
    id,
    name,
    hasRecord,
    opening: 0,
    salesDue: 0,
    purchaseDue: 0,
    count: 0,
    amount: 0,
    lastDate: "",
  };
}

export function buildNotificationFeed(
  input: NotificationBuildInput,
): NotificationFeed {
  const {
    products,
    sales,
    purchases,
    salesReturns,
    purchaseReturns,
    expenses,
    adjustments,
    customers,
    suppliers,
    settings,
    can,
  } = input;

  const alerts: AppNotification[] = [];
  const latestOperationalDate = latestDate([
    ...sales.map((sale) => sale.date),
    ...purchases.map((purchase) => purchase.date),
    ...adjustments.map((adjustment) => adjustment.date),
  ]);

  if (can("stock") && settings.notifyLowStock && settings.lowStockAlerts) {
    const rows = products.map((product) => {
      const reorderPoint = reorderPointFor(product);
      return {
        product,
        status: stockStatusOf(product.quantity, reorderPoint),
      };
    });
    const outOfStock = rows
      .filter((row) => row.status === "Out of Stock")
      .map((row) => row.product);
    const lowStock = rows
      .filter((row) => row.status === "Low Stock")
      .map((row) => row.product);

    if (outOfStock.length > 0) {
      alerts.push({
        id: "alert:stock:out",
        kind: "alert",
        category: "stock",
        tone: "danger",
        title: `${outOfStock.length} ${plural(outOfStock.length, "product")} out of stock`,
        description: `${productNames(outOfStock)} ${outOfStock.length === 1 ? "is" : "are"} out of stock.`,
        href: "/stock",
        occurredAt: latestOperationalDate,
      });
    }

    if (lowStock.length > 0) {
      alerts.push({
        id: "alert:stock:low",
        kind: "alert",
        category: "stock",
        tone: "warning",
        title: `${lowStock.length} ${plural(lowStock.length, "product")} low on stock`,
        description: `${productNames(lowStock)} ${lowStock.length === 1 ? "is" : "are"} at or below the reorder point.`,
        href: "/stock",
        occurredAt: latestOperationalDate,
      });
    }
  }

  if (settings.notifyPaymentDue && can("debtors")) {
    const customerByName = new Map(
      customers.map((customer) => [customer.name, customer]),
    );
    const metrics = new Map<string, BalanceMetric>();

    for (const customer of customers) {
      if (customer.openingBalance <= 0) continue;
      const metric = emptyBalance(customer.name, customer.id, true);
      metric.opening = customer.openingBalance;
      metric.amount = customer.openingBalance;
      metrics.set(customer.name, metric);
    }

    for (const sale of sales) {
      const due = saleDueOf(sale);
      if (due <= 0) continue;
      const customer = customerByName.get(sale.customer);
      const metric =
        metrics.get(sale.customer) ??
        emptyBalance(
          sale.customer,
          customer?.id ?? `customer-${stableKey(sale.customer)}`,
          Boolean(customer),
        );
      metric.salesDue += due;
      metric.amount += due;
      metric.count += 1;
      metric.lastDate = latestDate([metric.lastDate, sale.date]);
      metrics.set(sale.customer, metric);
    }

    for (const metric of metrics.values()) {
      if (metric.amount <= 0) continue;
      const sources: string[] = [];
      if (metric.count > 0) {
        sources.push(`${metric.count} ${plural(metric.count, "sale")}`);
      }
      if (metric.opening > 0) sources.push("opening balance");
      alerts.push({
        id: `alert:customer-due:${metric.id}`,
        kind: "alert",
        category: "customer",
        tone: "warning",
        title: `Outstanding balance from ${metric.name}`,
        description: `${formatMoney(metric.amount)} outstanding from ${sources.join(" and ")}.`,
        href:
          can("customers") && metric.hasRecord
            ? `/people/${encodeURIComponent(metric.id)}`
            : "/debtors",
        occurredAt: metric.lastDate,
      });
    }
  }

  if (settings.notifyPaymentDue && (can("suppliers") || can("purchases"))) {
    const supplierByName = new Map(
      suppliers.map((supplier) => [supplier.name, supplier]),
    );
    const metrics = new Map<string, BalanceMetric>();

    for (const supplier of suppliers) {
      if (supplier.openingBalance <= 0) continue;
      const metric = emptyBalance(supplier.name, supplier.id, true);
      metric.opening = supplier.openingBalance;
      metric.amount = supplier.openingBalance;
      metrics.set(supplier.name, metric);
    }

    for (const purchase of purchases) {
      const due = purchaseDueOf(purchase);
      if (due <= 0) continue;
      const supplier = supplierByName.get(purchase.supplier);
      const metric =
        metrics.get(purchase.supplier) ??
        emptyBalance(
          purchase.supplier,
          supplier?.id ?? `supplier-${stableKey(purchase.supplier)}`,
          Boolean(supplier),
        );
      metric.purchaseDue += due;
      metric.amount += due;
      metric.count += 1;
      metric.lastDate = latestDate([metric.lastDate, purchase.date]);
      metrics.set(purchase.supplier, metric);
    }

    for (const metric of metrics.values()) {
      if (metric.amount <= 0) continue;
      const sources: string[] = [];
      if (metric.count > 0) {
        sources.push(`${metric.count} ${plural(metric.count, "purchase")}`);
      }
      if (metric.opening > 0) sources.push("opening balance");
      alerts.push({
        id: `alert:supplier-due:${metric.id}`,
        kind: "alert",
        category: "supplier",
        tone: "warning",
        title: `Payment due to ${metric.name}`,
        description: `${formatMoney(metric.amount)} owed from ${sources.join(" and ")}.`,
        href:
          can("suppliers") && metric.hasRecord
            ? `/suppliers/${encodeURIComponent(metric.id)}`
            : "/purchases",
        occurredAt: metric.lastDate,
      });
    }
  }

  if (can("sales_returns") && settings.notifyReturnRequest) {
    for (const record of salesReturns) {
      if (record.status !== "Pending") continue;
      alerts.push({
        id: `alert:sales-return:${record.reference}`,
        kind: "alert",
        category: "sales-return",
        tone: "warning",
        title: `Sales return ${record.reference} needs review`,
        description: `${record.customer} • ${formatMoney(record.amount)} • ${record.reason}`,
        href: `/sales-return/${encodeURIComponent(record.reference)}`,
        occurredAt: record.createdAt,
      });
    }
  }

  if (can("purchase_returns") && settings.notifySupplierReturn) {
    for (const record of purchaseReturns) {
      if (record.status !== "Pending") continue;
      alerts.push({
        id: `alert:purchase-return:${record.reference}`,
        kind: "alert",
        category: "purchase-return",
        tone: "warning",
        title: `Purchase return ${record.reference} needs review`,
        description: `${record.supplier} • ${formatMoney(record.amount)} • ${record.reason}`,
        href: `/purchase-return/${encodeURIComponent(record.reference)}`,
        occurredAt: record.createdAt,
      });
    }
  }

  if (can("expenses")) {
    for (const expense of expenses) {
      if (expense.status !== "Pending") continue;
      alerts.push({
        id: `alert:expense:${expense.reference}`,
        kind: "alert",
        category: "expense",
        tone: "warning",
        title: `Expense ${expense.reference} is pending`,
        description: `${expense.vendor} • ${formatMoney(expense.amount)}`,
        href: `/expenses/${encodeURIComponent(expense.id)}/edit`,
        occurredAt: expense.createdAt,
      });
    }
  }

  alerts.sort((first, second) => {
    const byTone = toneRank(first.tone) - toneRank(second.tone);
    return byTone !== 0 ? byTone : sortByNewest(first, second);
  });

  const activities: AppNotification[] = [];

  if (can("sales") && settings.notifyNewSale) {
    for (const sale of sales) {
      activities.push({
        id: `activity:sale:${sale.reference}`,
        kind: "activity",
        category: "sales",
        tone: "success",
        title: `New sale ${sale.reference}`,
        description: `${sale.customer} • ${formatMoney(sale.total)}`,
        href: `/sales/${encodeURIComponent(sale.reference)}`,
        occurredAt: sale.date,
      });
    }
  }

  if (can("purchases") && settings.notifyPurchaseReceived) {
    for (const purchase of purchases) {
      if (purchase.status !== "Received") continue;
      activities.push({
        id: `activity:purchase:${purchase.reference}`,
        kind: "activity",
        category: "purchase",
        tone: "success",
        title: `Purchase ${purchase.reference} received`,
        description: `${purchase.supplier} • ${formatMoney(purchase.total)}`,
        href: `/purchases/${encodeURIComponent(purchase.reference)}`,
        occurredAt: purchase.date,
      });
    }
  }

  if (can("sales_returns") && settings.notifyReturnRequest) {
    for (const record of salesReturns) {
      if (record.status === "Pending") continue;
      activities.push({
        id: `activity:sales-return:${record.reference}`,
        kind: "activity",
        category: "sales-return",
        tone: "info",
        title: `Sales return ${record.reference}`,
        description: `${record.customer} • ${record.status}`,
        href: `/sales-return/${encodeURIComponent(record.reference)}`,
        occurredAt: record.createdAt,
      });
    }
  }

  if (can("purchase_returns") && settings.notifySupplierReturn) {
    for (const record of purchaseReturns) {
      if (record.status === "Pending") continue;
      activities.push({
        id: `activity:purchase-return:${record.reference}`,
        kind: "activity",
        category: "purchase-return",
        tone: "info",
        title: `Purchase return ${record.reference}`,
        description: `${record.supplier} • ${record.status}`,
        href: `/purchase-return/${encodeURIComponent(record.reference)}`,
        occurredAt: record.createdAt,
      });
    }
  }

  if (can("customers") && settings.notifyNewCustomer) {
    for (const customer of customers) {
      activities.push({
        id: `activity:customer:${customer.id}`,
        kind: "activity",
        category: "customer",
        tone: "success",
        title: "New customer added",
        description: `${customer.name} • ${customer.country}`,
        href: `/people/${encodeURIComponent(customer.id)}`,
        occurredAt: customer.createdAt,
      });
    }
  }

  if (can("expenses")) {
    for (const expense of expenses) {
      if (expense.status !== "Paid") continue;
      activities.push({
        id: `activity:expense:${expense.reference}`,
        kind: "activity",
        category: "expense",
        tone: "info",
        title: `Expense ${expense.reference} recorded`,
        description: `${expense.vendor} • ${formatMoney(expense.amount)}`,
        href: `/expenses/${encodeURIComponent(expense.id)}/edit`,
        occurredAt: expense.createdAt,
      });
    }
  }

  if (can("stock")) {
    for (const adjustment of adjustments) {
      activities.push({
        id: `activity:stock-adjustment:${adjustment.id}`,
        kind: "activity",
        category: "stock",
        tone: "info",
        title: "Stock adjusted",
        description: `${adjustment.productName} • ${adjustment.quantity > 0 ? "+" : ""}${adjustment.quantity} • ${adjustment.reason}`,
        href: `/stock/${encodeURIComponent(adjustment.productCode)}`,
        occurredAt: adjustment.date,
      });
    }
  }

  activities.sort(sortByNewest);

  return {
    alerts,
    activities: activities.slice(0, MAX_ACTIVITIES),
  };
}
