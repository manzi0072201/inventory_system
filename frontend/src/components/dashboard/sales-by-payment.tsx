import { Icon } from "@/components/ui/icon";
import type { PaymentMethod as DashboardPaymentMethod } from "@/lib/dashboard-data";
import { Card } from "./panel";

export function SalesByPayment({
  money,
  methods,
}: {
  money: string;
  methods: DashboardPaymentMethod[];
}) {
  return (
    <Card title="Sales by Payment">
      {methods.length === 0 ? (
        <div className="sale-empty-state">
          <span>No payment methods recorded in this range.</span>
        </div>
      ) : (
        <div className="payment-list">
          {methods.map((method) => (
            <div className="payment-item" key={method.method}>
              <div className="payment-icon">
                <Icon name={method.icon} className="w-[18px] h-[18px]" />
              </div>
              <div className="payment-info">
                <div>
                  <span>{method.method}</span>
                  <b>
                    {money} {method.amount}
                  </b>
                  <small>{method.percent}%</small>
                </div>
                <div className="progress">
                  <i style={{ width: `${method.percent}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
