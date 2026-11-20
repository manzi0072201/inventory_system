"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SupplierForm } from "./supplier-form";
import { useSuppliers } from "./suppliers-store";

export function EditSupplier({ id }: { id: string }) {
  const router = useRouter();
  const { suppliers, hydrated } = useSuppliers();
  const supplier = suppliers.find((entry) => entry.id === id || entry.name === id);

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel"><div className="panel-body">Loading supplier...</div></section>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Suppliers</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-link" onClick={() => router.push("/suppliers")}>All Suppliers</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Supplier</span>
            </nav>
            <h1>Edit Supplier</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>No supplier found with ID <strong>{id}</strong>. It may have been deleted.</p>
            <button type="button" className="primary-button" onClick={() => router.push("/suppliers")}>
              <Icon name="arrowLeft" className="w-3.5 h-3.5" /> Back to Suppliers
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <SupplierForm mode="edit" supplier={supplier} />;
}
