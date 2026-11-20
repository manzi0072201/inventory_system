"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SalesReturnForm } from "./sales-return-form";
import { useSalesReturns } from "./sales-returns-store";

export function EditSalesReturn({ reference }: { reference: string }) {
  const router = useRouter();
  const { salesReturns, hydrated } = useSalesReturns();
  const record = salesReturns.find(
    (entry) =>
      entry.id === reference || entry.reference === reference,
  );

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading sales return...</div>
        </section>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Sales</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/sales-return")}
              >
                Sales Returns
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Return</span>
            </nav>
            <h1>Edit Sales Return</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No sales return found with reference{" "}
              <strong>{reference}</strong>. It may have been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/sales-return")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Sales Returns
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <SalesReturnForm
      key={record.id}
      mode="edit"
      record={record}
    />
  );
}
