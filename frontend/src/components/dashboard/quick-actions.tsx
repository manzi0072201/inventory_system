import { Icon, type IconName } from "@/components/ui/icon";
import { Card } from "./panel";

const quickActions: Array<{ label: string; icon: IconName }> = [
  { label: "POS", icon: "grid" },
  { label: "New sale", icon: "sales" },
  { label: "New purchase", icon: "purchases" },
  { label: "Add product", icon: "stock" },
  { label: "Add customer", icon: "people" },
  { label: "Reports", icon: "analytics" },
];

export function QuickActions() {
  return (
    <Card title="Quick actions">
      <div className="quick-actions">
        {quickActions.map((action) => (
          <button type="button" key={action.label}>
            <Icon name={action.icon} className="w-[19px] h-[19px]" />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
