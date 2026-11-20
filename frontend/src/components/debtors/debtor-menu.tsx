"use client";

import { Icon } from "@/components/ui/icon";

export type DebtorMenuState = {
  id: string;
  top: number;
  right: number;
  flip: boolean;
};

type DebtorMenuProps = {
  customerId: string;
  menu: DebtorMenuState | null;
  onOpen: (id: string, button: HTMLElement) => void;
  onClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
};

export function DebtorMenu({
  customerId,
  menu,
  onOpen,
  onClose,
  onView,
  onEdit,
}: DebtorMenuProps) {
  const open = menu?.id === customerId;
  return (
    <div className="row-menu" data-menu-root>
      <button
        type="button"
        className="kebab-button"
        title="Debtor actions"
        aria-label="Debtor actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            onClose();
          } else {
            onOpen(customerId, event.currentTarget);
          }
        }}
      >
        <Icon name="more" />
      </button>
      {open && menu ? (
        <div
          className={`row-menu-dropdown${menu.flip ? " flip" : ""}`}
          role="menu"
          style={{ top: menu.top, right: menu.right }}
        >
          <button
            type="button"
            role="menuitem"
            className="view"
            onClick={() => {
              onClose();
              onView(customerId);
            }}
          >
            <Icon name="eye" className="w-3.5 h-3.5" strokeWidth={1.8} />
            View customer
          </button>
          <button
            type="button"
            role="menuitem"
            className="edit"
            onClick={() => {
              onClose();
              onEdit(customerId);
            }}
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Edit customer
          </button>
        </div>
      ) : null}
    </div>
  );
}
