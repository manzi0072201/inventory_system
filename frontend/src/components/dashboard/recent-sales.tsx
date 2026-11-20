import type { SaleRow } from "@/lib/dashboard-data";
import { Card } from "./panel";

export function RecentSales({
  money,
  sales,
}: {
  money: string;
  sales: SaleRow[];
}) {
  return (
    <Card
      title="Recent Sales"
      className="recent-sales"
      action={
        <a className="view-all" href="#recent-sales">
          View all
        </a>
      }
    >
      {sales.length === 0 ? (
        <div className="sale-empty-state">
          <span>No sales recorded in this range.</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.reference}>
                  <td>{sale.reference}</td>
                  <td>{sale.customer}</td>
                  <td>{sale.warehouse}</td>
                  <td>
                    <span className="status-complete">{sale.status}</span>
                  </td>
                  <td>
                    {money} {sale.total}
                  </td>
                  <td>
                    {money} {sale.paid}
                  </td>
                  <td>
                    {money} {sale.due}
                  </td>
                  <td>
                    <span
                      className={
                        sale.paymentStatus === "Paid" ? "status-paid" : "status-partial"
                      }
                    >
                      {sale.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <span>‹</span>
        <b>1</b>
        <span>›</span>
      </div>
    </Card>
  );
}
