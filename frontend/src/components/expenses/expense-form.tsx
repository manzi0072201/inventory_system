"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";
import { Icon } from "@/components/ui/icon";
import {
  expenseCategories,
  expenseStatuses,
  expenseStatusClass,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
} from "@/lib/expenses-data";
import {
  paymentMethods,
  type PaymentMethod,
} from "@/lib/payments-data";
import { formatMoney } from "@/lib/sales-data";
import {
  EXPENSE_CREATED_FLAG,
  EXPENSE_UPDATED_FLAG,
  useExpenses,
} from "./expenses-store";

export type ExpenseFormMode = "create" | "edit";

type FormState = {
  date: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  vendor: string;
  description: string;
  amount: string;
  paymentMethod: PaymentMethod;
  note: string;
};

type ExpenseFormProps = {
  mode: ExpenseFormMode;
  expense?: Expense;
};

function toForm(expense?: Expense): FormState {
  return {
    date: expense?.date ?? new Date().toISOString().slice(0, 10),
    category: expense?.category ?? "Other",
    status: expense?.status ?? "Paid",
    vendor: expense?.vendor ?? "",
    description: expense?.description ?? "",
    amount: expense ? String(expense.amount) : "",
    paymentMethod: expense?.paymentMethod ?? "Cash",
    note: expense?.note ?? "",
  };
}

