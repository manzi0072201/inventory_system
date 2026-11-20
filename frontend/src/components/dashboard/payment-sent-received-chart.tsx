"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaymentPoint } from "@/lib/dashboard-data";
import { Card } from "./panel";

export function PaymentSentReceivedChart({ data }: { data: PaymentPoint[] }) {
  return (
    <Card title="Payment Sent & Received">
      {data.length === 0 ? (
        <div className="sale-empty-state">
          <span>No payment activity in this range.</span>
        </div>
      ) : (
        <div className="chart-wrap area-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 12, right: 8, left: 0, bottom: 2 }}
            >
              <defs>
                <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb4568" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#fb4568" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#ececf0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#858790" }}
                axisLine={false}
                tickLine={false}
                dy={7}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#858790" }}
                axisLine={false}
                tickLine={false}
                width={45}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="sent"
                name="Sent"
                stroke="#fb4568"
                strokeWidth={2.5}
                fill="url(#sentFill)"
              />
              <Area
                type="monotone"
                dataKey="received"
                name="Received"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#receivedFill)"
              />
              <Legend verticalAlign="bottom" height={27} wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
