"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccess } from "@/components/access/access-provider";
import type { IconName } from "@/components/ui/icon";
import { usePurchaseReturns } from "@/components/purchase-return/purchase-returns-store";
import { usePurchases } from "@/components/purchases/purchases-store";
import { useSalesReturns } from "@/components/sales-return/sales-returns-store";
import { useSales } from "@/components/sales/sales-store";
import { useWarehouses } from "@/components/warehouses/warehouses-store";
import { api } from "@/lib/api";
import type { BackendSaleItem, BackendStockRow } from "@/lib/api-types";
import type {
  Metric,
  MixEntry,
  PaymentMethod as DashboardPaymentMethod,
  PaymentPoint,
  SaleRow,
  StockAlert,
  TopProduct,
} from "@/lib/dashboard-data";
import {
  groupSum,
  makeDateBuckets,
  shiftIsoDays,
  sumBy,
  todayIso,
  trendFullLabelFor,
  trendKeyFor,
  trendLabelFor,
} from "@/lib/reporting";
import { dueOf, paymentStatusOf } from "@/lib/sales-data";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { GreetingBar, type DashboardPreset } from "@/components/dashboard/greeting-bar";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { SalesPurchasesChart } from "@/components/dashboard/sales-purchases-chart";
import { TopSellingDonut } from "@/components/dashboard/top-selling-donut";
import { PaymentSentReceivedChart } from "@/components/dashboard/payment-sent-received-chart";
import { TopCustomersPie } from "@/components/dashboard/top-customers-pie";
import { SalesByPayment } from "@/components/dashboard/sales-by-payment";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StockAlert as StockAlertCard } from "@/components/dashboard/stock-alert";
import { TopSelling } from "@/components/dashboard/top-selling";
import { RecentSales } from "@/components/dashboard/recent-sales";

const MIX_COLORS = ["#6665e8", "#22c7df", "#f59e0b", "#ec4899", "#10b981"];

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function paymentIcon(method: string): IconName {
  const value = method.toLowerCase();
  if (value.includes("cash") || value.includes("momo") || value.includes("airtel")) {
    return "wallet";
  }
  if (value.includes("bank") || value.includes("card")) {
    return "card";
  }
  return "money";
}

export default function DashboardPage() {
  const { isSuperAdmin } = useAccess();
  return isSuperAdmin ? <SuperAdminDashboard /> : <AdminDashboard />;
}

