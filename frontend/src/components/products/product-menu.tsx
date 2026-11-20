"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export type MenuState = {
  id: string;
  top: number;
  right: number;
  flip: boolean;
};

type ProductMenuProps = {
  productId: string;
  menu: MenuState | null;
  onOpen: (id: string, button: HTMLElement) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
};

export function ProductMenu({
  productId,
  menu,
  onOpen,
  onClose,
  onDelete,
}: ProductMenuProps) {
  const router = useRouter();
  const open = menu?.id === productId;
  return (
    <div className="row-menu" data-menu-root>
      <button
        type="button"
        className="kebab-button"
        title="Product actions"
        aria-label="Product actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          if (open) {
            onClose();
          } else {
            onOpen(productId, event.currentTarget);
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
              router.push(`/products/${encodeURIComponent(productId)}`);
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
              router.push(`/products/${encodeURIComponent(productId)}/edit`);
            }}
          >
            <Icon name="edit" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => onDelete(productId)}
          >
            <Icon name="trash" className="w-3.5 h-3.5" strokeWidth={1.8} />
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
