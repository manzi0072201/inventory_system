"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@/lib/navigation";
import { Icon } from "./ui/icon";
import { useSettings } from "./settings/settings-store";
import { useAccess } from "./access/access-provider";

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { settings } = useSettings();
  const { canPath } = useAccess();
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canPath(item.href)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}
      data-purpose="sidebar-navigation"
    >
      <div className="brand">
        <div className={`brand-mark ${settings.logoUrl ? "has-logo" : ""}`}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Company logo" />
          ) : (
            <Icon name="stock" className="w-[21px] h-[21px]" strokeWidth={2.5} />
          )}
        </div>
        <div>
          <b>ITG Inventory</b>
          <small>ProBuild Ltd</small>
        </div>
        <button
          type="button"
          className="icon-button sidebar-close"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <Icon name="close" className="w-[18px] h-[18px]" />
        </button>
      </div>

      <nav className="side-nav">
        {visibleGroups.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-heading">{group.title}</div>
            {group.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`nav-link ${active ? "active" : ""}`}
                >
                  <Icon name={item.icon} className="w-[17px] h-[17px]" />
                  <span>{item.label}</span>
                  {item.label !== "Dashboard" ? (
                    <Icon
                      name="chevronDown"
                      className="nav-chevron w-3.5 h-3.5"
                    />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span>v5.9 Core ERP</span>
        <span className="server-status">
          <i /> Kigali Server
        </span>
        <small>Currency: RWF (Frw)</small>
      </div>
    </aside>
  );
}
