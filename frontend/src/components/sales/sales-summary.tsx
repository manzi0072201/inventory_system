import { Icon } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";

type SalesSummaryProps = {
  count: number;
  total: number;
  paid: number;
};

export function SalesSummary({ count, total, paid }: SalesSummaryProps) {
  return (
    <section className="sales-summary-grid" aria-label="Sales summary">
      <div className="sales-summary-card">
        <div className="sales-summary-icon purple">
          <Icon name="sales" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Sales</span>
          <strong>{count.toLocaleString("en-US")}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon blue">
          <Icon name="money" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Total</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>
      <div className="sales-summary-card">
        <div className="sales-summary-icon green">
          <Icon name="checkCircle" className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="sales-summary-copy">
          <span>Paid</span>
          <strong>{formatMoney(paid)}</strong>
        </div>
      </div>
    </section>
  );
}
