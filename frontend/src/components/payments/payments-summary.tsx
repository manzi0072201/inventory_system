"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { formatMoney } from "@/lib/sales-data";
import { paymentMethods, type PaymentMethod } from "@/lib/payments-data";

type MethodTotal = {
  amount: number;
  count: number;
};

type PaymentsSummaryProps = {
  totals: Record<PaymentMethod, MethodTotal>;
};

const methodMeta: Record<
  PaymentMethod,
  {
    icon: IconName;
    tone: "purple" | "amber" | "red" | "green";
    image?: string;
  }
> = {
  "Bank Account": { icon: "bank", tone: "purple" },
  "MTN MoMo": { icon: "phone", tone: "amber", image: "/MTN.png" },
  "Airtel Money": { icon: "phone", tone: "red", image: "/Airtel.png" },
  Cash: { icon: "money", tone: "green" },
};

export function PaymentsSummary({ totals }: PaymentsSummaryProps) {
  return (
    <section className="stock-summary-grid" aria-label="Payments by method">
      {paymentMethods.map((method) => {
        const meta = methodMeta[method];
        const total = totals[method];
        return (
          <div className="sales-summary-card" key={method}>
            <div className={`sales-summary-icon ${meta.tone}`}>
              {meta.image ? (
                <img src={meta.image} alt={method} className="payment-method-logo" />
              ) : (
                <Icon name={meta.icon} className="w-5 h-5" strokeWidth={1.8} />
              )}
            </div>
            <div className="sales-summary-copy">
              <span>
                {method} ({total.count.toLocaleString()})
              </span>
              <strong>{formatMoney(total.amount)}</strong>
            </div>
          </div>
        );
      })}
    </section>
  );
}
