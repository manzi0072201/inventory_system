"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { WarehouseForm } from "./warehouse-form";
import { useWarehouses } from "./warehouses-store";

export function EditWarehouse({ code }: { code: string }) {
  const router = useRouter();
  const { warehouses, hydrated } = useWarehouses();
  const warehouse = warehouses.find(
    (entry) => entry.code === code || entry.id === code,
  );

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading warehouse...</div>
        </section>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Inventory</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/warehouses")}
              >
                Warehouses
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Warehouse</span>
            </nav>
            <h1>Edit Warehouse</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No warehouse found with code <strong>{code}</strong>. It may have
              been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/warehouses")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Warehouses
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <WarehouseForm mode="edit" warehouse={warehouse} />;
}
