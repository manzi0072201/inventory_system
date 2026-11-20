"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccess } from "@/components/access/access-provider";
import { Card } from "@/components/dashboard/panel";
import { Icon, type IconName } from "@/components/ui/icon";
import { useCustomers } from "@/components/customers/customers-store";
import { useExpenses } from "@/components/expenses/expenses-store";
import { useProducts } from "@/components/products/products-store";
import { usePurchaseReturns } from "@/components/purchase-return/purchase-returns-store";
import { usePurchases } from "@/components/purchases/purchases-store";
import { useSalesReturns } from "@/components/sales-return/sales-returns-store";
import { useSales } from "@/components/sales/sales-store";
import { useStockAdjustments } from "@/components/stock/stock-store";
import { useSuppliers } from "@/components/suppliers/suppliers-store";
import { useWarehouses } from "@/components/warehouses/warehouses-store";
import { api } from "@/lib/api";
import type { BackendProfitReport } from "@/lib/api-types";
import { expenseCategories } from "@/lib/expenses-data";
import { paymentMethods, type PaymentMethod } from "@/lib/payments-data";
import { dueOf, formatMoney, paymentStatusOf, saleStatuses } from "@/lib/sales-data";
import { purchaseStatuses } from "@/lib/purchases-data";
import { returnItemCount } from "@/lib/sales-returns-data";
import {
  addToAging,
  agingTotal,
  catalogCostRatio,
  createAging,
  daysBetween,
  downloadCsv,
  formatCompactMoney,
  formatPercent,
  formatReportDate,
  formatReportRange,
  groupSum,
  makeDateBuckets,
  safeRatio,
  shiftIsoDays,
  sumBy,
  todayIso,
  trendFullLabelFor,
  trendKeyFor,
  trendLabelFor,
  type AgingBuckets,
  type RangePreset,
  type ReportKpi,
  type ReportTab,
} from "@/lib/reporting";
import {
  buildStockMovements,
  reorderPointFor,
  stockStatusClass,
  stockStatusOf,
  type StockStatus,
} from "@/lib/stock-data";
import {
  ReportDonutChart,
  ReportProfitChart,
  ReportTopBarChart,
  ReportTrendChart,
  type DonutDatum,
} from "./report-charts";

const reportTabs: Array<{ value: ReportTab; label: string; icon: IconName }> = [
  { value: "overview", label: "Overview", icon: "reports" },
  { value: "sales", label: "Sales", icon: "sales" },
  { value: "purchases", label: "Purchases", icon: "purchases" },
  { value: "inventory", label: "Inventory", icon: "products" },
  { value: "customers", label: "Customers", icon: "people" },
  { value: "suppliers", label: "Suppliers", icon: "truck" },
  { value: "finance", label: "Finance", icon: "money" },
];

const primaryPrintSections: Partial<Record<ReportTab, string>> = {
  sales: "sales-register",
  purchases: "purchase-register",
  inventory: "stock-valuation",
  customers: "customer-balances",
  suppliers: "supplier-balances",
  finance: "profit-loss",
};

const toneIcons: Record<ReportKpi["tone"], IconName> = {
  purple: "trend",
  blue: "money",
  green: "checkCircle",
  orange: "alert",
  pink: "tag",
  gray: "list",
};

const paymentColors: Record<PaymentMethod, string> = {
  "Bank Account": "#6864ed",
  "MTN MoMo": "#25c7df",
  "Airtel Money": "#f59e0b",
  Cash: "#10b981",
};

const expenseColors = [
  "#6864ed",
  "#25c7df",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
  "#ef4444",
];

const statusColors: Record<string, string> = {
  Completed: "#10b981",
  Received: "#10b981",
  Pending: "#f59e0b",
  Ordered: "#25c7df",
  Paid: "#10b981",
  Partial: "#f59e0b",
  Unpaid: "#ef4444",
};

type CustomerReportRow = {
  name: string;
  type: string;
  orders: number;
  revenue: number;
  paid: number;
  lastOrder: string;
  creditLimit: number;
  aging: AgingBuckets;
  overLimit: boolean;
};

type SupplierReportRow = {
  name: string;
  category: string;
  orders: number;
  spend: number;
  paid: number;
  lastOrder: string;
  aging: AgingBuckets;
};

type ProductReportRow = {
  id: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  warehouse: string;
  quantity: number;
  unit: string;
  cost: number;
  price: number;
  reorderPoint: number;
  status: StockStatus;
  stockValue: number;
  retailValue: number;
  margin: number;
};

