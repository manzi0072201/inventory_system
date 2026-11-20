"use client";

import { Icon } from "@/components/ui/icon";

export type PurchaseMenuState = {
  id: string;
  top: number;
  right: number;
  flip: boolean;
};

type PurchaseMenuProps = {
  purchaseId: string;
  menu: PurchaseMenuState | null;
  onOpen: (id: string, button: HTMLElement) => void;
  onClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function PurchaseMenu({
  purchaseId,
  menu,
  onOpen,
  onClose,
  onView,
  onEdit,
  onDelete,
}: PurchaseMenuProps) {
  const open = menu?.id === purchaseId;
  return (
    <div className="row-menu" data-menu-root>
      <button
        type="button"
        className="kebab-button"
        title="Purchase actions"
        aria-label="Purchase actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            onClose();
          } else {
            onOpen(purchaseId, event.currentTarget);
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
              onView(purchaseId);
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
              onEdit(purchaseId);
            }}
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => onDelete(purchaseId)}
          >
            <Icon name="trash" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
