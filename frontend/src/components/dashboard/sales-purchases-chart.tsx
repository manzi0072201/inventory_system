"use client";

import { ReportTrendChart } from "@/components/reports/report-charts";
import { Card } from "./panel";

export type DashboardTrendPoint = {
  label: string;
  fullLabel: string;
  sales: number;
  purchases: number;
  expenses: number;
};

export function SalesPurchasesChart({ data }: { data: DashboardTrendPoint[] }) {
  return (
    <Card title="Sales & Purchases" className="sales-chart-card">
      <ReportTrendChart data={data} showExpenses={false} />
    </Card>
  );
}
