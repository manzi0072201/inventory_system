"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MixEntry } from "@/lib/dashboard-data";
import { Card, LegendRows } from "./panel";

export function TopSellingDonut({ data }: { data: MixEntry[] }) {
  return (
    <Card title="Top Selling Products" className="donut-card">
      {data.length === 0 ? (
        <div className="sale-empty-state">
          <span>No product sales available in this range.</span>
        </div>
      ) : (
        <div className="donut-layout">
          <div className="donut-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {data.map((product) => (
                    <Cell key={product.name} fill={product.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <LegendRows data={data} />
        </div>
      )}
    </Card>
  );
}
