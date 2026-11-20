import { Icon } from "@/components/ui/icon";
import type { Metric } from "@/lib/dashboard-data";

export function KpiGrid({
  money,
  metrics,
}: {
  money: string;
  metrics: Metric[];
}) {
  if (metrics.length === 0) {
    return (
      <div className="sale-empty-state">
        <span>No KPI data available.</span>
      </div>
    );
  }

  return (
    <div className="metrics-grid">
      {metrics.map((metric) => (
        <div className="metric-card" key={metric.label}>
          <div className="metric-copy">
            <span className="metric-label">{metric.label}</span>
            <strong>
              {metric.withCurrency ? `${money} ${metric.amount}` : metric.amount}
            </strong>
            {metric.note && <small>{metric.note}</small>}
          </div>
          <div className={`metric-icon ${metric.tone}`}>
            <Icon name={metric.icon} className="w-[22px] h-[22px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
