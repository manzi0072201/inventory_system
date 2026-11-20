"use client";

import { Icon } from "@/components/ui/icon";

export type ExpenseMenuState = {
  id: string;
  top: number;
  right: number;
  flip: boolean;
};

type ExpenseMenuProps = {
  expenseId: string;
  menu: ExpenseMenuState | null;
  onOpen: (id: string, button: HTMLElement) => void;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ExpenseMenu({
  expenseId,
  menu,
  onOpen,
  onClose,
  onEdit,
  onDelete,
}: ExpenseMenuProps) {
  const open = menu?.id === expenseId;
  return (
    <div className="row-menu" data-menu-root>
      <button
        type="button"
        className="kebab-button"
        title="Expense actions"
        aria-label="Expense actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            onClose();
          } else {
            onOpen(expenseId, event.currentTarget);
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
            className="edit"
            onClick={() => {
              onClose();
              onEdit(expenseId);
            }}
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => onDelete(expenseId)}
          >
            <Icon name="trash" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
