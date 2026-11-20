"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  movementTypeClass,
  stockMovementTypes,
  type StockMovement,
} from "@/lib/stock-data";

type StockMovementsProps = {
  movements: StockMovement[];
  totalCount: number;
  movementType: string;
  onMovementType: (value: string) => void;
  onLoadMore: () => void;
  canLoadMore: boolean;
};

export function StockMovements({
  movements,
  totalCount,
  movementType,
  onMovementType,
  onLoadMore,
  canLoadMore,
}: StockMovementsProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Stock Movement History</h2>
        <select
          className="filter-select stock-movement-select"
          value={movementType}
          onChange={(event) => onMovementType(event.target.value)}
          aria-label="Filter movement type"
        >
          <option value="">All Movements</option>
          {stockMovementTypes.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>
      <div className="table-scroll">
        <table className="sales-table stock-movements-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Product</th>
              <th scope="col">Type</th>
              <th scope="col">Reference</th>
              <th scope="col">Warehouse</th>
              <th className="right-align" scope="col">
                Quantity
              </th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td className="sale-date">{movement.date}</td>
                <td>
                  <div className="stock-product-cell">
                    <strong>{movement.productName}</strong>
                    <span>{movement.productCode}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`movement-badge ${movementTypeClass(movement.type)}`}
                  >
                    {movement.type}
                  </span>
                </td>
                <td>
                  {movement.href ? (
                    <Link href={movement.href} className="sale-link">
                      {movement.reference}
                    </Link>
                  ) : (
                    <span className="sale-muted">{movement.reference}</span>
                  )}
                </td>
                <td>{movement.warehouse}</td>
                <td className="right-align">
                  <span
                    className={`movement-qty ${movement.quantity > 0 ? "positive" : "negative"}`}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr className="empty-row">
                <td colSpan={6}>No stock movements match your filters</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="stock-movements-footer">
        <span>
          Showing {movements.length.toLocaleString()} of{" "}
          {totalCount.toLocaleString()} movements
        </span>
        {canLoadMore ? (
          <button type="button" className="ghost-button" onClick={onLoadMore}>
            <Icon name="refresh" className="w-3.5 h-3.5" />
            Load More
          </button>
        ) : null}
      </div>
    </section>
  );
}
