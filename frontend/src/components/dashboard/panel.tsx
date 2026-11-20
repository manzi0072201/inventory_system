import type { ReactNode } from "react";

type CardProps = {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  printSection?: string;
};

export function Card({ title, children, className = "", action, printSection }: CardProps) {
  return (
    <section className={`panel ${className}`} data-print-section={printSection}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

type LegendRowsProps = {
  data: { name: string; value: number; color: string }[];
};

export function LegendRows({ data }: LegendRowsProps) {
  return (
    <div className="legend-rows">
      {data.map((item) => (
        <div className="legend-row" key={item.name}>
          <span className="legend-dot" style={{ background: item.color }} />
          <span>{item.name}</span>
          <b>{item.value}%</b>
        </div>
      ))}
    </div>
  );
}
