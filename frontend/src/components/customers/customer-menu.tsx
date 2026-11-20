"use client";

import { Icon } from "@/components/ui/icon";

export type CustomerMenuState = {
  id: string;
  top: number;
  right: number;
  flip: boolean;
};

type CustomerMenuProps = {
  customerId: string;
  menu: CustomerMenuState | null;
  onOpen: (id: string, button: HTMLElement) => void;
  onClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function CustomerMenu({
  customerId,
  menu,
  onOpen,
  onClose,
  onView,
  onEdit,
  onDelete,
}: CustomerMenuProps) {
  const open = menu?.id === customerId;
  return (
    <div className="row-menu" data-menu-root>
      <button
        type="button"
        className="kebab-button"
        title="Customer actions"
        aria-label="Customer actions"
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
            View
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
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => onDelete(customerId)}
          >
            <Icon name="trash" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