function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAccess();
  const { sales } = useSales();
  const { salesReturns } = useSalesReturns();
  const { purchases } = usePurchases();
  const { purchaseReturns } = usePurchaseReturns();
  const { warehouses } = useWarehouses();

  const [range, setRange] = useState<DashboardPreset>("7d");
  const [start, setStart] = useState(() => shiftIsoDays(todayIso(), -6));
  const [end, setEnd] = useState(() => todayIso());
  const [warehouse, setWarehouse] = useState("All warehouses");
  const [currency, setCurrency] = useState("RWF");
  const [refreshed, setRefreshed] = useState(false);
  const [stockRows, setStockRows] = useState<BackendStockRow[]>([]);
  const [saleItemRows, setSaleItemRows] = useState<BackendSaleItem[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const money = currency === "USD" ? "$" : currency === "EUR" ? "€" : "Frw";

  const warehouseOptions = useMemo(() => {
    const names = new Set<string>();
    warehouses.forEach((item) => names.add(item.name));
    sales.forEach((sale) => names.add(sale.warehouse));
    purchases.forEach((purchase) => names.add(purchase.warehouse));
    return ["All warehouses", ...Array.from(names).sort()];
  }, [warehouses, sales, purchases]);

  const inRange = (value: string) => value >= start && value <= end;
  const matchesWarehouse = (value: string) =>
    warehouse === "All warehouses" || value === warehouse;

  const filteredSales = useMemo(
    () => sales.filter((sale) => inRange(sale.date) && matchesWarehouse(sale.warehouse)),
    [sales, start, end, warehouse],
  );
  const filteredPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) => inRange(purchase.date) && matchesWarehouse(purchase.warehouse),
      ),
    [purchases, start, end, warehouse],
  );
  const validSalesReturns = useMemo(
    () =>
      salesReturns.filter(
        (item) =>
          item.status !== "Rejected" &&
          inRange(item.date) &&
          matchesWarehouse(item.warehouse),
      ),
    [salesReturns, start, end, warehouse],
  );
  const validPurchaseReturns = useMemo(
    () =>
      purchaseReturns.filter(
        (item) =>
          item.status !== "Rejected" &&
          inRange(item.date) &&
          matchesWarehouse(item.warehouse),
      ),
    [purchaseReturns, start, end, warehouse],
  );

  useEffect(() => {
    let active = true;

    async function loadDashboardDetails() {
      setDashboardError(null);
      try {
        const [stockResult, saleDetails] = await Promise.all([
          api.stock(),
          Promise.all(
            filteredSales.slice(0, 30).map((sale) =>
              api
                .sale(sale.id)
                .then((detail) => detail.items)
                .catch(() => [] as BackendSaleItem[]),
            ),
          ),
        ]);
        if (!active) return;
        setStockRows(stockResult.items);
        setSaleItemRows(saleDetails.flat());
      } catch (cause) {
        if (!active) return;
        setDashboardError(
          cause instanceof Error ? cause.message : "Unable to load dashboard data.",
        );
      }
    }

    void loadDashboardDetails();
    return () => {
      active = false;
    };
  }, [filteredSales]);

  const trendData = useMemo(() => {
    const buckets = makeDateBuckets(start, end);
    const series = new Map(
      buckets.map((bucket) => [
        bucket.key,
        {
          key: bucket.key,
          sales: 0,
          purchases: 0,
          sent: 0,
          received: 0,
        },
      ]),
    );
    const entryFor = (date: string) => series.get(trendKeyFor(date, start, end));

    filteredSales.forEach((sale) => {
      const entry = entryFor(sale.date);
      if (entry) {
        entry.sales += sale.total;
        entry.received += sale.paid;
      }
    });
    validSalesReturns.forEach((item) => {
      const entry = entryFor(item.date);
      if (entry) entry.sales -= item.amount;
    });
    filteredPurchases.forEach((purchase) => {
      const entry = entryFor(purchase.date);
      if (entry) {
        entry.purchases += purchase.total;
        entry.sent += purchase.paid;
      }
    });
    validPurchaseReturns.forEach((item) => {
      const entry = entryFor(item.date);
      if (entry) entry.purchases -= item.amount;
    });

    return Array.from(series.values()).map((entry) => ({
      label: trendLabelFor(entry.key, start, end),
      fullLabel: trendFullLabelFor(entry.key, start, end),
      sales: entry.sales,
      purchases: entry.purchases,
      expenses: 0,
      sent: entry.sent,
      received: entry.received,
    }));
  }, [
    start,
    end,
    filteredSales,
    filteredPurchases,
    validSalesReturns,
    validPurchaseReturns,
  ]);

  const paymentFlows = useMemo<PaymentPoint[]>(
    () =>
      trendData.map((point) => ({
        date: point.label,
        sent: point.sent,
        received: point.received,
      })),
    [trendData],
  );

  const topCustomersData = useMemo(() => {
    const totals = groupSum(
      filteredSales,
      (sale) => sale.customer || "Walk-in customer",
      (sale) => sale.total,
    );
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredSales]);

  const salesTotal = sumBy(filteredSales, (sale) => sale.total);
  const purchasesTotal = sumBy(filteredPurchases, (purchase) => purchase.total);
  const salesReturnsTotal = sumBy(validSalesReturns, (item) => item.amount);
  const purchaseReturnsTotal = sumBy(validPurchaseReturns, (item) => item.amount);

  const metrics = useMemo<Metric[]>(
    () => [
      {
        label: "Sales",
        amount: formatAmount(salesTotal),
        icon: "money",
        tone: "purple",
        note: `${filteredSales.length} sales in range`,
        withCurrency: true,
      },
      {
        label: "Purchases",
        amount: formatAmount(purchasesTotal),
        icon: "stock",
        tone: "blue",
        note: `${filteredPurchases.length} purchase orders`,
        withCurrency: true,
      },
      {
        label: "Sales Return",
        amount: formatAmount(salesReturnsTotal),
        icon: "salesReturn",
        tone: "orange",
        note: `${validSalesReturns.length} items returned`,
        withCurrency: true,
      },
      {
        label: "Purchases Return",
        amount: formatAmount(purchaseReturnsTotal),
        icon: "purchaseReturn",
        tone: "gray",
        note: `${validPurchaseReturns.length} claims recorded`,
        withCurrency: true,
      },
      {
        label: "Profit",
        amount: formatAmount(
          salesTotal -
            salesReturnsTotal -
            purchasesTotal +
            purchaseReturnsTotal,
        ),
        icon: "trend",
        tone: "green",
        note: "Net operating profit",
        withCurrency: true,
      },
    ],
    [
      salesTotal,
      purchasesTotal,
      salesReturnsTotal,
      purchaseReturnsTotal,
      filteredSales.length,
      filteredPurchases.length,
      validSalesReturns.length,
      validPurchaseReturns.length,
    ],
  );

  const paymentMethods = useMemo<DashboardPaymentMethod[]>(() => {
    const totals = groupSum(
      filteredSales,
      (sale) => sale.paymentMethod,
      (sale) => sale.total,
    );
    return Object.entries(totals)
      .map(([method, amount]) => ({
        method,
        amount: formatAmount(amount),
        percent: salesTotal > 0 ? Math.round((amount / salesTotal) * 100) : 0,
        icon: paymentIcon(method),
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [filteredSales, salesTotal]);

  const productTotals = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; amount: number }>();
    saleItemRows.forEach((item) => {
      const entry = totals.get(item.name) ?? {
        name: item.name,
        quantity: 0,
        amount: 0,
      };
      entry.quantity += item.quantity;
      entry.amount += item.lineTotal;
      totals.set(item.name, entry);
    });
    return Array.from(totals.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [saleItemRows]);

  const productMix = useMemo<MixEntry[]>(() => {
    const totalQuantity = productTotals.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    return productTotals.map((item, index) => ({
      name: item.name,
      value:
        totalQuantity > 0
          ? Math.round((item.quantity / totalQuantity) * 1000) / 10
          : 0,
      color: MIX_COLORS[index % MIX_COLORS.length],
    }));
  }, [productTotals]);

  const topProducts = useMemo<TopProduct[]>(() => {
    const maxAmount = productTotals[0]?.amount ?? 0;
    return productTotals.map((item) => ({
      name: item.name,
      amount: formatAmount(item.amount),
      sold: `${item.quantity} Sold`,
      percent: maxAmount > 0 ? Math.round((item.amount / maxAmount) * 100) : 0,
    }));
  }, [productTotals]);

  const stockAlerts = useMemo<StockAlert[]>(
    () =>
      stockRows
        .filter(
          (row) =>
            row.reorderPoint > 0 &&
            row.quantityOnHand <= row.reorderPoint &&
            matchesWarehouse(row.warehouseName),
        )
        .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
        .slice(0, 5)
        .map((row) => ({
          productName: row.productName,
          code: row.productCode,
          warehouse: row.warehouseName,
          quantity: `${row.quantityOnHand} / ${row.reorderPoint}`,
          percent: Math.min(
            100,
            Math.round((row.quantityOnHand / row.reorderPoint) * 100),
          ),
        })),
    [stockRows, warehouse],
  );

  const recentSales = useMemo<SaleRow[]>(
    () =>
      [...filteredSales]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((sale) => ({
          reference: sale.reference,
          customer: sale.customer,
          warehouse: sale.warehouse,
          status: sale.status,
          total: formatAmount(sale.total),
          paid: formatAmount(sale.paid),
          due: formatAmount(dueOf(sale)),
          paymentStatus: paymentStatusOf(sale),
        })),
    [filteredSales],
  );

  function applyPreset(next: DashboardPreset) {
    const current = todayIso();
    setRange(next);
    setEnd(current);
    if (next === "today") setStart(current);
    if (next === "7d") setStart(shiftIsoDays(current, -6));
    if (next === "30d") setStart(shiftIsoDays(current, -29));
    if (next === "mtd") setStart(`${current.slice(0, 7)}-01`);
    if (next === "ytd") setStart(`${current.slice(0, 4)}-01-01`);
  }

  function changeStart(value: string) {
    setRange("custom");
    setStart(value);
    if (value > end) setEnd(value);
  }

  function changeEnd(value: string) {
    setRange("custom");
    setEnd(value);
    if (value < start) setStart(value);
  }

  const refresh = () => {
    setRefreshed(true);
    router.refresh();
    window.setTimeout(() => setRefreshed(false), 1300);
  };

  return (
    <>
      <GreetingBar
        name={user.name}
        range={range}
        onRangeChange={applyPreset}
        start={start}
        end={end}
        onStartChange={changeStart}
        onEndChange={changeEnd}
        warehouse={warehouse}
        warehouseOptions={warehouseOptions}
        onWarehouseChange={setWarehouse}
        currency={currency}
        onCurrencyChange={setCurrency}
        refreshed={refreshed}
        onRefresh={refresh}
      />

      {dashboardError && (
        <div className="user-error-banner">
          <span>{dashboardError}</span>
        </div>
      )}

      <KpiGrid money={money} metrics={metrics} />

      <div className="analytics-grid primary-analytics">
        <SalesPurchasesChart data={trendData} />
        <TopSellingDonut data={productMix} />
      </div>

      <div className="analytics-grid secondary-analytics">
        <PaymentSentReceivedChart data={paymentFlows} />
        <TopCustomersPie data={topCustomersData} />
      </div>

      <div className="analytics-grid lower-analytics">
        <SalesByPayment money={money} methods={paymentMethods} />
        <div className="right-stack">
          <QuickActions />
        </div>
      </div>

      <div className="analytics-grid bottom-analytics">
        <StockAlertCard alerts={stockAlerts} />
        <TopSelling money={money} products={topProducts} />
      </div>

      <RecentSales money={money} sales={recentSales} />
    </>
  );
}
