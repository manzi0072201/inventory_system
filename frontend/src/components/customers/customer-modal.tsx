"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import {
  customerCountries,
  customerTypes,
  type Customer,
  type CustomerType,
} from "@/lib/customers-data";

export type CustomerModalMode = "create" | "edit";

type CustomerModalProps = {
  mode?: CustomerModalMode;
  customer?: Customer | null;
  nextId?: string;
  onClose: () => void;
  onSave: (customer: Customer) => void;
};

export function CustomerModal({
  mode = "create",
  customer = null,
  nextId = "",
  onClose,
  onSave,
}: CustomerModalProps) {
  const [type, setType] = useState<CustomerType>(
    customer?.type ?? customerTypes[0],
  );
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [country, setCountry] = useState(
    customer?.country ?? customerCountries[0],
  );
  const [city, setCity] = useState(customer?.city ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [taxNumber, setTaxNumber] = useState(customer?.taxNumber ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    customer ? String(customer.openingBalance ?? 0) : "0",
  );
  const [creditLimit, setCreditLimit] = useState(
    customer ? String(customer.creditLimit ?? 0) : "0",
  );
  const [error, setError] = useState<string | null>(null);

  const title = mode === "edit" ? "Edit Customer" : "Add Customer";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (name.trim() === "") {
      setError("Customer name is required.");
      return;
    }
    if (email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    const openingValue = Number(openingBalance || 0);
    const creditValue = Number(creditLimit || 0);
    if (!Number.isFinite(openingValue) || openingValue < 0) {
      setError("Opening balance must be zero or greater.");
      return;
    }
    if (!Number.isFinite(creditValue) || creditValue < 0) {
      setError("Credit limit must be zero or greater.");
      return;
    }

    onSave({
      id: customer?.id ?? (nextId || `CUS_${Date.now()}`),
      name: name.trim(),
      type,
      email: email.trim(),
      phone: phone.trim(),
      country,
      city: city.trim(),
      address: address.trim(),
      taxNumber: taxNumber.trim(),
      openingBalance: openingValue,
      creditLimit: creditValue,
      createdAt: customer?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div
      className="modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="modal customer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="panel-heading">
          <h2 id="customer-modal-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="filter-field">
              <label htmlFor="customer-form-type">Customer Type</label>
              <select
                id="customer-form-type"
                className="filter-select"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as CustomerType)
                }
              >
                {customerTypes.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-name">
                Full Name / Company <span className="required-mark">*</span>
              </label>
              <input
                id="customer-form-name"
                className="filter-input"
                type="text"
                placeholder="e.g. Lucas Meyer"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-email">Email</label>
              <input
                id="customer-form-email"
                className="filter-input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-phone">Phone</label>
              <input
                id="customer-form-phone"
                className="filter-input"
                type="tel"
                placeholder="+250 788 000 000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-country">Country</label>
              <select
                id="customer-form-country"
                className="filter-select"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {customerCountries.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-city">City</label>
              <input
                id="customer-form-city"
                className="filter-input"
                type="text"
                placeholder="e.g. Kigali"
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>
            <div className="filter-field span-2">
              <label htmlFor="customer-form-address">Address</label>
              <textarea
                id="customer-form-address"
                className="filter-textarea"
                rows={2}
                placeholder="Street, building, or area"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-tax">Tax Number</label>
              <input
                id="customer-form-tax"
                className="filter-input"
                type="text"
                placeholder="e.g. TIN-123456"
                value={taxNumber}
                onChange={(event) => setTaxNumber(event.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-opening">Opening Balance</label>
              <input
                id="customer-form-opening"
                className="filter-input"
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(event) => {
                  setOpeningBalance(event.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="customer-form-credit">Credit Limit</label>
              <input
                id="customer-form-credit"
                className="filter-input"
                type="number"
                min="0"
                step="0.01"
                value={creditLimit}
                onChange={(event) => {
                  setCreditLimit(event.target.value);
                  setError(null);
                }}
              />
            </div>
            {error ? <p className="field-error span-2">{error}</p> : null}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            {mode === "edit" ? "Save Changes" : "Add Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
