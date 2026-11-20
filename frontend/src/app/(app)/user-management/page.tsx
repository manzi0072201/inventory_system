import type { Metadata } from "next";
import { EmployeesRoles } from "@/components/user-management/employees-roles";

export const metadata: Metadata = {
  title: "Employees & Roles - Stocky",
};

export default function UserManagementPage() {
  return <EmployeesRoles />;
}
