"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { useAccess } from "@/components/access/access-provider";
import { useLanguage } from "@/components/language/language-provider";
import { useCustomers } from "@/components/customers/customers-store";
import { useProducts } from "@/components/products/products-store";
import { useSales } from "@/components/sales/sales-store";
import { navItems } from "@/lib/navigation";
import { formatMoney } from "@/lib/sales-data";
import { useGreeting } from "./greeting-bar";
import { Card } from "./panel";

export function AdminDashboard() {
  const { user, canPath, enabledPermissionCount } = useAccess();
  const { t } = useLanguage();
  const greeting = useGreeting();
  const { sales } = useSales();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");

  const lowStock = products.filter((product) => product.quantity <= 10).length;
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const outstanding = sales.reduce(
    (sum, sale) => sum + Math.max(0, sale.total - sale.paid),
    0,
  );
  const recent = [...sales]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const quickLinks = navItems
    .filter(
      (item) =>
        item.href !== "/" &&
        item.href !== "/announcements" &&
        canPath(item.href),
    )
    .slice(0, 8);

  return (
    <>
      <div className="page-heading" data-purpose="admin-dashboard-heading">
        <div>
          <h1>{greeting ? `${t(greeting)}, ${user.name}` : user.name}</h1>
          <p className="shop-zone-caption">
            {user.shopZone} · Shop admin workspace
          </p>
        </div>
        <div className="shop-zone-pill">
          <span>{enabledPermissionCount} modules enabled</span>
        </div>
      </div>

      {denied && (
        <div className="access-denied-banner" role="alert">
          <Icon name="alert" className="w-4 h-4" />
          <span>
            {denied === "super-admin"
              ? "Employees, credentials, and system settings are restricted to the super admin."
              : "That module is not included in your shop admin permissions."}
          </span>
        </div>
      )}

      <div className="metrics-grid admin-metrics">
        <div className="metric-card">
          <div className="metric-copy">
            <span className="metric-label">Shop sales</span>
            <strong>{formatMoney(totalSales)}</strong>
            <small>{sales.length} recorded transactions</small>
          </div>
          <div className="metric-icon purple">
            <Icon name="money" className="w-[22px] h-[22px]" />
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-copy">
            <span className="metric-label">Outstanding</span>
            <strong>{formatMoney(outstanding)}</strong>
            <small>Customer balances to follow up</small>
          </div>
          <div className="metric-icon orange">
            <Icon name="sales" className="w-[22px] h-[22px]" />
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-copy">
            <span className="metric-label">Low stock</span>
            <strong>{lowStock}</strong>
            <small>Products at or below 10 units</small>
          </div>
          <div className="metric-icon pink">
            <Icon name="alert" className="w-[22px] h-[22px]" />
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-copy">
            <span className="metric-label">Customers</span>
            <strong>{customers.length}</strong>
            <small>Active customer accounts</small>
          </div>
          <div className="metric-icon blue">
            <Icon name="people" className="w-[22px] h-[22px]" />
          </div>
        </div>
      </div>

      <div className="analytics-grid primary-analytics admin-dashboard-grid">
        <Card title="My workspace">
          <div className="admin-quick-links">
            {quickLinks.map((item) => (
              <Link href={item.href} key={item.href}>
                <span>{item.label}</span>
                <Icon name="arrowRight" className="w-[17px] h-[17px]" />
              </Link>
            ))}
            {quickLinks.length === 0 && (
              <p className="filter-hint">
                No operational modules are enabled for this account yet.
              </p>
            )}
          </div>
        </Card>
        <Card title="Access summary">
          <div className="admin-access-summary">
            <div>
              <span>Role</span>
              <strong>Shop Admin</strong>
            </div>
            <div>
              <span>Zone</span>
              <strong>{user.shopZone}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{user.status}</strong>
            </div>
            <div>
              <span>Last sign in</span>
              <strong>
                {user.lastLogin
                  ? new Date(user.lastLogin).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })
                  : "First session"}
              </strong>
            </div>
          </div>
          <p className="filter-hint">
            Your permissions are managed by the super admin from Employees &
            Roles.
          </p>
        </Card>
      </div>

      <Card title="Recent shop activity" className="recent-sales">
        {recent.length === 0 ? (
          <div className="sale-empty-state">
            <span>No recent sales.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.reference}</td>
                    <td>{sale.customer}</td>
                    <td>
                      <span className={`status-pill ${sale.status.toLowerCase()}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td>{formatMoney(sale.total)}</td>
                    <td>{formatMoney(sale.paid)}</td>
                    <td>{formatMoney(Math.max(0, sale.total - sale.paid))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
