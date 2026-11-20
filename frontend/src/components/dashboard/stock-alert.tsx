import { Icon } from "@/components/ui/icon";
import type { StockAlert as StockAlertRow } from "@/lib/dashboard-data";
import { Card } from "./panel";

export function StockAlert({ alerts }: { alerts: StockAlertRow[] }) {
  return (
    <Card
      title="Stock Alert"
      action={
        <a className="view-all" href="#stock-alerts">
          View all
        </a>
      }
    >
      {alerts.length === 0 ? (
        <div className="sale-empty-state">
          <span>No low-stock items in this warehouse.</span>
        </div>
      ) : (
        <div className="stock-alert-list">
          {alerts.map((item) => (
            <div className="alert-row" key={`${item.code}-${item.warehouse}`}>
              <div className="alert-icon">
                <Icon name="alert" className="w-[19px] h-[19px]" />
              </div>
              <div className="alert-main">
                <div className="alert-top">
                  <b>{item.productName}</b>
                  <strong>{item.quantity}</strong>
                </div>
                <small>
                  {item.code}　 ·　 {item.warehouse}
                </small>
                <div className="progress">
                  <i className="warning" style={{ width: `${item.percent}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
