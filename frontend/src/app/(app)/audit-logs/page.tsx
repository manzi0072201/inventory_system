import type { Metadata } from "next";
import { AuditLogsPage } from "@/components/audit/audit-logs-page";

export const metadata: Metadata = {
  title: "Audit Logs · VirtueVibe",
  description: "Review audit history, changes, and exports.",
};

export default function AuditLogsRoute() {
  return <AuditLogsPage />;
}
