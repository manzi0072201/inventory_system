"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAxisMoney, formatCompactMoney } from "@/lib/reporting";

const axisTick = { fontSize: 11, fill: "#858790" };
const gridStroke = "#ececf0";
const tooltipStyle = {
  border: "1px solid #ececf0",
  borderRadius: 10,
  boxShadow: "0 8px 24px rgba(24, 24, 32, 0.08)",
  fontSize: 12,
};

type TrendDatum = {
  label: string;
  fullLabel: string;
  sales: number;
  purchases: number;
  expenses: number;
};

type ProfitDatum = {
  label: string;
  fullLabel: string;
  grossProfit: number;
  netProfit: number;
};

export function ReportTrendChart({
  data,
  showSales = true,
  showPurchases = true,
  showExpenses = true,
}: {
  data: TrendDatum[];
  showSales?: boolean;
  showPurchases?: boolean;
  showExpenses?: boolean;
}) {
  return (
    <div className="chart-wrap report-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 8, left: 0, bottom: 2 }}
          barGap={4}
        >
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={formatAxisMoney}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as TrendDatum | undefined;
              return item?.fullLabel ?? "";
            }}
            formatter={(value, name) => [formatCompactMoney(Number(value)), name]}
          />
          {showSales ? (
            <Bar
              dataKey="sales"
              name="Sales"
              fill="#6864ed"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
          ) : null}
          {showPurchases ? (
            <Bar
              dataKey="purchases"
              name="Purchases"
              fill="#25c7df"
              radius={[5, 5, 0, 0]}
              maxBarSize={22}
            />
          ) : null}
          {showExpenses ? (
            <Line
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2, fill: "#f59e0b" }}
              activeDot={{ r: 4 }}
            />
          ) : null}
          <Legend
            verticalAlign="bottom"
            height={30}
            iconType="square"
            wrapperStyle={{ fontSize: 11, color: "#777b84" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportProfitChart({ data }: { data: ProfitDatum[] }) {
  return (
    <div className="chart-wrap report-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: 0, bottom: 2 }}
        >
          <defs>
            <linearGradient id="grossProfitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="netProfitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6864ed" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#6864ed" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={formatAxisMoney}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as ProfitDatum | undefined;
              return item?.fullLabel ?? "";
            }}
            formatter={(value, name) => [formatCompactMoney(Number(value)), name]}
          />
          <Area
            type="monotone"
            dataKey="grossProfit"
            name="Gross profit"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#grossProfitFill)"
          />
          <Area
            type="monotone"
            dataKey="netProfit"
            name="Net profit"
            stroke="#6864ed"
            strokeWidth={2}
            fill="url(#netProfitFill)"
          />
          <Legend
            verticalAlign="bottom"
            height={30}
            iconType="square"
            wrapperStyle={{ fontSize: 11, color: "#777b84" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export type DonutDatum = { name: string; value: number; color: string };

export function ReportDonutChart({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const visible = data.filter((item) => item.value > 0);

  return (
    <div className="report-donut">
      <div className="report-donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {visible.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => formatCompactMoney(Number(value))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="report-donut-total">
          <span>Total</span>
          <b>{formatCompactMoney(total)}</b>
        </div>
      </div>
      <div className="report-donut-legend">
        {data.map((item) => (
          <div className="report-donut-row" key={item.name}>
            <span className="legend-dot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <b>{total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportTopBarChart({
  data,
  color = "#6864ed",
}: {
  data: { name: string; value: number }[];
  color?: string;
}) {
  return (
    <div className="chart-wrap report-top-bar-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 18, left: 0, bottom: 4 }}
        >
          <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" horizontal={false} />
          <XAxis
            type="number"
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatAxisMoney}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#5f626b" }}
            axisLine={false}
            tickLine={false}
            width={124}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => formatCompactMoney(Number(value))}
            cursor={{ fill: "rgba(104, 100, 237, 0.06)" }}
          />
          <Bar dataKey="value" name="Value" fill={color} radius={[0, 5, 5, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
