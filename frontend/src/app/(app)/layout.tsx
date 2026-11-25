import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AccessProvider } from "@/components/access/access-provider";
import { InactivityLogout } from "@/components/auth/inactivity-logout";
import { AppShell } from "@/components/app-shell";
import { CustomersProvider } from "@/components/customers/customers-store";
import { ExpensesProvider } from "@/components/expenses/expenses-store";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { ProductsProvider } from "@/components/products/products-store";
import { PurchasesProvider } from "@/components/purchases/purchases-store";
import { PurchaseReturnsProvider } from "@/components/purchase-return/purchase-returns-store";
import { SalesProvider } from "@/components/sales/sales-store";
import { SettingsProvider } from "@/components/settings/settings-store";
import { SalesReturnsProvider } from "@/components/sales-return/sales-returns-store";
import { StockProvider } from "@/components/stock/stock-store";
import { SuppliersProvider } from "@/components/suppliers/suppliers-store";
import { WarehousesProvider } from "@/components/warehouses/warehouses-store";
import { getSessionUser } from "@/lib/api-auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AccessProvider user={user}>
      <SettingsProvider>
        <ProductsProvider>
          <CustomersProvider>
            <SuppliersProvider>
              <SalesProvider>
                <SalesReturnsProvider>
                  <PurchasesProvider>
                    <PurchaseReturnsProvider>
                      <ExpensesProvider>
                        <StockProvider>
                          <WarehousesProvider>
                            <NotificationsProvider>
                              <AppShell>
                                <InactivityLogout />
                                {children}
                              </AppShell>
                            </NotificationsProvider>
                          </WarehousesProvider>
                        </StockProvider>
                      </ExpensesProvider>
                    </PurchaseReturnsProvider>
                  </PurchasesProvider>
                </SalesReturnsProvider>
              </SalesProvider>
            </SuppliersProvider>
          </CustomersProvider>
        </ProductsProvider>
      </SettingsProvider>
    </AccessProvider>
  );
}
