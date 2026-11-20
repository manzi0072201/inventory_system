import { saleCustomers } from "./sales-data";

export type CustomerType = "Individual" | "Business";

export type Customer = {
  id: string;
  name: string;
  type: CustomerType;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  taxNumber: string;
  openingBalance: number;
  creditLimit: number;
  createdAt: string;
};

export const customerTypes: CustomerType[] = ["Individual", "Business"];

export const customerCountries = [
  "Rwanda",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Burundi",
  "DR Congo",
  "Other",
];

export const seedCustomers: Customer[] = saleCustomers.map((name, index) => ({
  id: `CUS_${1001 + index}`,
  name,
  type: "Individual",
  email: "",
  phone: "",
  country: "Rwanda",
  city: "",
  address: "",
  taxNumber: "",
  openingBalance: 0,
  creditLimit: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
}));
