import type { IconName } from "@/components/ui/icon";

export type PaymentPoint = {
  date: string;
  sent: number;
  received: number;
};

export type MixEntry = {
  name: string;
  value: number;
  color: string;
};

export type MetricTone =
  | "purple"
  | "blue"
  | "orange"
  | "pink"
  | "gray"
  | "green";

export type Metric = {
  label: string;
  amount: string;
  icon: IconName;
  tone: MetricTone;
  note?: string;
  withCurrency?: boolean;
};

export type PaymentMethod = {
  method: string;
  amount: string;
  percent: number;
  icon: IconName;
};

export type StockAlert = {
  productName: string;
  code: string;
  warehouse: string;
  quantity: string;
  percent: number;
};

export type TopProduct = {
  name: string;
  amount: string;
  sold: string;
  percent: number;
};

export type SaleRow = {
  reference: string;
  customer: string;
  warehouse: string;
  status: string;
  total: string;
  paid: string;
  due: string;
  paymentStatus: string;
};
