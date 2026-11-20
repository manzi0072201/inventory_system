import { notFound } from "next/navigation";
import { navItems } from "@/lib/navigation";
import { SectionPlaceholder } from "@/components/section-placeholder";

const sections = navItems.filter(
  (item) =>
    item.href !== "/" &&
    item.href !== "/products" &&
    item.href !== "/sales" &&
    item.href !== "/sales-return" &&
    item.href !== "/purchases" &&
    item.href !== "/purchase-return" &&
    item.href !== "/stock" &&
    item.href !== "/warehouses" &&
    item.href !== "/people" &&
    item.href !== "/suppliers" &&
    item.href !== "/debtors" &&
    item.href !== "/payments" &&
    item.href !== "/expenses" &&
    item.href !== "/settings" &&
    item.href !== "/user-management" &&
    item.href !== "/reports" &&
    item.href !== "/announcements" &&
    item.href !== "/audit-logs",
);

export function generateStaticParams() {
  return sections.map((item) => ({ section: item.href.slice(1) }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = sections.find((entry) => entry.href === `/${section}`);

  if (!item) {
    notFound();
  }

  return <SectionPlaceholder title={item.label} />;
}
