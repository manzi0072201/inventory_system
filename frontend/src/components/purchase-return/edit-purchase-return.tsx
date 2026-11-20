"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { PurchaseReturnForm } from "./purchase-return-form";
import { usePurchaseReturns } from "./purchase-returns-store";

export function EditPurchaseReturn({ reference }: { reference: string }) {
  const router = useRouter();
  const { purchaseReturns, hydrated } = usePurchaseReturns();
  const record = purchaseReturns.find(
    (entry) =>
      entry.id === reference || entry.reference === reference,
  );

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading purchase return...</div>
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
              <span className="crumb-link">Purchasing</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/purchase-return")}
              >
                Purchase Returns
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Return</span>
            </nav>
            <h1>Edit Purchase Return</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No purchase return found with reference{" "}
              <strong>{reference}</strong>. It may have been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/purchase-return")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Purchase Returns
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <PurchaseReturnForm
      key={record.id}
      mode="edit"
      record={record}
    />
  );
}
