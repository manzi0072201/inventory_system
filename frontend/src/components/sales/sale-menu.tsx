"use client";

import { Icon } from "@/components/ui/icon";

export type SaleMenuState = {
  id: string;
  top: number;
  right: number;
  flip: boolean;
};

type SaleMenuProps = {
  saleId: string;
  menu: SaleMenuState | null;
  onOpen: (id: string, button: HTMLElement) => void;
  onClose: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function SaleMenu({
  saleId,
  menu,
  onOpen,
  onClose,
  onView,
  onEdit,
  onDelete,
}: SaleMenuProps) {
  const open = menu?.id === saleId;
  return (
    <div className="row-menu" data-menu-root>
      <button
        type="button"
        className="kebab-button"
        title="Sale actions"
        aria-label="Sale actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            onClose();
          } else {
            onOpen(saleId, event.currentTarget);
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
              onView(saleId);
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
              onEdit(saleId);
            }}
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => onDelete(saleId)}
          >
            <Icon name="trash" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
