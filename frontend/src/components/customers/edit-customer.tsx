"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { CustomerForm } from "./customer-form";
import { useCustomers } from "./customers-store";

export function EditCustomer({ id }: { id: string }) {
  const router = useRouter();
  const { customers, hydrated } = useCustomers();
  const customer = customers.find(
    (entry) => entry.id === id || entry.name === id,
  );

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading customer...</div>
        </section>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Customers</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/people")}
              >
                All Customers
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Customer</span>
            </nav>
            <h1>Edit Customer</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No customer found with ID <strong>{id}</strong>. It may have been
              deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/people")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Customers
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <CustomerForm mode="edit" customer={customer} />;
}
