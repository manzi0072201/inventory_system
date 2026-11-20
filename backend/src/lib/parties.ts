import { toIsoString } from "@/lib/date-range";
import type { SqlExecutor } from "@/lib/db";

export type CustomerRow = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  tax_number: string | null;
  opening_balance: number | string;
  credit_limit: number | string;
  balance: number | string;
  created_at: unknown;
  updated_at: unknown;
};

export type SupplierRow = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  category: string | null;
  tax_number: string | null;
  opening_balance: number | string;
  credit_limit: number | string;
  balance: number | string;
  created_at: unknown;
  updated_at: unknown;
};

export function mapCustomer(row: CustomerRow) {
  const balance = Number(row.balance);
  const creditLimit = Number(row.credit_limit);
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    email: row.email,
    phone: row.phone,
    country: row.country,
    city: row.city,
    address: row.address,
    taxNumber: row.tax_number,
    openingBalance: Number(row.opening_balance),
    creditLimit,
    balance,
    dueAmount: Math.max(0, balance),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function mapSupplier(row: SupplierRow) {
  const balance = Number(row.balance);
  const creditLimit = Number(row.credit_limit);
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    email: row.email,
    phone: row.phone,
    country: row.country,
    city: row.city,
    address: row.address,
    category: row.category,
    taxNumber: row.tax_number,
    openingBalance: Number(row.opening_balance),
    creditLimit,
    balance,
    dueAmount: Math.max(0, balance),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export async function fetchCustomers(sql: SqlExecutor): Promise<CustomerRow[]> {
  return (await sql`
    select
      c.*,
      (
        c.opening_balance
        + coalesce((
            select sum(s.total_amount) from sales s
            where s.customer_id = c.id and s.status = 'Completed'
          ), 0)
        - coalesce((
            select sum(p.amount) from payments p
            where p.party_type = 'customer' and p.party_id = c.id
              and p.direction = 'incoming'
          ), 0)
        - coalesce((
            select sum(r.amount) from sale_returns r
            where r.customer_id = c.id and r.status = 'Completed'
          ), 0)
      )::text as balance
    from customers c
    where c.deleted_at is null
  `) as CustomerRow[];
}

export async function fetchCustomer(
  sql: SqlExecutor,
  id: string,
): Promise<CustomerRow | undefined> {
  const rows = (await sql`
    select
      c.*,
      (
        c.opening_balance
        + coalesce((
            select sum(s.total_amount) from sales s
            where s.customer_id = c.id and s.status = 'Completed'
          ), 0)
        - coalesce((
            select sum(p.amount) from payments p
            where p.party_type = 'customer' and p.party_id = c.id
              and p.direction = 'incoming'
          ), 0)
        - coalesce((
            select sum(r.amount) from sale_returns r
            where r.customer_id = c.id and r.status = 'Completed'
          ), 0)
      )::text as balance
    from customers c
    where c.id = ${id}::uuid and c.deleted_at is null
  `) as CustomerRow[];
  return rows[0];
}

export async function fetchSuppliers(sql: SqlExecutor): Promise<SupplierRow[]> {
  return (await sql`
    select
      s.*,
      (
        s.opening_balance
        + coalesce((
            select sum(p.total_amount) from purchases p
            where p.supplier_id = s.id and p.status = 'Completed'
          ), 0)
        - coalesce((
            select sum(pay.amount) from payments pay
            where pay.party_type = 'supplier' and pay.party_id = s.id
              and pay.direction = 'outgoing'
          ), 0)
        - coalesce((
            select sum(r.amount) from purchase_returns r
            where r.supplier_id = s.id and r.status = 'Completed'
          ), 0)
      )::text as balance
    from suppliers s
    where s.deleted_at is null
  `) as SupplierRow[];
}

export async function fetchSupplier(
  sql: SqlExecutor,
  id: string,
): Promise<SupplierRow | undefined> {
  const rows = (await sql`
    select
      s.*,
      (
        s.opening_balance
        + coalesce((
            select sum(p.total_amount) from purchases p
            where p.supplier_id = s.id and p.status = 'Completed'
          ), 0)
        - coalesce((
            select sum(pay.amount) from payments pay
            where pay.party_type = 'supplier' and pay.party_id = s.id
              and pay.direction = 'outgoing'
          ), 0)
        - coalesce((
            select sum(r.amount) from purchase_returns r
            where r.supplier_id = s.id and r.status = 'Completed'
          ), 0)
      )::text as balance
    from suppliers s
    where s.id = ${id}::uuid and s.deleted_at is null
  `) as SupplierRow[];
  return rows[0];
}
