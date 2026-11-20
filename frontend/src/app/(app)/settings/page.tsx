import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = {
  title: "Settings | Stocky",
  description:
    "Configure company information, inventory rules, sales, finance, security, and workspace preferences.",
};

export default function SystemSettingsPage() {
  return <SettingsPage />;
}
