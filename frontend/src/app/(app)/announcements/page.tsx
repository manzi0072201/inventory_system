import type { Metadata } from "next";

import { AnnouncementsPage } from "@/components/announcements/announcements-page";

export const metadata: Metadata = {
  title: "Announcements | Kazi Inventory",
  description: "System notices, product updates, and shop-wide changes.",
};

export default function Page() {
  return <AnnouncementsPage />;
}
