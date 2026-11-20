"use client";

import { ReportTopBarChart } from "@/components/reports/report-charts";
import { Card } from "./panel";

export function TopCustomersPie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <Card title="Top customers">
      <ReportTopBarChart data={data} color="#6864ed" />
    </Card>
  );
}
