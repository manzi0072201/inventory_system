"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ExpenseForm } from "./expense-form";
import { useExpenses } from "./expenses-store";

export function EditExpense({ id }: { id: string }) {
  const router = useRouter();
  const { expenses, hydrated } = useExpenses();
  const expense = expenses.find(
    (entry) => entry.id === id || entry.reference === id,
  );

  if (!hydrated) {
    return (
      <div className="products-page">
        <section className="panel">
          <div className="panel-body">Loading expense...</div>
        </section>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="products-page">
        <div className="list-heading">
          <div>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span className="crumb-link">Finance</span>
              <span className="crumb-sep">/</span>
              <span
                className="crumb-link"
                onClick={() => router.push("/expenses")}
              >
                Expenses
              </span>
              <span className="crumb-sep">/</span>
              <span className="crumb-current">Edit Expense</span>
            </nav>
            <h1>Edit Expense</h1>
          </div>
        </div>
        <section className="panel">
          <div className="panel-body not-found-body">
            <p>
              No expense found with reference <strong>{id}</strong>. It may have
              been deleted.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => router.push("/expenses")}
            >
              <Icon name="arrowLeft" className="w-3.5 h-3.5" />
              Back to Expenses
            </button>
          </div>
        </section>
      </div>
    );
  }

  return <ExpenseForm mode="edit" expense={expense} />;
}