export function ExpenseForm({ mode, expense }: ExpenseFormProps) {
  const router = useRouter();
  const { addExpense, updateExpense, nextReference } = useExpenses();
  const [form, setForm] = useState<FormState>(() => toForm(expense));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reference = expense?.reference ?? nextReference;
  const title = mode === "edit" ? "Edit Expense" : "Record Expense";

  const setField = <Key extends keyof FormState>(
    field: Key,
    value: FormState[Key],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const found: Record<string, string> = {};
    if (!form.date) {
      found.date = "Expense date is required.";
    }
    if (form.vendor.trim() === "") {
      found.vendor = "Payee or vendor is required.";
    }
    if (form.description.trim() === "") {
      found.description = "Description is required.";
    }
    const amountValue = Number(form.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      found.amount = "Amount must be greater than zero.";
    }
    return found;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = document.querySelector<HTMLElement>(".field-error");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    const changes: Omit<Expense, "id" | "reference" | "createdAt"> = {
      date: form.date,
      category: form.category,
      status: form.status,
      vendor: form.vendor.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod,
      note: form.note.trim() || undefined,
    };

    if (mode === "edit" && expense) {
      updateExpense(expense.id, changes);
      try {
        window.sessionStorage.setItem(EXPENSE_UPDATED_FLAG, expense.id);
      } catch {}
    } else {
      const newExpense: Expense = {
        id: reference,
        reference,
        ...changes,
        createdAt: new Date().toISOString(),
      };
      addExpense(newExpense);
      try {
        window.sessionStorage.setItem(EXPENSE_CREATED_FLAG, newExpense.id);
      } catch {}
    }

    router.push("/expenses");
  };

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
            <span className="crumb-current">{title}</span>
          </nav>
          <h1>{title}</h1>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={() => router.push("/expenses")}
          >
            Cancel
          </button>
          <button type="submit" form="expense-form" className="primary-button">
            <Icon
              name={mode === "edit" ? "check" : "plus"}
              className="w-3.5 h-3.5"
              strokeWidth={2.2}
            />
            {mode === "edit" ? "Save changes" : "Record expense"}
          </button>
        </div>
      </div>

      <form id="expense-form" onSubmit={submit} noValidate>
        <div className="create-layout">
          <div className="create-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Expense Details</h2>
              </div>
              <div className="panel-body form-body">
                <div className="form-grid">
                  <div className="filter-field">
                    <label>Reference</label>
                    <div className="detail-value">{reference}</div>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-date">
                      Date <span className="required-mark">*</span>
                    </label>
                    <DatePicker
                      id="expense-date"
                      value={form.date}
                      onChange={(value) => setField("date", value)}
                      allowClear={false}
                    />
                    {errors.date ? (
                      <p className="field-error">{errors.date}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-category">Category</label>
                    <select
                      id="expense-category"
                      className="filter-select"
                      value={form.category}
                      onChange={(event) =>
                        setField(
                          "category",
                          event.target.value as ExpenseCategory,
                        )
                      }
                    >
                      {expenseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-status">Status</label>
                    <select
                      id="expense-status"
                      className="filter-select"
                      value={form.status}
                      onChange={(event) =>
                        setField("status", event.target.value as ExpenseStatus)
                      }
                    >
                      {expenseStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-vendor">
                      Payee / Vendor <span className="required-mark">*</span>
                    </label>
                    <input
                      id="expense-vendor"
                      className={`filter-input${errors.vendor ? " invalid" : ""}`}
                      type="text"
                      placeholder="e.g. Kigali Business Park"
                      value={form.vendor}
                      onChange={(event) =>
                        setField("vendor", event.target.value)
                      }
                    />
                    {errors.vendor ? (
                      <p className="field-error">{errors.vendor}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-amount">
                      Amount <span className="required-mark">*</span>
                    </label>
                    <div className="input-suffix">
                      <input
                        id="expense-amount"
                        className={`filter-input${errors.amount ? " invalid" : ""}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={form.amount}
                        onChange={(event) =>
                          setField("amount", event.target.value)
                        }
                      />
                      <span>RWF</span>
                    </div>
                    {errors.amount ? (
                      <p className="field-error">{errors.amount}</p>
                    ) : null}
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-method">Payment Method</label>
                    <select
                      id="expense-method"
                      className="filter-select"
                      value={form.paymentMethod}
                      onChange={(event) =>
                        setField(
                          "paymentMethod",
                          event.target.value as PaymentMethod,
                        )
                      }
                    >
                      {paymentMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-field">
                    <label htmlFor="expense-description">
                      Description <span className="required-mark">*</span>
                    </label>
                    <input
                      id="expense-description"
                      className={`filter-input${errors.description ? " invalid" : ""}`}
                      type="text"
                      placeholder="What was this expense for?"
                      value={form.description}
                      onChange={(event) =>
                        setField("description", event.target.value)
                      }
                    />
                    {errors.description ? (
                      <p className="field-error">{errors.description}</p>
                    ) : null}
                  </div>
                  <div className="filter-field span-2">
                    <label htmlFor="expense-note">Note</label>
                    <textarea
                      id="expense-note"
                      className="filter-textarea"
                      rows={3}
                      placeholder="Optional internal note"
                      value={form.note}
                      onChange={(event) => setField("note", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="details-column">
            <section className="panel">
              <div className="panel-heading">
                <h2>Summary</h2>
              </div>
              <div className="panel-body">
                <div className="customer-form-profile">
                  <span className="customer-avatar">
                    <Icon
                      name="expenses"
                      className="w-4 h-4"
                      strokeWidth={1.8}
                    />
                  </span>
                  <div>
                    <strong>{form.vendor.trim() || "New expense"}</strong>
                    <span>{form.category}</span>
                  </div>
                </div>
                <div className="sale-summary-rows">
                  <div className="sale-summary-row">
                    <span>Reference</span>
                    <span>{reference}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Date</span>
                    <span>{form.date || "-"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Payee</span>
                    <span>{form.vendor.trim() || "-"}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Payment method</span>
                    <span>{form.paymentMethod}</span>
                  </div>
                  <div className="sale-summary-row">
                    <span>Status</span>
                    <span>
                      <span
                        className={`status-pill ${expenseStatusClass(form.status)}`}
                      >
                        {form.status}
                      </span>
                    </span>
                  </div>
                  <div className="sale-summary-row grand">
                    <span>Amount</span>
                    <span>{formatMoney(Number(form.amount) || 0)}</span>
                  </div>
                </div>
                <p className="warehouse-form-note">
                  Recorded expenses update the finance summaries and payment
                  mix immediately.
                </p>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
