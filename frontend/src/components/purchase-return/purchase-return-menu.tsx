"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";

type PurchaseReturnMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function PurchaseReturnMenu({
  open,
  onOpenChange,
  onView,
  onEdit,
  onDelete,
}: PurchaseReturnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div className="menu-container" ref={menuRef}>
      <button
        type="button"
        className="sale-menu-trigger"
        aria-label="Purchase return actions"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <Icon name="more" className="w-4 h-4" strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="sale-menu-dropdown" role="menu">
          <button type="button" role="menuitem" onClick={onView}>
            <Icon name="eye" className="w-4 h-4" strokeWidth={1.8} />
            View return
          </button>
          <button type="button" role="menuitem" onClick={onEdit}>
            <Icon name="edit" className="w-4 h-4" strokeWidth={1.8} />
            Edit return
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={onDelete}
          >
            <Icon name="trash" className="w-4 h-4" strokeWidth={1.8} />
            Delete return
          </button>
        </div>
      ) : null}
    </div>
  );
}
