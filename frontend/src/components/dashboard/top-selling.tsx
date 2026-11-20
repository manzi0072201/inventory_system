import type { TopProduct } from "@/lib/dashboard-data";
import { Card } from "./panel";

export function TopSelling({
  money,
  products,
}: {
  money: string;
  products: TopProduct[];
}) {
  return (
    <Card title="Top Selling Products">
      {products.length === 0 ? (
        <div className="sale-empty-state">
          <span>No product sales available in this range.</span>
        </div>
      ) : (
        <div className="top-products">
          {products.map((product, index) => (
            <div className="top-product" key={product.name}>
              <span className="rank">{index + 1}</span>
              <div className="top-product-info">
                <b>{product.name}</b>
                <div className="progress">
                  <i style={{ width: `${product.percent}%` }} />
                </div>
              </div>
              <div className="top-product-value">
                <b>
                  {money} {product.amount}
                </b>
                <small>{product.sold}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
