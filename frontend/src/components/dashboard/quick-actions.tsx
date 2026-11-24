"use client";

import { useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { Card } from "./panel";

const quickActions: Array<{ label: string; icon: IconName; href: string }> = [
  { label: "POS", icon: "grid", href: "/sales" },
  { label: "New sale", icon: "sales", href: "/sales/create" },
  { label: "New purchase", icon: "purchases", href: "/purchases/create" },
  { label: "Add product", icon: "stock", href: "/products/create" },
  { label: "Add customer", icon: "people", href: "/people/create" },
  { label: "Reports", icon: "analytics", href: "/reports" },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <Card title="Quick actions">
      <div className="quick-actions">
        {quickActions.map((action) => (
          <button
            type="button"
            key={action.label}
            onClick={() => router.push(action.href)}
          >
            <Icon name={action.icon} className="w-[19px] h-[19px]" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
