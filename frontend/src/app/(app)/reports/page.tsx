import type { Metadata } from "next";
import { ReportsPage } from "@/components/reports/reports-page";

export const metadata: Metadata = {
  title: "Reports · VirtueVibe",
  description: "Business reporting for sales, purchases, inventory, customers, suppliers, and finance.",
};

export default function ReportsRoute() {
  return <ReportsPage />;
}