function KpiGrid({ items }: { items: ReportKpi[] }) {
  return (
    <div className="metrics-grid report-kpis">
      {items.map((item) => (
        <div className="metric-card report-kpi" key={item.label}>
          <div className="metric-copy">
            <span className="metric-label">{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </div>
          <div className={`metric-icon ${item.tone}`}>
            <Icon name={toneIcons[item.tone]} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AgingSummary({ aging }: { aging: AgingBuckets }) {
  const items = [
    { label: "Current", value: aging.current, tone: "current" },
    { label: "1-30 days", value: aging.days1, tone: "early" },
    { label: "31-60 days", value: aging.days31, tone: "late" },
    { label: "61-90 days", value: aging.days61, tone: "overdue" },
    { label: "90+ days", value: aging.days90, tone: "critical" },
  ];
  return (
    <div className="report-aging-grid">
      {items.map((item) => (
        <div className={`report-aging-cell ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <b>{formatCompactMoney(item.value)}</b>
        </div>
      ))}
    </div>
  );
}

function AgingCells({ aging }: { aging: AgingBuckets }) {
  return (
    <>
      <td>{formatMoney(aging.current)}</td>
      <td>{formatMoney(aging.days1)}</td>
      <td>{formatMoney(aging.days31)}</td>
      <td>{formatMoney(aging.days61)}</td>
      <td>{formatMoney(aging.days90)}</td>
    </>
  );
}

function SectionPrintButton({
  target,
  onPrint,
}: {
  target: string;
  onPrint: (target: string) => void;
}) {
  return (
    <button
      type="button"
      className="report-print-button"
      onClick={() => onPrint(target)}
    >
      <Icon name="reports" />
      Print
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status-pill ${status.toLowerCase().replace(/\s+/g, "-")}`}>
      {status}
    </span>
  );
}

function ReportFoot({ shown, total }: { shown: number; total: number }) {
  return (
    <div className="report-table-foot">
      Showing {shown} of {total} records. Export CSV for the complete report.
    </div>
  );
}

export function ReportsPage() {
  const { can } = useAccess();
  const { sales } = useSales();
  const { salesReturns } = useSalesReturns();
  const { purchases } = usePurchases();
  const { purchaseReturns } = usePurchaseReturns();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { suppliers } = useSuppliers();
  const { expenses } = useExpenses();
  const { adjustments } = useStockAdjustments();
  const { warehouses } = useWarehouses();

  const hasAnyReportData = [
    sales,
    salesReturns,
    purchases,
    purchaseReturns,
    products,
    customers,
    suppliers,
    expenses,
    adjustments,
    warehouses,
  ].some((items) => items.length > 0);

  const canViewSales = can("sales");
  const canViewPurchases = can("purchases");
  const canViewInventory = can("products") || can("stock") || can("warehouses");
  const canViewCustomers = can("customers") || can("debtors");
  const canViewSuppliers = can("suppliers") || can("purchases");
  const canViewFinance =
    canViewSales &&
    canViewPurchases &&
    canViewCustomers &&
    canViewSuppliers &&
    can("expenses") &&
    can("payments");
  const canViewOverview =
    canViewSales && canViewPurchases && canViewInventory && canViewCustomers && canViewSuppliers && can("expenses");
  const visibleTabs = reportTabs.filter((item) => {
    if (item.value === "overview") return canViewOverview;
    if (item.value === "sales") return canViewSales;
    if (item.value === "purchases") return canViewPurchases;
    if (item.value === "inventory") return canViewInventory;
    if (item.value === "customers") return canViewCustomers;
    if (item.value === "suppliers") return canViewSuppliers;
    return canViewFinance;
  });

  const today = useMemo(() => todayIso(), []);
  const [tab, setTab] = useState<ReportTab>(() => visibleTabs[0]?.value ?? "overview");
  const [preset, setPreset] = useState<RangePreset>("90d");
  const [start, setStart] = useState(() => shiftIsoDays(todayIso(), -89));
  const [end, setEnd] = useState(today);
  const [warehouse, setWarehouse] = useState("All warehouses");
  const [profitReport, setProfitReport] = useState<BackendProfitReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    const warehouseId = warehouses.find((item) => item.name === warehouse)?.id;
    api
      .profitReport({ preset: "custom", start, end, warehouseId })
      .then((report) => {
        if (!cancelled) setProfitReport(report);
      })
      .catch(() => {
        if (!cancelled) setProfitReport(null);
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, warehouse, warehouses]);

  const earliestDate = useMemo(() => {
    const dates = [
      ...sales.map((sale) => sale.date),
      ...salesReturns.map((item) => item.date),
      ...purchases.map((purchase) => purchase.date),
      ...purchaseReturns.map((item) => item.date),
      ...expenses.map((expense) => expense.date),
      ...adjustments.map((item) => item.date),
    ].filter(Boolean);
    return dates.length > 0 ? dates.sort()[0] : shiftIsoDays(todayIso(), -365);
  }, [sales, salesReturns, purchases, purchaseReturns, expenses, adjustments]);

  const warehouseOptions = useMemo(() => {
    const names = new Set<string>();
    warehouses.forEach((item) => names.add(item.name));
    sales.forEach((sale) => names.add(sale.warehouse));
    purchases.forEach((purchase) => names.add(purchase.warehouse));
    salesReturns.forEach((item) => names.add(item.warehouse));
    purchaseReturns.forEach((item) => names.add(item.warehouse));
    products.forEach((product) => names.add(product.warehouse));
    return ["All warehouses", ...Array.from(names).sort()];
  }, [warehouses, sales, purchases, salesReturns, purchaseReturns, products]);

  const matchesWarehouse = (value: string) =>
    warehouse === "All warehouses" || value === warehouse;
  const inRange = (value: string) => value >= start && value <= end;

  const filteredSales = useMemo(
    () => sales.filter((sale) => inRange(sale.date) && matchesWarehouse(sale.warehouse)),
    [sales, start, end, warehouse],
  );
  const filteredSalesReturns = useMemo(
    () =>
      salesReturns.filter(
        (item) => inRange(item.date) && matchesWarehouse(item.warehouse),
      ),
    [salesReturns, start, end, warehouse],
  );
  const filteredPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) => inRange(purchase.date) && matchesWarehouse(purchase.warehouse),
      ),
    [purchases, start, end, warehouse],
  );
  const filteredPurchaseReturns = useMemo(
    () =>
      purchaseReturns.filter(
        (item) => inRange(item.date) && matchesWarehouse(item.warehouse),
      ),
    [purchaseReturns, start, end, warehouse],
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => inRange(expense.date)),
    [expenses, start, end],
  );
  const filteredAdjustments = useMemo(
    () =>
      adjustments.filter(
        (item) => inRange(item.date) && matchesWarehouse(item.warehouse),
      ),
    [adjustments, start, end, warehouse],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          warehouse === "All warehouses" || product.warehouse === warehouse,
      ),
    [products, warehouse],
  );

  const validSalesReturns = useMemo(
    () => filteredSalesReturns.filter((item) => item.status !== "Rejected"),
    [filteredSalesReturns],
  );
  const validPurchaseReturns = useMemo(
    () => filteredPurchaseReturns.filter((item) => item.status !== "Rejected"),
    [filteredPurchaseReturns],
  );
  const activeExpenses = useMemo(
    () => filteredExpenses.filter((expense) => expense.status !== "Cancelled"),
    [filteredExpenses],
  );

  const totalSales = useMemo(
    () => sumBy(filteredSales, (sale) => sale.total),
    [filteredSales],
  );
  const totalCollected = useMemo(
    () => sumBy(filteredSales, (sale) => sale.paid),
    [filteredSales],
  );
  const periodReceivables = useMemo(
    () => sumBy(filteredSales, dueOf),
    [filteredSales],
  );
  const salesReturnTotal = useMemo(
    () => sumBy(validSalesReturns, (item) => item.amount),
    [validSalesReturns],
  );
  const totalPurchases = useMemo(
    () => sumBy(filteredPurchases, (purchase) => purchase.total),
    [filteredPurchases],
  );
  const totalSupplierPaid = useMemo(
    () => sumBy(filteredPurchases, (purchase) => purchase.paid),
    [filteredPurchases],
  );
  const periodPayables = useMemo(
    () =>
      sumBy(filteredPurchases, (purchase) =>
        Math.max(0, purchase.total - purchase.paid),
      ),
    [filteredPurchases],
  );
  const purchaseReturnTotal = useMemo(
    () => sumBy(validPurchaseReturns, (item) => item.amount),
    [validPurchaseReturns],
  );
  const expensesTotal = useMemo(
    () => sumBy(activeExpenses, (expense) => expense.amount),
    [activeExpenses],
  );
  const paidExpenses = useMemo(
    () =>
      sumBy(
        activeExpenses.filter((expense) => expense.status === "Paid"),
        (expense) => expense.amount,
      ),
    [activeExpenses],
  );
  const pendingExpenses = useMemo(
    () =>
      sumBy(
        activeExpenses.filter((expense) => expense.status === "Pending"),
        (expense) => expense.amount,
      ),
    [activeExpenses],
  );
  const refundsSettled = useMemo(
    () =>
      sumBy(
        validSalesReturns.filter(
          (item) =>
            item.resolution === "Refund" &&
            (item.status === "Completed" || item.status === "Approved"),
        ),
        (item) => item.amount,
      ),
    [validSalesReturns],
  );

  const netRevenue = totalSales - salesReturnTotal;
  const netPurchases = totalPurchases - purchaseReturnTotal;
  const catalogRatio = useMemo(() => {
    const pool = filteredProducts.length > 0 ? filteredProducts : products;
    return catalogCostRatio(
      pool.map((product) => product.cost),
      pool.map((product) => product.price),
    );
  }, [filteredProducts, products]);
  const estimatedCogs = netRevenue * catalogRatio;
  const cogs = profitReport ? profitReport.totals.netCogs : estimatedCogs;
  const grossProfit = profitReport
    ? profitReport.totals.grossProfit
    : netRevenue - estimatedCogs;
  const netProfit = profitReport
    ? profitReport.totals.netProfit
    : grossProfit - expensesTotal;
  const grossMargin = profitReport
    ? profitReport.totals.grossMargin
    : safeRatio(grossProfit, netRevenue);
  const netMargin = profitReport
    ? profitReport.totals.netMargin
    : safeRatio(netProfit, netRevenue);
  const returnRate = safeRatio(salesReturnTotal, totalSales);
  const collectionRate = safeRatio(totalCollected, totalSales);
  const averageOrder = safeRatio(totalSales, filteredSales.length);
  const averagePurchase = safeRatio(totalPurchases, filteredPurchases.length);
  const breakEvenSales = grossMargin > 0 ? expensesTotal / grossMargin : 0;
  const netCashFlow =
    totalCollected - totalSupplierPaid - paidExpenses - refundsSettled;

  const todaySales = useMemo(
    () =>
      sales.filter(
        (sale) => sale.date === today && matchesWarehouse(sale.warehouse),
      ),
    [sales, today, warehouse],
  );
  const todayReturns = useMemo(
    () =>
      salesReturns.filter(
        (item) =>
          item.date === today &&
          item.status !== "Rejected" &&
          matchesWarehouse(item.warehouse),
      ),
    [salesReturns, today, warehouse],
  );
  const todayExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) => expense.date === today && expense.status !== "Cancelled",
      ),
    [expenses, today],
  );
  const todayGrossSales = sumBy(todaySales, (sale) => sale.total);
  const todayNetSales = todayGrossSales - sumBy(todayReturns, (item) => item.amount);
  const todayGrossProfit = todayNetSales - todayNetSales * catalogRatio;
  const todayExpenseTotal = sumBy(todayExpenses, (expense) => expense.amount);
  const todayNetProfit = todayGrossProfit - todayExpenseTotal;
  const todayGrossMargin = safeRatio(todayGrossProfit, todayNetSales);
  const todayNetMargin = safeRatio(todayNetProfit, todayNetSales);

  const arSales = useMemo(
    () =>
      sales.filter(
        (sale) => sale.date <= end && matchesWarehouse(sale.warehouse),
      ),
    [sales, end, warehouse],
  );
  const apPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) =>
          purchase.date <= end && matchesWarehouse(purchase.warehouse),
      ),
    [purchases, end, warehouse],
  );

  const arAging = useMemo(() => {
    const aging = createAging();
    for (const sale of arSales) {
      const due = dueOf(sale);
      if (due > 0) addToAging(aging, sale.date, end, due);
    }
    if (warehouse === "All warehouses") {
      customers.forEach((customer) => {
        if (customer.openingBalance > 0) aging.current += customer.openingBalance;
      });
    }
    return aging;
  }, [arSales, end, customers, warehouse]);

  const apAging = useMemo(() => {
    const aging = createAging();
    for (const purchase of apPurchases) {
      const due = Math.max(0, purchase.total - purchase.paid);
      if (due > 0) addToAging(aging, purchase.date, end, due);
    }
    if (warehouse === "All warehouses") {
      suppliers.forEach((supplier) => {
        if (supplier.openingBalance > 0) aging.current += supplier.openingBalance;
      });
    }
    return aging;
  }, [apPurchases, end, suppliers, warehouse]);

  const closingReceivables = agingTotal(arAging);
  const closingPayables = agingTotal(apAging);
  const overdueReceivables = arAging.days1 + arAging.days31 + arAging.days61 + arAging.days90;
  const overduePayables = apAging.days1 + apAging.days31 + apAging.days61 + apAging.days90;

  const customerRows = useMemo<CustomerReportRow[]>(() => {
    const map = new Map<string, CustomerReportRow>();
    const ensure = (name: string) => {
      const existing = map.get(name);
      if (existing) return existing;
      const profile = customers.find((customer) => customer.name === name);
      const row: CustomerReportRow = {
        name,
        type: profile?.type ?? "Individual",
        orders: 0,
        revenue: 0,
        paid: 0,
        lastOrder: "",
        creditLimit: profile?.creditLimit ?? 0,
        aging: createAging(),
        overLimit: false,
      };
      map.set(name, row);
      return row;
    };

    customers.forEach((customer) => ensure(customer.name));
    filteredSales.forEach((sale) => {
      const row = ensure(sale.customer);
      row.orders += 1;
      row.revenue += sale.total;
      row.paid += sale.paid;
      if (sale.date > row.lastOrder) row.lastOrder = sale.date;
    });
    arSales.forEach((sale) => {
      const due = dueOf(sale);
      if (due > 0) addToAging(ensure(sale.customer).aging, sale.date, end, due);
    });
    if (warehouse === "All warehouses") {
      customers.forEach((customer) => {
        if (customer.openingBalance > 0) {
          ensure(customer.name).aging.current += customer.openingBalance;
        }
      });
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        overLimit:
          row.creditLimit > 0 && agingTotal(row.aging) > row.creditLimit,
      }))
      .sort(
        (a, b) =>
          agingTotal(b.aging) - agingTotal(a.aging) || b.revenue - a.revenue,
      );
  }, [customers, filteredSales, arSales, end, warehouse]);

  const supplierRows = useMemo<SupplierReportRow[]>(() => {
    const map = new Map<string, SupplierReportRow>();
    const ensure = (name: string) => {
      const existing = map.get(name);
      if (existing) return existing;
      const profile = suppliers.find((supplier) => supplier.name === name);
      const row: SupplierReportRow = {
        name,
        category: profile?.category ?? "Other",
        orders: 0,
        spend: 0,
        paid: 0,
        lastOrder: "",
        aging: createAging(),
      };
      map.set(name, row);
      return row;
    };

    suppliers.forEach((supplier) => ensure(supplier.name));
    filteredPurchases.forEach((purchase) => {
      const row = ensure(purchase.supplier);
      row.orders += 1;
      row.spend += purchase.total;
      row.paid += purchase.paid;
      if (purchase.date > row.lastOrder) row.lastOrder = purchase.date;
    });
    apPurchases.forEach((purchase) => {
      const due = Math.max(0, purchase.total - purchase.paid);
      if (due > 0) {
        addToAging(ensure(purchase.supplier).aging, purchase.date, end, due);
      }
    });
    if (warehouse === "All warehouses") {
      suppliers.forEach((supplier) => {
        if (supplier.openingBalance > 0) {
          ensure(supplier.name).aging.current += supplier.openingBalance;
        }
      });
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        agingTotal(b.aging) - agingTotal(a.aging) || b.spend - a.spend,
    );
  }, [suppliers, filteredPurchases, apPurchases, end, warehouse]);

  const productRows = useMemo<ProductReportRow[]>(
    () =>
      filteredProducts
        .map((product) => {
          const reorderPoint = reorderPointFor(product);
          return {
            id: product.id,
            code: product.code,
            name: product.name,
            category: product.category,
            brand: product.brand,
            warehouse: product.warehouse,
            quantity: product.quantity,
            unit: product.unit,
            cost: product.cost,
            price: product.price,
            reorderPoint,
            status: stockStatusOf(product.quantity, reorderPoint, product.stocked),
            stockValue: product.quantity * product.cost,
            retailValue: product.quantity * product.price,
            margin: safeRatio(product.price - product.cost, product.price),
          };
        })
        .sort((a, b) => b.stockValue - a.stockValue),
    [filteredProducts],
  );

  const stockValue = useMemo(
    () => sumBy(productRows, (product) => product.stockValue),
    [productRows],
  );
  const retailValue = useMemo(
    () => sumBy(productRows, (product) => product.retailValue),
    [productRows],
  );
  const stockUnits = useMemo(
    () => sumBy(productRows, (product) => product.quantity),
    [productRows],
  );
  const lowStockRows = useMemo(
    () => productRows.filter((product) => product.status === "Low Stock"),
    [productRows],
  );
  const outOfStockRows = useMemo(
    () => productRows.filter((product) => product.status === "Out of Stock"),
    [productRows],
  );
  const inventoryTurnover = safeRatio(cogs, stockValue);
  const receivableDays =
    netRevenue > 0 ? (closingReceivables / netRevenue) * (daysBetween(start, end) + 1) : 0;

  const sellerRows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; orders: number; total: number; paid: number; due: number }
    >();
    filteredSales.forEach((sale) => {
      const row = map.get(sale.seller) ?? {
        name: sale.seller,
        orders: 0,
        total: 0,
        paid: 0,
        due: 0,
      };
      row.orders += 1;
      row.total += sale.total;
      row.paid += sale.paid;
      row.due += dueOf(sale);
      map.set(sale.seller, row);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  const trendData = useMemo(() => {
    const buckets = makeDateBuckets(start, end);
    const series = new Map(
      buckets.map((bucket) => [
        bucket.key,
        {
          ...bucket,
          sales: 0,
          salesReturns: 0,
          purchases: 0,
          purchaseReturns: 0,
          expenses: 0,
          orders: 0,
        },
      ]),
    );
    const entryFor = (date: string) => series.get(trendKeyFor(date, start, end));

    filteredSales.forEach((sale) => {
      const entry = entryFor(sale.date);
      if (!entry) return;
      entry.sales += sale.total;
      entry.orders += 1;
    });
    validSalesReturns.forEach((item) => {
      const entry = entryFor(item.date);
      if (entry) entry.salesReturns += item.amount;
    });
    filteredPurchases.forEach((purchase) => {
      const entry = entryFor(purchase.date);
      if (entry) entry.purchases += purchase.total;
    });
    validPurchaseReturns.forEach((item) => {
      const entry = entryFor(item.date);
      if (entry) entry.purchaseReturns += item.amount;
    });
    activeExpenses.forEach((expense) => {
      const entry = entryFor(expense.date);
      if (entry) entry.expenses += expense.amount;
    });

    const profitByBucket = new Map(
      (profitReport?.series ?? []).map((row) => [
        trendKeyFor(row.bucket, start, end),
        row,
      ]),
    );
    return Array.from(series.values()).map((entry) => {
      const netSales = entry.sales - entry.salesReturns;
      const netPurchases = entry.purchases - entry.purchaseReturns;
      const profit = profitByBucket.get(entry.key);
      const bucketGross = profit?.grossProfit ?? netSales * (1 - catalogRatio);
      const bucketNet = profit?.netProfit ?? bucketGross - entry.expenses;
      return {
        key: entry.key,
        label: trendLabelFor(entry.key, start, end),
        fullLabel: trendFullLabelFor(entry.key, start, end),
        sales: netSales,
        purchases: netPurchases,
        expenses: entry.expenses,
        grossProfit: bucketGross,
        netProfit: bucketNet,
        orders: entry.orders,
      };
    });
  }, [
    start,
    end,
    filteredSales,
    validSalesReturns,
    filteredPurchases,
    validPurchaseReturns,
    activeExpenses,
    catalogRatio,
    profitReport,
  ]);

  const paymentMixData: DonutDatum[] = useMemo(() => {
    const totals = groupSum(
      filteredSales,
      (sale) => sale.paymentMethod,
      (sale) => sale.paid,
    );
    return paymentMethods.map((method) => ({
      name: method,
      value: totals[method] ?? 0,
      color: paymentColors[method],
    }));
  }, [filteredSales]);

  const expenseCategoryData: DonutDatum[] = useMemo(() => {
    const totals = groupSum(
      activeExpenses,
      (expense) => expense.category,
      (expense) => expense.amount,
    );
    return expenseCategories.map((category, index) => ({
      name: category,
      value: totals[category] ?? 0,
      color: expenseColors[index % expenseColors.length],
    }));
  }, [activeExpenses]);

  const categoryStockData: DonutDatum[] = useMemo(() => {
    const totals = groupSum(
      productRows,
      (product) => product.category,
      (product) => product.stockValue,
    );
    return Object.entries(totals).map(([name, value], index) => ({
      name,
      value,
      color: expenseColors[index % expenseColors.length],
    }));
  }, [productRows]);

  const saleStatusRows = useMemo(
    () =>
      saleStatuses.map((status) => {
        const items = filteredSales.filter((sale) => sale.status === status);
        const value = sumBy(items, (sale) => sale.total);
        return {
          status,
          count: items.length,
          value,
          share: safeRatio(value, totalSales),
        };
      }),
    [filteredSales, totalSales],
  );

  const purchaseStatusRows = useMemo(
    () =>
      purchaseStatuses.map((status) => {
        const items = filteredPurchases.filter(
          (purchase) => purchase.status === status,
        );
        const value = sumBy(items, (purchase) => purchase.total);
        return {
          status,
          count: items.length,
          value,
          share: safeRatio(value, totalPurchases),
        };
      }),
    [filteredPurchases, totalPurchases],
  );

  const paymentMethodRows = useMemo(
    () =>
      paymentMethods.map((method) => {
        const received = sumBy(
          filteredSales.filter((sale) => sale.paymentMethod === method),
          (sale) => sale.paid,
        );
        const supplierPaid = sumBy(
          filteredPurchases.filter(
            (purchase) => purchase.paymentMethod === method,
          ),
          (purchase) => purchase.paid,
        );
        const expensePaid = sumBy(
          activeExpenses.filter(
            (expense) =>
              expense.paymentMethod === method && expense.status === "Paid",
          ),
          (expense) => expense.amount,
        );
        return {
          method,
          received,
          supplierPaid,
          expensePaid,
          net: received - supplierPaid - expensePaid,
        };
      }),
    [filteredSales, filteredPurchases, activeExpenses],
  );

  const recentSales = useMemo(
    () => [...filteredSales].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredSales],
  );
  const recentPurchases = useMemo(
    () => [...filteredPurchases].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredPurchases],
  );
  const recentReturns = useMemo(
    () => [...filteredSalesReturns].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredSalesReturns],
  );
  const recentPurchaseReturns = useMemo(
    () =>
      [...filteredPurchaseReturns].sort((a, b) => b.date.localeCompare(a.date)),
    [filteredPurchaseReturns],
  );
  const recentMovements = useMemo(
    () =>
      buildStockMovements(products, sales, purchases, adjustments, 1500)
        .filter((movement) => inRange(movement.date) && matchesWarehouse(movement.warehouse))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [products, sales, purchases, adjustments, start, end, warehouse],
  );

  const topCustomerData = useMemo(
    () =>
      [...customerRows]
        .filter((row) => row.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((row) => ({ name: row.name, value: row.revenue })),
    [customerRows],
  );
  const topSupplierData = useMemo(
    () =>
      [...supplierRows]
        .filter((row) => row.spend > 0)
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5)
        .map((row) => ({ name: row.name, value: row.spend })),
    [supplierRows],
  );

  const activeCustomers = customerRows.filter((row) => row.orders > 0).length;
  const newCustomers = customers.filter(
    (customer) =>
      customer.createdAt.slice(0, 10) >= start && customer.createdAt.slice(0, 10) <= end,
  ).length;
  const overLimitCustomers = customerRows.filter((row) => row.overLimit).length;
  const topCustomerRevenue = sumBy(
    [...customerRows].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    (row) => row.revenue,
  );
  const revenueConcentration = safeRatio(topCustomerRevenue, totalSales);

  const pendingSalesReturns = filteredSalesReturns.filter(
    (item) => item.status === "Pending",
  ).length;
  const pendingPurchaseReturns = filteredPurchaseReturns.filter(
    (item) => item.status === "Pending",
  ).length;
  const pendingPurchaseOrders = filteredPurchases.filter(
    (purchase) => purchase.status !== "Received",
  ).length;

  const todayKpis: ReportKpi[] = [
    {
      label: "Today's sales",
      value: formatCompactMoney(todayNetSales),
      note: `${todaySales.length} ${todaySales.length === 1 ? "order" : "orders"} today`,
      tone: "purple",
    },
    {
      label: "Today's gross profit",
      value: formatCompactMoney(todayGrossProfit),
      note: `Estimated · ${formatPercent(todayGrossMargin)} margin`,
      tone: "green",
    },
    {
      label: "Today's expenses",
      value: formatCompactMoney(todayExpenseTotal),
      note: `${todayExpenses.length} ${todayExpenses.length === 1 ? "entry" : "entries"} today`,
      tone: "orange",
    },
    {
      label: "Today's net profit",
      value: formatCompactMoney(todayNetProfit),
      note: `${formatPercent(todayNetMargin)} net margin`,
      tone: todayNetProfit >= 0 ? "blue" : "pink",
    },
  ];

  const overviewKpis: ReportKpi[] = [
    {
      label: "Net sales",
      value: formatCompactMoney(netRevenue),
      note: `${filteredSales.length} orders in period`,
      tone: "purple",
    },
    {
      label: "Gross profit",
      value: formatCompactMoney(grossProfit),
      note: `${formatPercent(grossMargin)} gross margin`,
      tone: "green",
    },
    {
      label: "Net profit",
      value: formatCompactMoney(netProfit),
      note: `${formatPercent(netMargin)} net margin`,
      tone: netProfit >= 0 ? "blue" : "orange",
    },
    {
      label: "Closing receivables",
      value: formatCompactMoney(closingReceivables),
      note: `${formatCompactMoney(overdueReceivables)} overdue`,
      tone: "orange",
    },
    {
      label: "Inventory value",
      value: formatCompactMoney(stockValue),
      note: `${productRows.length} SKUs at cost`,
      tone: "pink",
    },
    {
      label: "Net cash flow",
      value: formatCompactMoney(netCashFlow),
      note: "Collections less payments",
      tone: netCashFlow >= 0 ? "green" : "orange",
    },
  ];

  const healthRows = [
    {
      label: "Gross margin",
      value: grossMargin,
      display: formatPercent(grossMargin),
    },
    {
      label: "Net margin",
      value: Math.max(0, netMargin),
      display: formatPercent(netMargin),
    },
    {
      label: "Collection rate",
      value: collectionRate,
      display: formatPercent(collectionRate),
    },
    {
      label: "Sales return rate",
      value: returnRate,
      display: formatPercent(returnRate),
    },
    {
      label: "Expense ratio",
      value: safeRatio(expensesTotal, netRevenue),
      display: formatPercent(safeRatio(expensesTotal, netRevenue)),
    },
    {
      label: "Inventory turnover",
      value: Math.min(1, inventoryTurnover),
      display: `${inventoryTurnover.toFixed(2)}x`,
    },
  ];

  function applyPreset(next: RangePreset) {
    const current = todayIso();
    setPreset(next);
    setEnd(current);
    if (next === "7d") setStart(shiftIsoDays(current, -6));
    if (next === "30d") setStart(shiftIsoDays(current, -29));
    if (next === "90d") setStart(shiftIsoDays(current, -89));
    if (next === "ytd") setStart(`${current.slice(0, 4)}-01-01`);
    if (next === "all") setStart(earliestDate);
  }

  const activeTab = visibleTabs.find((item) => item.value === tab) ?? visibleTabs[0];
  const primaryPrintSection = activeTab
    ? primaryPrintSections[activeTab.value]
    : undefined;

  function printSection(target?: string) {
    if (!target) {
      window.print();
      return;
    }
    const source = document.querySelector<HTMLElement>(
      `[data-print-section="${target}"]`,
    );
    if (!source) {
      window.print();
      return;
    }
    const existing = document.querySelector(".report-print-clone");
    existing?.remove();
    const clone = document.createElement("div");
    clone.className = "report-print-clone";
    const header = document.querySelector(".report-print-header");
    if (header) clone.appendChild(header.cloneNode(true));
    clone.appendChild(source.cloneNode(true));
    document.body.appendChild(clone);
    document.documentElement.dataset.printSection = "clone";
    window.print();
    delete document.documentElement.dataset.printSection;
    clone.remove();
  }

  function resetFilters() {
    setWarehouse("All warehouses");
    applyPreset("90d");
  }

  function exportReport() {
    const rows: Array<Array<string | number>> = [];
    if (activeTab?.value === "overview") {
      rows.push(["Business report summary"]);
      rows.push(["Period", formatReportRange(start, end)]);
      rows.push(["Warehouse", warehouse]);
      rows.push([]);
      rows.push(["Metric", "Value"]);
      rows.push(["Gross sales", totalSales]);
      rows.push(["Sales returns", salesReturnTotal]);
      rows.push(["Net sales", netRevenue]);
      rows.push([profitReport ? "COGS (actual)" : "COGS (estimated)", cogs]);
      rows.push(["Gross profit", grossProfit]);
      rows.push(["Operating expenses", expensesTotal]);
      rows.push(["Net profit", netProfit]);
      rows.push(["Closing receivables", closingReceivables]);
      rows.push(["Closing payables", closingPayables]);
      rows.push(["Inventory value", stockValue]);
      rows.push(["Net cash flow", netCashFlow]);
    }
    if (activeTab?.value === "sales") {
      rows.push([
        "Date",
        "Reference",
        "Seller",
        "Customer",
        "Warehouse",
        "Status",
        "Payment status",
        "Total",
        "Paid",
        "Due",
        "Payment method",
      ]);
      filteredSales.forEach((sale) => {
        rows.push([
          sale.date,
          sale.reference,
          sale.seller,
          sale.customer,
          sale.warehouse,
          sale.status,
          paymentStatusOf(sale),
          sale.total,
          sale.paid,
          dueOf(sale),
          sale.paymentMethod,
        ]);
      });
    }
    if (activeTab?.value === "purchases") {
      rows.push([
        "Date",
        "Reference",
        "Supplier",
        "Buyer",
        "Warehouse",
        "Status",
        "Total",
        "Paid",
        "Due",
        "Payment method",
      ]);
      filteredPurchases.forEach((purchase) => {
        rows.push([
          purchase.date,
          purchase.reference,
          purchase.supplier,
          purchase.buyer,
          purchase.warehouse,
          purchase.status,
          purchase.total,
          purchase.paid,
          purchase.total - purchase.paid,
          purchase.paymentMethod,
        ]);
      });
    }
    if (activeTab?.value === "inventory") {
      rows.push([
        "Code",
        "Product",
        "Category",
        "Brand",
        "Warehouse",
        "On hand",
        "Unit",
        "Reorder point",
        "Status",
        "Cost",
        "Price",
        "Margin %",
        "Stock value",
        "Retail value",
      ]);
      productRows.forEach((product) => {
        rows.push([
          product.code,
          product.name,
          product.category,
          product.brand,
          product.warehouse,
          product.quantity,
          product.unit,
          product.reorderPoint,
          product.status,
          product.cost,
          product.price,
          (product.margin * 100).toFixed(1),
          product.stockValue,
          product.retailValue,
        ]);
      });
    }
    if (activeTab?.value === "customers") {
      rows.push([
        "Customer",
        "Type",
        "Orders",
        "Revenue",
        "Paid",
        "Balance",
        "Current",
        "1-30",
        "31-60",
        "61-90",
        "90+",
        "Credit limit",
        "Over limit",
        "Last order",
      ]);
      customerRows.forEach((row) => {
        rows.push([
          row.name,
          row.type,
          row.orders,
          row.revenue,
          row.paid,
          agingTotal(row.aging),
          row.aging.current,
          row.aging.days1,
          row.aging.days31,
          row.aging.days61,
          row.aging.days90,
          row.creditLimit,
          row.overLimit ? "Yes" : "No",
          row.lastOrder,
        ]);
      });
    }
    if (activeTab?.value === "suppliers") {
      rows.push([
        "Supplier",
        "Category",
        "Orders",
        "Spend",
        "Paid",
        "Balance",
        "Current",
        "1-30",
        "31-60",
        "61-90",
        "90+",
        "Last order",
      ]);
      supplierRows.forEach((row) => {
        rows.push([
          row.name,
          row.category,
          row.orders,
          row.spend,
          row.paid,
          agingTotal(row.aging),
          row.aging.current,
          row.aging.days1,
          row.aging.days31,
          row.aging.days61,
          row.aging.days90,
          row.lastOrder,
        ]);
      });
    }
    if (activeTab?.value === "finance") {
      rows.push(["Profit and loss"]);
      rows.push(["Line", "Amount"]);
      rows.push(["Gross sales", totalSales]);
      rows.push(["Less sales returns", -salesReturnTotal]);
      rows.push(["Net sales", netRevenue]);
      rows.push([profitReport ? "COGS (actual)" : "COGS (estimated)", -cogs]);
      rows.push(["Gross profit", grossProfit]);
      rows.push(["Operating expenses", -expensesTotal]);
      rows.push(["Net profit", netProfit]);
      rows.push([]);
      rows.push(["Cash flow"]);
      rows.push(["Line", "Amount"]);
      rows.push(["Customer collections", totalCollected]);
      rows.push(["Supplier payments", -totalSupplierPaid]);
      rows.push(["Expenses paid", -paidExpenses]);
      rows.push(["Customer refunds", -refundsSettled]);
      rows.push(["Net cash flow", netCashFlow]);
      rows.push([]);
      rows.push(["Expense detail"]);
      rows.push(["Date", "Reference", "Category", "Vendor", "Description", "Status", "Amount"]);
      filteredExpenses.forEach((expense) => {
        rows.push([
          expense.date,
          expense.reference,
          expense.category,
          expense.vendor,
          expense.description,
          expense.status,
          expense.amount,
        ]);
      });
    }
    downloadCsv(`reports-${activeTab?.value ?? "report"}-${start}-to-${end}.csv`, rows);
  }

  return (
    <div className="report-page">
      <div className="page-heading report-page-heading">
        <div>
          <div className="breadcrumb">
            <span>Analytics</span>
            <Icon name="chevronDown" className="breadcrumb-chevron" />
            <span>Reports</span>
          </div>
          <h1>{activeTab ? `${activeTab.label} report` : "Reports"}</h1>
          <p>
            {formatReportRange(start, end)} · {warehouse} · Figures in RWF
          </p>
        </div>
        <div className="report-heading-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => printSection(primaryPrintSection)}
            disabled={!activeTab}
          >
            <Icon name="reports" />
            Print
          </button>
          <button className="primary-button" type="button" onClick={exportReport} disabled={!activeTab}>
            <Icon name="download" />
            Export CSV
          </button>
        </div>
      </div>

      <section className="panel report-toolbar">
        <div className="report-presets" aria-label="Report period">
          {[
            { value: "7d", label: "7D" },
            { value: "30d", label: "30D" },
            { value: "90d", label: "90D" },
            { value: "ytd", label: "YTD" },
            { value: "all", label: "All" },
          ].map((item) => (
            <button
              type="button"
              key={item.value}
              className={preset === item.value ? "selected" : ""}
              onClick={() => applyPreset(item.value as RangePreset)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="report-filter-grid">
          <label className="report-filter-field">
            <span>From</span>
            <input
              type="date"
              className="filter-input"
              value={start}
              max={end}
              onChange={(event) => {
                setPreset("custom");
                setStart(event.target.value);
              }}
            />
          </label>
          <label className="report-filter-field">
            <span>To</span>
            <input
              type="date"
              className="filter-input"
              value={end}
              min={start}
              max={today}
              onChange={(event) => {
                setPreset("custom");
                setEnd(event.target.value);
              }}
            />
          </label>
          <label className="report-filter-field">
            <span>Warehouse</span>
            <select
              className="filter-select"
              value={warehouse}
              onChange={(event) => setWarehouse(event.target.value)}
            >
              {warehouseOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost-button report-reset" type="button" onClick={resetFilters}>
            <Icon name="refresh" />
            Reset
          </button>
        </div>
      </section>

      {visibleTabs.length > 0 ? (
        <nav className="panel report-tabs" aria-label="Report sections">
          {visibleTabs.map((item) => (
            <button
              type="button"
              key={item.value}
              className={tab === item.value ? "active" : ""}
              onClick={() => setTab(item.value)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      ) : (
        <section className="panel report-toolbar">
          <div className="panel-body">
            <p>Your role does not include access to any report data.</p>
          </div>
        </section>
      )}

      {visibleTabs.length > 0 && !hasAnyReportData && (
        <section className="panel report-toolbar">
          <div className="panel-body">
            <p>No report data is available for the selected range.</p>
          </div>
        </section>
      )}

      <div className="report-print-area">
        <div className="report-print-header">
          <h1>{activeTab ? `${activeTab.label} report` : "Reports"}</h1>
          <p>
            {formatReportRange(start, end)} · {warehouse} · Figures in RWF
          </p>
          <p>Generated {formatReportDate(today)}</p>
        </div>

        {activeTab?.value === "overview" ? (
        <div className="report-tab-content">
          <Card
            title="Today at a glance"
            className="report-today-card"
            printSection="today-summary"
            action={
              <span className="report-today-actions">
                <span className="report-today-date">
                  {formatReportDate(today)} · {warehouse}
                </span>
                <SectionPrintButton target="today-summary" onPrint={printSection} />
              </span>
            }
          >
            <KpiGrid items={todayKpis} />
          </Card>
          <KpiGrid items={overviewKpis} />
          <div className="analytics-grid">
            <Card title="Revenue, purchases & expenses" className="report-chart-card">
              <ReportTrendChart data={trendData} />
            </Card>
            <Card title="Payment mix" className="report-chart-card">
              <ReportDonutChart data={paymentMixData} />
            </Card>
          </div>
          <div className="analytics-grid">
            <Card title="Profit trend" className="report-chart-card">
              <ReportProfitChart data={trendData} />
            </Card>
            <Card title="Top customers by revenue" className="report-chart-card">
              {topCustomerData.length > 0 ? (
                <ReportTopBarChart data={topCustomerData} />
              ) : (
                <div className="report-empty">No customer revenue in this period.</div>
              )}
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Business health">
              <div className="report-health-list">
                {healthRows.map((item) => (
                  <div className="report-health-row" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <b>{item.display}</b>
                    </div>
                    <div className="progress">
                      <i style={{ width: `${Math.min(100, Math.max(0, item.value * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="report-ratio-grid">
                <div>
                  <span>Break-even sales</span>
                  <b>{formatCompactMoney(breakEvenSales)}</b>
                </div>
                <div>
                  <span>Receivable days</span>
                  <b>{receivableDays.toFixed(0)} days</b>
                </div>
                <div>
                  <span>Revenue concentration</span>
                  <b>{formatPercent(revenueConcentration)}</b>
                </div>
                <div>
                  <span>Closing payables</span>
                  <b>{formatCompactMoney(closingPayables)}</b>
                </div>
              </div>
            </Card>
            <Card title="Action center">
              <div className="report-alert-list">
                <Link href="/stock" className="report-alert-row">
                  <span className="report-alert-icon low">
                    <Icon name="alert" />
                  </span>
                  <div>
                    <b>{lowStockRows.length + outOfStockRows.length} stock alerts</b>
                    <small>
                      {lowStockRows.length} low stock · {outOfStockRows.length} out of stock
                    </small>
                  </div>
                  <strong>{formatCompactMoney(lowStockRows.reduce((sum, row) => sum + row.stockValue, 0))}</strong>
                </Link>
                <Link href="/debtors" className="report-alert-row">
                  <span className="report-alert-icon overdue">
                    <Icon name="money" />
                  </span>
                  <div>
                    <b>{overLimitCustomers} customers over credit limit</b>
                    <small>{formatCompactMoney(overdueReceivables)} overdue receivables</small>
                  </div>
                  <strong>{formatCompactMoney(closingReceivables)}</strong>
                </Link>
                <Link href="/expenses" className="report-alert-row">
                  <span className="report-alert-icon pending">
                    <Icon name="expenses" />
                  </span>
                  <div>
                    <b>
                      {activeExpenses.filter((expense) => expense.status === "Pending").length} pending expenses
                    </b>
                    <small>Awaiting approval or payment</small>
                  </div>
                  <strong>{formatCompactMoney(pendingExpenses)}</strong>
                </Link>
                <Link href="/sales-return" className="report-alert-row">
                  <span className="report-alert-icon return">
                    <Icon name="salesReturn" />
                  </span>
                  <div>
                    <b>{pendingSalesReturns + pendingPurchaseReturns} pending returns</b>
                    <small>Sales and purchase returns awaiting action</small>
                  </div>
                  <strong>{formatCompactMoney(salesReturnTotal + purchaseReturnTotal)}</strong>
                </Link>
                <Link href="/purchases" className="report-alert-row">
                  <span className="report-alert-icon order">
                    <Icon name="purchases" />
                  </span>
                  <div>
                    <b>{pendingPurchaseOrders} open purchase orders</b>
                    <small>Orders not yet received</small>
                  </div>
                  <strong>{formatCompactMoney(periodPayables)}</strong>
                </Link>
              </div>
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Top customers" action={<Link href="/people" className="view-all">View customers</Link>}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...customerRows]
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 5)
                      .map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.orders}</td>
                          <td>{formatMoney(row.revenue)}</td>
                          <td>{formatMoney(agingTotal(row.aging))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Top suppliers" action={<Link href="/suppliers" className="view-all">View suppliers</Link>}>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Orders</th>
                      <th>Spend</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...supplierRows]
                      .sort((a, b) => b.spend - a.spend)
                      .slice(0, 5)
                      .map((row) => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td>{row.orders}</td>
                          <td>{formatMoney(row.spend)}</td>
                          <td>{formatMoney(agingTotal(row.aging))}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <p className="report-note">
            {profitReport
              ? `Gross profit and COGS use cost snapshots captured on each sale item and returned item${profitReport.unpricedSaleItems + profitReport.unpricedReturnItems > 0 ? `; ${profitReport.unpricedSaleItems + profitReport.unpricedReturnItems} item(s) still have no recorded cost` : ""}. Expenses are company-wide and are not reduced by the warehouse filter.`
              : `Gross profit and COGS are estimated from the product catalog cost-to-price ratio (${formatPercent(catalogRatio)} cost ratio) because actual cost data is unavailable. Expenses are company-wide and are not reduced by the warehouse filter.`}
          </p>
        </div>
      ) : null}

      {activeTab?.value === "sales" ? (
        <div className="report-tab-content">
          <KpiGrid
            items={[
              { label: "Gross sales", value: formatCompactMoney(totalSales), note: `${filteredSales.length} orders`, tone: "purple" },
              { label: "Collected", value: formatCompactMoney(totalCollected), note: `${formatPercent(collectionRate)} collection rate`, tone: "green" },
              { label: "Outstanding", value: formatCompactMoney(periodReceivables), note: "On period sales", tone: "orange" },
              { label: "Average order", value: formatCompactMoney(averageOrder), note: "Sales value per order", tone: "blue" },
              { label: "Sales returns", value: formatCompactMoney(salesReturnTotal), note: `${formatPercent(returnRate)} of gross sales`, tone: "pink" },
              { label: "Net sales", value: formatCompactMoney(netRevenue), note: "After valid returns", tone: "gray" },
            ]}
          />
          <div className="analytics-grid">
            <Card title="Sales trend" className="report-chart-card">
              <ReportTrendChart data={trendData} showPurchases={false} showExpenses={false} />
            </Card>
            <Card title="Payment mix">
              <ReportDonutChart data={paymentMixData} />
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Sales by status">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Status</th><th>Orders</th><th>Value</th><th>Share</th></tr>
                  </thead>
                  <tbody>
                    {saleStatusRows.map((row) => (
                      <tr key={row.status}>
                        <td><StatusPill status={row.status} /></td>
                        <td>{row.count}</td>
                        <td>{formatMoney(row.value)}</td>
                        <td>{formatPercent(row.share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Sales by warehouse">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Warehouse</th><th>Orders</th><th>Sales</th><th>Outstanding</th></tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      filteredSales.reduce((map, sale) => {
                        const row = map.get(sale.warehouse) ?? { orders: 0, total: 0, due: 0 };
                        row.orders += 1;
                        row.total += sale.total;
                        row.due += dueOf(sale);
                        map.set(sale.warehouse, row);
                        return map;
                      }, new Map<string, { orders: number; total: number; due: number }>()),
                    ).map(([name, row]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{row.orders}</td>
                        <td>{formatMoney(row.total)}</td>
                        <td>{formatMoney(row.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Top customers by revenue">
              {topCustomerData.length > 0 ? <ReportTopBarChart data={topCustomerData} /> : <div className="report-empty">No sales in period.</div>}
            </Card>
            <Card title="Seller performance">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>Seller</th><th>Orders</th><th>Sales</th><th>Collected</th><th>Due</th></tr>
                  </thead>
                  <tbody>
                    {sellerRows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{row.orders}</td>
                        <td>{formatMoney(row.total)}</td>
                        <td>{formatMoney(row.paid)}</td>
                        <td>{formatMoney(row.due)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <Card
            title="Sales register"
            printSection="sales-register"
            action={<SectionPrintButton target="sales-register" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Reference</th><th>Customer</th><th>Seller</th>
                    <th>Warehouse</th><th>Status</th><th>Payment</th><th>Total</th>
                    <th>Paid</th><th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{formatReportDate(sale.date)}</td>
                      <td>{sale.reference}</td>
                      <td>{sale.customer}</td>
                      <td>{sale.seller}</td>
                      <td>{sale.warehouse}</td>
                      <td><StatusPill status={sale.status} /></td>
                      <td><StatusPill status={paymentStatusOf(sale)} /></td>
                      <td>{formatMoney(sale.total)}</td>
                      <td>{formatMoney(sale.paid)}</td>
                      <td>{formatMoney(dueOf(sale))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={recentSales.length} total={filteredSales.length} />
          </Card>
          <Card
            title="Sales returns"
            printSection="sales-returns"
            action={<SectionPrintButton target="sales-returns" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Reference</th><th>Customer</th><th>Sale</th>
                    <th>Items</th><th>Reason</th><th>Resolution</th><th>Status</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReturns.map((item) => (
                    <tr key={item.id}>
                      <td>{formatReportDate(item.date)}</td>
                      <td>{item.reference}</td>
                      <td>{item.customer}</td>
                      <td>{item.saleReference}</td>
                      <td>{returnItemCount(item.items)}</td>
                      <td>{item.reason}</td>
                      <td>{item.resolution}</td>
                      <td><StatusPill status={item.status} /></td>
                      <td>{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={recentReturns.length} total={filteredSalesReturns.length} />
          </Card>
        </div>
      ) : null}

      {activeTab?.value === "purchases" ? (
        <div className="report-tab-content">
          <KpiGrid
            items={[
              { label: "Gross purchases", value: formatCompactMoney(totalPurchases), note: `${filteredPurchases.length} orders`, tone: "blue" },
              { label: "Supplier payments", value: formatCompactMoney(totalSupplierPaid), note: `${formatPercent(safeRatio(totalSupplierPaid, totalPurchases))} paid`, tone: "green" },
              { label: "Outstanding", value: formatCompactMoney(periodPayables), note: "On period purchases", tone: "orange" },
              { label: "Average purchase", value: formatCompactMoney(averagePurchase), note: "Spend per purchase", tone: "purple" },
              { label: "Purchase returns", value: formatCompactMoney(purchaseReturnTotal), note: `${formatPercent(safeRatio(purchaseReturnTotal, totalPurchases))} of purchases`, tone: "pink" },
              { label: "Net purchases", value: formatCompactMoney(netPurchases), note: "After valid returns", tone: "gray" },
            ]}
          />
          <div className="analytics-grid">
            <Card title="Purchase trend" className="report-chart-card">
              <ReportTrendChart data={trendData} showSales={false} showExpenses={false} />
            </Card>
            <Card title="Purchase status mix">
              <ReportDonutChart
                data={purchaseStatusRows.map((row) => ({
                  name: row.status,
                  value: row.value,
                  color: statusColors[row.status] ?? "#6864ed",
                }))}
              />
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Purchase status">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Status</th><th>Orders</th><th>Value</th><th>Share</th></tr></thead>
                  <tbody>
                    {purchaseStatusRows.map((row) => (
                      <tr key={row.status}>
                        <td><StatusPill status={row.status} /></td>
                        <td>{row.count}</td>
                        <td>{formatMoney(row.value)}</td>
                        <td>{formatPercent(row.share)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Spend by supplier">
              {topSupplierData.length > 0 ? <ReportTopBarChart data={topSupplierData} color="#25c7df" /> : <div className="report-empty">No purchases in period.</div>}
            </Card>
          </div>
          <Card
            title="Purchase register"
            printSection="purchase-register"
            action={<SectionPrintButton target="purchase-register" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Reference</th><th>Supplier</th><th>Buyer</th>
                    <th>Warehouse</th><th>Status</th><th>Total</th><th>Paid</th><th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>{formatReportDate(purchase.date)}</td>
                      <td>{purchase.reference}</td>
                      <td>{purchase.supplier}</td>
                      <td>{purchase.buyer}</td>
                      <td>{purchase.warehouse}</td>
                      <td><StatusPill status={purchase.status} /></td>
                      <td>{formatMoney(purchase.total)}</td>
                      <td>{formatMoney(purchase.paid)}</td>
                      <td>{formatMoney(Math.max(0, purchase.total - purchase.paid))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={recentPurchases.length} total={filteredPurchases.length} />
          </Card>
          <Card
            title="Purchase returns"
            printSection="purchase-returns"
            action={<SectionPrintButton target="purchase-returns" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Reference</th><th>Supplier</th><th>Purchase</th>
                    <th>Items</th><th>Reason</th><th>Resolution</th><th>Status</th><th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPurchaseReturns.map((item) => (
                    <tr key={item.id}>
                      <td>{formatReportDate(item.date)}</td>
                      <td>{item.reference}</td>
                      <td>{item.supplier}</td>
                      <td>{item.purchaseReference}</td>
                      <td>{returnItemCount(item.items)}</td>
                      <td>{item.reason}</td>
                      <td>{item.resolution}</td>
                      <td><StatusPill status={item.status} /></td>
                      <td>{formatMoney(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={recentPurchaseReturns.length} total={filteredPurchaseReturns.length} />
          </Card>
        </div>
      ) : null}

      {activeTab?.value === "inventory" ? (
        <div className="report-tab-content">
          <KpiGrid
            items={[
              { label: "Stock value at cost", value: formatCompactMoney(stockValue), note: `${productRows.length} SKUs`, tone: "purple" },
              { label: "Retail value", value: formatCompactMoney(retailValue), note: "At current selling prices", tone: "blue" },
              { label: "Potential margin", value: formatCompactMoney(retailValue - stockValue), note: `${formatPercent(safeRatio(retailValue - stockValue, retailValue))} of retail`, tone: "green" },
              { label: "Units on hand", value: stockUnits.toLocaleString("en-US"), note: "Across selected warehouses", tone: "gray" },
              { label: "Low stock", value: String(lowStockRows.length), note: "At or below reorder point", tone: "orange" },
              { label: "Out of stock", value: String(outOfStockRows.length), note: "Unavailable for sale", tone: "pink" },
            ]}
          />
          <div className="analytics-grid">
            <Card title="Stock value by category">
              {categoryStockData.length > 0 ? <ReportDonutChart data={categoryStockData} /> : <div className="report-empty">No stock in selection.</div>}
            </Card>
            <Card title="Inventory ratios">
              <div className="report-stat-list">
                <div><span>Inventory turnover</span><b>{inventoryTurnover.toFixed(2)}x</b></div>
                <div><span>Cost-to-retail ratio</span><b>{formatPercent(safeRatio(stockValue, retailValue))}</b></div>
                <div><span>Average margin</span><b>{formatPercent(safeRatio(retailValue - stockValue, retailValue))}</b></div>
                <div><span>Reorder alerts</span><b>{lowStockRows.length + outOfStockRows.length}</b></div>
                <div><span>Stock adjustments</span><b>{filteredAdjustments.length}</b></div>
              </div>
            </Card>
          </div>
          <Card
            title="Stock valuation"
            printSection="stock-valuation"
            action={<SectionPrintButton target="stock-valuation" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Code</th><th>Product</th><th>Category</th><th>Warehouse</th>
                    <th>On hand</th><th>Reorder</th><th>Status</th><th>Cost</th>
                    <th>Price</th><th>Margin</th><th>Stock value</th><th>Retail value</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((product) => (
                    <tr key={product.id}>
                      <td>{product.code}</td>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.warehouse}</td>
                      <td>{product.quantity} {product.unit}</td>
                      <td>{product.reorderPoint}</td>
                      <td><span className={`status-pill ${stockStatusClass(product.status)}`}>{product.status}</span></td>
                      <td>{formatMoney(product.cost)}</td>
                      <td>{formatMoney(product.price)}</td>
                      <td>{formatPercent(product.margin)}</td>
                      <td>{formatMoney(product.stockValue)}</td>
                      <td>{formatMoney(product.retailValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={productRows.length} total={products.length} />
          </Card>
          <div className="report-grid-two">
            <Card title="Reorder watchlist">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Product</th><th>Warehouse</th><th>On hand</th><th>Reorder</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...lowStockRows, ...outOfStockRows].slice(0, 12).map((product) => (
                      <tr key={`watch-${product.id}`}>
                        <td>{product.name}</td>
                        <td>{product.warehouse}</td>
                        <td>{product.quantity}</td>
                        <td>{product.reorderPoint}</td>
                        <td><span className={`status-pill ${stockStatusClass(product.status)}`}>{product.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Recent stock adjustments">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Date</th><th>Product</th><th>Warehouse</th><th>Qty</th><th>Reason</th></tr></thead>
                  <tbody>
                    {[...filteredAdjustments]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 12)
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{formatReportDate(item.date)}</td>
                          <td>{item.productName}</td>
                          <td>{item.warehouse}</td>
                          <td>{item.quantity > 0 ? `+${item.quantity}` : item.quantity}</td>
                          <td>{item.reason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <Card
            title="Inventory movement register"
            printSection="inventory-movements"
            action={<SectionPrintButton target="inventory-movements" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Product</th><th>Warehouse</th><th>Quantity</th><th>Note</th></tr></thead>
                <tbody>
                  {recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatReportDate(movement.date)}</td>
                      <td>{movement.type}</td>
                      <td>{movement.reference}</td>
                      <td>{movement.productName}</td>
                      <td>{movement.warehouse}</td>
                      <td>{movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}</td>
                      <td>{movement.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={recentMovements.length} total={recentMovements.length} />
          </Card>
        </div>
      ) : null}

      {activeTab?.value === "customers" ? (
        <div className="report-tab-content">
          <KpiGrid
            items={[
              { label: "Active customers", value: String(activeCustomers), note: `${newCustomers} added in period`, tone: "purple" },
              { label: "Customer revenue", value: formatCompactMoney(totalSales), note: `${filteredSales.length} orders`, tone: "green" },
              { label: "Average customer value", value: formatCompactMoney(safeRatio(totalSales, activeCustomers)), note: "Revenue per active customer", tone: "blue" },
              { label: "Closing receivables", value: formatCompactMoney(closingReceivables), note: `${formatCompactMoney(overdueReceivables)} overdue`, tone: "orange" },
              { label: "Over credit limit", value: String(overLimitCustomers), note: "Customers above limit", tone: "pink" },
              { label: "Top 5 concentration", value: formatPercent(revenueConcentration), note: "Share of period revenue", tone: "gray" },
            ]}
          />
          <div className="analytics-grid">
            <Card title="Top customers by revenue" className="report-chart-card">
              {topCustomerData.length > 0 ? <ReportTopBarChart data={topCustomerData} /> : <div className="report-empty">No customer revenue in period.</div>}
            </Card>
            <Card title="Receivables aging">
              <AgingSummary aging={arAging} />
              <div className="report-aging-total">
                <span>Closing receivable balance</span>
                <b>{formatMoney(closingReceivables)}</b>
              </div>
            </Card>
          </div>
          <Card
            title="Customer profitability and balances"
            printSection="customer-balances"
            action={<SectionPrintButton target="customer-balances" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th><th>Type</th><th>Orders</th><th>Revenue</th><th>Paid</th>
                    <th>Balance</th><th>Current</th><th>1-30</th><th>31-60</th>
                    <th>61-90</th><th>90+</th><th>Credit limit</th><th>Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}{row.overLimit ? <span className="report-inline-alert">Over limit</span> : null}</td>
                      <td>{row.type}</td>
                      <td>{row.orders}</td>
                      <td>{formatMoney(row.revenue)}</td>
                      <td>{formatMoney(row.paid)}</td>
                      <td>{formatMoney(agingTotal(row.aging))}</td>
                      <AgingCells aging={row.aging} />
                      <td>{formatMoney(row.creditLimit)}</td>
                      <td>{row.lastOrder ? formatReportDate(row.lastOrder) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={customerRows.length} total={customers.length} />
          </Card>
        </div>
      ) : null}

      {activeTab?.value === "suppliers" ? (
        <div className="report-tab-content">
          <KpiGrid
            items={[
              { label: "Active suppliers", value: String(supplierRows.filter((row) => row.orders > 0).length), note: `${suppliers.length} supplier records`, tone: "blue" },
              { label: "Supplier spend", value: formatCompactMoney(totalPurchases), note: `${filteredPurchases.length} purchase orders`, tone: "purple" },
              { label: "Average supplier value", value: formatCompactMoney(safeRatio(totalPurchases, supplierRows.filter((row) => row.orders > 0).length)), note: "Spend per active supplier", tone: "green" },
              { label: "Closing payables", value: formatCompactMoney(closingPayables), note: `${formatCompactMoney(overduePayables)} overdue`, tone: "orange" },
              { label: "Purchase returns", value: formatCompactMoney(purchaseReturnTotal), note: `${formatPercent(safeRatio(purchaseReturnTotal, totalPurchases))} of spend`, tone: "pink" },
              { label: "Top 5 concentration", value: formatPercent(safeRatio(sumBy(topSupplierData, (row) => row.value), totalPurchases)), note: "Share of purchase spend", tone: "gray" },
            ]}
          />
          <div className="analytics-grid">
            <Card title="Top suppliers by spend" className="report-chart-card">
              {topSupplierData.length > 0 ? <ReportTopBarChart data={topSupplierData} color="#25c7df" /> : <div className="report-empty">No supplier spend in period.</div>}
            </Card>
            <Card title="Payables aging">
              <AgingSummary aging={apAging} />
              <div className="report-aging-total">
                <span>Closing payable balance</span>
                <b>{formatMoney(closingPayables)}</b>
              </div>
            </Card>
          </div>
          <Card
            title="Supplier performance and balances"
            printSection="supplier-balances"
            action={<SectionPrintButton target="supplier-balances" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th><th>Category</th><th>Orders</th><th>Spend</th><th>Paid</th>
                    <th>Balance</th><th>Current</th><th>1-30</th><th>31-60</th>
                    <th>61-90</th><th>90+</th><th>Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.category}</td>
                      <td>{row.orders}</td>
                      <td>{formatMoney(row.spend)}</td>
                      <td>{formatMoney(row.paid)}</td>
                      <td>{formatMoney(agingTotal(row.aging))}</td>
                      <AgingCells aging={row.aging} />
                      <td>{row.lastOrder ? formatReportDate(row.lastOrder) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={supplierRows.length} total={suppliers.length} />
          </Card>
        </div>
      ) : null}

      {activeTab?.value === "finance" ? (
        <div className="report-tab-content">
          <KpiGrid
            items={[
              { label: "Net revenue", value: formatCompactMoney(netRevenue), note: "After sales returns", tone: "purple" },
              { label: "Gross profit", value: formatCompactMoney(grossProfit), note: `${formatPercent(grossMargin)} margin`, tone: "green" },
              { label: "Operating expenses", value: formatCompactMoney(expensesTotal), note: `${formatPercent(safeRatio(expensesTotal, netRevenue))} of revenue`, tone: "orange" },
              { label: "Net profit", value: formatCompactMoney(netProfit), note: `${formatPercent(netMargin)} margin`, tone: netProfit >= 0 ? "blue" : "pink" },
              { label: "Net cash flow", value: formatCompactMoney(netCashFlow), note: "Operating cash movement", tone: netCashFlow >= 0 ? "green" : "orange" },
              { label: "Break-even sales", value: formatCompactMoney(breakEvenSales), note: "Revenue needed to cover expenses", tone: "gray" },
            ]}
          />
          <div className="analytics-grid">
            <Card
              title="Profit and loss statement"
              className="report-statement-card"
              printSection="profit-loss"
              action={<SectionPrintButton target="profit-loss" onPrint={printSection} />}
            >
              <div className="table-scroll">
                <table className="report-statement">
                  <tbody>
                    <tr><td>Gross sales</td><td>{formatMoney(totalSales)}</td></tr>
                    <tr><td>Less sales returns</td><td>({formatMoney(salesReturnTotal)})</td></tr>
                    <tr className="report-statement-total"><td>Net sales</td><td>{formatMoney(netRevenue)}</td></tr>
                    <tr><td>{profitReport ? "Cost of goods sold (actual)" : "Cost of goods sold (estimated)"}</td><td>({formatMoney(cogs)})</td></tr>
                    <tr className="report-statement-total"><td>Gross profit</td><td>{formatMoney(grossProfit)}</td></tr>
                    <tr><td>Operating expenses</td><td>({formatMoney(expensesTotal)})</td></tr>
                    <tr className="report-statement-final"><td>Net operating profit</td><td>{formatMoney(netProfit)}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="report-statement-meta">
                <span>Gross margin <b>{formatPercent(grossMargin)}</b></span>
                <span>Net margin <b>{formatPercent(netMargin)}</b></span>
                <span>Expense ratio <b>{formatPercent(safeRatio(expensesTotal, netRevenue))}</b></span>
              </div>
            </Card>
            <Card title="Expenses by category">
              {expenseCategoryData.some((item) => item.value > 0) ? <ReportDonutChart data={expenseCategoryData} /> : <div className="report-empty">No expenses in period.</div>}
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Cash flow">
              <div className="report-stat-list">
                <div><span>Customer collections</span><b>{formatMoney(totalCollected)}</b></div>
                <div><span>Supplier payments</span><b>({formatMoney(totalSupplierPaid)})</b></div>
                <div><span>Expenses paid</span><b>({formatMoney(paidExpenses)})</b></div>
                <div><span>Customer refunds</span><b>({formatMoney(refundsSettled)})</b></div>
                <div className="report-stat-total"><span>Net cash flow</span><b>{formatMoney(netCashFlow)}</b></div>
              </div>
            </Card>
            <Card title="Payment method flow">
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Method</th><th>Received</th><th>Supplier paid</th><th>Expenses</th><th>Net</th></tr></thead>
                  <tbody>
                    {paymentMethodRows.map((row) => (
                      <tr key={row.method}>
                        <td>{row.method}</td>
                        <td>{formatMoney(row.received)}</td>
                        <td>{formatMoney(row.supplierPaid)}</td>
                        <td>{formatMoney(row.expensePaid)}</td>
                        <td>{formatMoney(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
          <div className="report-grid-two">
            <Card title="Receivables aging">
              <AgingSummary aging={arAging} />
              <div className="report-aging-total"><span>Total receivables</span><b>{formatMoney(closingReceivables)}</b></div>
            </Card>
            <Card title="Payables aging">
              <AgingSummary aging={apAging} />
              <div className="report-aging-total"><span>Total payables</span><b>{formatMoney(closingPayables)}</b></div>
            </Card>
          </div>
          <Card
            title="Expense register"
            printSection="expense-register"
            action={<SectionPrintButton target="expense-register" onPrint={printSection} />}
          >
            <div className="table-scroll">
              <table>
                <thead><tr><th>Date</th><th>Reference</th><th>Category</th><th>Vendor</th><th>Description</th><th>Method</th><th>Status</th><th>Amount</th></tr></thead>
                <tbody>
                  {[...filteredExpenses]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((expense) => (
                      <tr key={expense.id}>
                        <td>{formatReportDate(expense.date)}</td>
                        <td>{expense.reference}</td>
                        <td>{expense.category}</td>
                        <td>{expense.vendor}</td>
                        <td>{expense.description}</td>
                        <td>{expense.paymentMethod}</td>
                        <td><StatusPill status={expense.status} /></td>
                        <td>{formatMoney(expense.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <ReportFoot shown={filteredExpenses.length} total={filteredExpenses.length} />
          </Card>
          <p className="report-note">
            COGS is estimated from catalog costs because sales records do not contain line items.
            Opening customer and supplier balances are included in current aging. Expenses are
            company-wide and are not reduced by the warehouse filter.
          </p>
        </div>
      ) : null}
      </div>

      <footer className="report-footer">
        <span>Stocky business reports</span>
        <span>Generated {formatReportDate(today)}</span>
        <span>{formatReportRange(start, end)}</span>
      </footer>
    </div>
  );
}
