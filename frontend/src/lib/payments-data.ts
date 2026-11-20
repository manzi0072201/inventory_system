export type PaymentMethod =
  | "Bank Account"
  | "MTN MoMo"
  | "Airtel Money"
  | "Cash";

export type PaymentSource = "Sale" | "Purchase" | "Expense";

export const paymentMethods: PaymentMethod[] = [
  "Bank Account",
  "MTN MoMo",
  "Airtel Money",
  "Cash",
];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    (paymentMethods as string[]).includes(value)
  );
}

export function defaultPaymentMethod(reference: string): PaymentMethod {
  let hash = 0;
  for (let index = 0; index < reference.length; index += 1) {
    hash = (hash * 31 + reference.charCodeAt(index)) % 2147483647;
  }
  return paymentMethods[Math.abs(hash) % paymentMethods.length];
}

export function paymentMethodClass(method: PaymentMethod): string {
  return method.toLowerCase().replace(/\s+/g, "-");
}
