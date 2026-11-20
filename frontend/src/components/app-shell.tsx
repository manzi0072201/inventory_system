"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./header";
import { Footer } from "./footer";
import { useSettings } from "./settings/settings-store";
import { useProducts } from "./products/products-store";
import { useCustomers } from "./customers/customers-store";
import { useSuppliers } from "./suppliers/suppliers-store";
import { useSales } from "./sales/sales-store";
import { useSalesReturns } from "./sales-return/sales-returns-store";
import { usePurchases } from "./purchases/purchases-store";
import { usePurchaseReturns } from "./purchase-return/purchase-returns-store";
import { useExpenses } from "./expenses/expenses-store";
import { useStockAdjustments } from "./stock/stock-store";
import { useWarehouses } from "./warehouses/warehouses-store";
import { useNotifications } from "./notifications/notifications-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const pathname = usePathname();

  const settings = useSettings();
  const products = useProducts();
  const customers = useCustomers();
  const suppliers = useSuppliers();
  const sales = useSales();
  const salesReturns = useSalesReturns();
  const purchases = usePurchases();
  const purchaseReturns = usePurchaseReturns();
  const expenses = useExpenses();
  const stock = useStockAdjustments();
  const warehouses = useWarehouses();
  const notifications = useNotifications();

  const stores = [
    settings,
    products,
    customers,
    suppliers,
    sales,
    salesReturns,
    purchases,
    purchaseReturns,
    expenses,
    stock,
    warehouses,
    notifications,
  ];

  const loading = stores.some((store) => !store.hydrated);
  const errors = Array.from(
    new Set(
      stores
        .map((store) => store.error)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!settings.hydrated) return;
    setSidebarHidden(settings.settings.sidebarCollapsed);
  }, [settings.hydrated, settings.settings.sidebarCollapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    if (!window.matchMedia("(max-width: 640px)").matches) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileOpen]);

  const handleToggleSidebar = () => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 641px)").matches
    ) {
      setSidebarHidden((hidden) => !hidden);
      return;
    }
    setMobileOpen(true);
  };

  const retry = () => {
    void Promise.all(stores.map((store) => store.reload())).catch(
      () => undefined,
    );
  };

  return (
    <div className={`app-shell ${sidebarHidden ? "sidebar-collapsed" : ""}`}>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-area">
        <Topbar onToggleSidebar={handleToggleSidebar} />
        <main className="dashboard-content">
          {loading && (
            <div className="sale-empty-state">
              <span>Loading workspace data…</span>
            </div>
          )}
          {errors.length > 0 && (
            <div className="user-error-banner">
              <span>{errors.join(" ")}</span>
              <button type="button" onClick={retry}>
                Retry
              </button>
            </div>
          )}
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}
