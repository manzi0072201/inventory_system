import { toDateOnlyString, toIsoString } from "@/lib/date-range";

export type PaymentRow = {
  id: string;
  reference: string;
  direction: string;
  source_type: string;
  source_id: string | null;
  party_type: string;
  party_id: string | null;
  method: string;
  amount: number | string;
  paid_at: unknown;
  note: string | null;
  created_by: string | null;
  created_at: unknown;
  party_name?: string | null;
};

export type PaymentAllocationRow = {
  payment_id: string;
  target_type: string;
  target_id: string;
  amount: number | string;
};

export function mapPayment(row: PaymentRow) {
  return {
    id: row.id,
    reference: row.reference,
    direction: row.direction,
    sourceType: row.source_type,
    sourceId: row.source_id,
    partyType: row.party_type,
    partyId: row.party_id,
    method: row.method,
    amount: Number(row.amount),
    paidAt: toDateOnlyString(row.paid_at),
    note: row.note,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    partyName: row.party_name ?? null,
  };
}

export function mapPaymentAllocation(row: PaymentAllocationRow) {
  return {
    paymentId: row.payment_id,
    targetType: row.target_type,
    targetId: row.target_id,
    amount: Number(row.amount),
  };
}
