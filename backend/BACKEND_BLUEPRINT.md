# Backend Blueprint and Activity Schedule

## Purpose

This document is the working blueprint for the inventory system backend.

The backend will be constructed with **Next.js** using App Router route handlers. The database will be created and hosted with **Neon** Lakebase Postgres.

Phases 1 through 9 are complete on `dev-backend-setup`, except automated snapshots, which are not enabled for this project. Phase 2 migrations and limited seed data are applied and verified, Phase 3 provides the runnable API foundation, Phase 4 provides Neon Auth plus session/profile/password endpoints, Phase 5 provides the core inventory CRUD, stock, party, and user-management APIs, Phase 6 provides transactional sales, purchases, returns, payments, and expenses, Phase 7 provides report and dashboard APIs with CSV/JSON export, Phase 8 provides company settings, private object storage, notifications, and announcements, and Phase 9 connects the frontend to the backend APIs and removes the obsolete mock/session layer. Feature endpoints remain phase-gated, starting with Phase 10.

## Confirmed decisions

- Framework: Next.js App Router.
- API style: route handlers under `src/app/api`.
- Database: Neon Lakebase Postgres.
- Runtime database client: `@neondatabase/serverless` with raw SQL using the pooled connection string.
- Direct connection string: reserved for migrations and administrative work.
- Frontend source of truth to replace: localStorage stores and JSON-file/session mocks in `frontend`.
- Authentication model: Neon Auth / Managed Better Auth.
- File storage: Neon Object Storage for profile photos, product images, and company logo.
- Email provider: deferred until the password-reset and password-change confirmation phase.
- Deployment: Vercel is the current default target, but it is not locked in and can be changed later.

## Current foundation

```text
backend/
├── .env.example
├── .gitignore
├── BACKEND_BLUEPRINT.md
├── next-env.d.ts
├── next.config.mjs
├── package-lock.json
├── package.json
├── tsconfig.json
├── database/
│   ├── migrations/
│   └── seeds/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   ├── route.ts
│   │   │   │   └── db/
│   │   │   │       └── route.ts
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── products/
│   │   │   ├── stock/
│   │   │   ├── warehouses/
│   │   │   ├── sales/
│   │   │   ├── sales-returns/
│   │   │   ├── purchases/
│   │   │   ├── purchase-returns/
│   │   │   ├── customers/
│   │   │   ├── suppliers/
│   │   │   ├── payments/
│   │   │   ├── expenses/
│   │   │   └── reports/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── audit.ts
│   │   ├── auth.ts
│   │   ├── date-range.ts
│   │   ├── db.ts
│   │   ├── env.ts
│   │   ├── errors.ts
│   │   ├── http.ts
│   │   ├── pagination.ts
│   │   ├── permissions.ts
│   │   ├── sorting.ts
│   │   └── validation.ts
│   └── types/
└── tests/
    └── api/
```

`database/migrations/` contains the 17 schema migrations (through `017_phase8.sql`). `database/seeds/016_seed_dev.sql` contains the limited development seed data. `.gitkeep` files hold planned feature folders in place. `.env.local` and `.neon` exist locally but are ignored.

## Environment files

- `.env.example` contains the variable names only.
- `.env.local` will be created locally and must never be committed.
- `.neon` will be created when the backend is linked to a Neon project and must never be committed.

Variables:

- `DATABASE_URL` - pooled Neon connection string for application traffic.
- `DATABASE_URL_UNPOOLED` - direct Neon connection string.
- `DIRECT_URL` - local alias of `DATABASE_URL_UNPOOLED` used by migrations/admin work.
- `NEON_BRANCH` - linked Neon branch name.
- `NEON_BRANCH_ID` - linked Neon branch ID.
- `NEON_FUNCTION_HOST_SUFFIX` - Neon Functions host suffix.
- `NEON_AUTH_BASE_URL` - added when Neon Auth is provisioned in Phase 4.
- `NEON_AUTH_JWKS_URL` - added when Neon Auth is provisioned in Phase 4.
- Object storage variables - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, and `AWS_REGION` are defined in `.env.example` and set locally in `.env.local`. `STORAGE_BUCKET` is defined in `.env.example` and defaults to `inventory-assets` when unset locally.
- Email provider variables - to be added when password-reset and password-change confirmation emails are implemented.

## Frontend-to-backend folder map

| Frontend area | Backend API folder | Responsibility |
| --- | --- | --- |
| Login/session/profile | `src/app/api/auth` | Sign in, sign out, current session, profile update, password change |
| User management | `src/app/api/users` | Admin/employee CRUD, roles, permissions, status |
| Products | `src/app/api/products` | Product CRUD and product images |
| Stock | `src/app/api/stock` | Stock levels, stock movements, low-stock reporting |
| Warehouses | `src/app/api/warehouses` | Warehouse/shop-zone CRUD |
| Sales | `src/app/api/sales` | Sale creation, updates, voiding, line items |
| Sales returns | `src/app/api/sales-returns` | Return creation and stock restoration |
| Purchases | `src/app/api/purchases` | Purchase creation, updates, line items |
| Purchase returns | `src/app/api/purchase-returns` | Purchase return creation and stock adjustment |
| Customers | `src/app/api/customers` | Customer CRUD and balances |
| Suppliers | `src/app/api/suppliers` | Supplier CRUD and balances |
| Payments | `src/app/api/payments` | Customer/supplier payments and payment methods |
| Expenses | `src/app/api/expenses` | Expense CRUD and categories |
| Reports/dashboard | `src/app/api/reports` | Aggregates, trends, summaries, charts |
| Settings | `src/app/api/settings` | Company profile, logo, system preferences |
| Notifications | `src/app/api/notifications` | User notifications and read state |
| Announcements | `src/app/api/announcements` | System announcements and read state |

## Activity schedule

### Phase 0 - Foundation

- [x] Create the `backend` folder.
- [x] Decide Next.js as the backend framework.
- [x] Decide Neon as the database platform.
- [x] Create the frontend-aligned API folder blueprint.
- [x] Create `.env.example` with placeholder variables.
- [x] Create `.gitignore` for env files, build output, dependencies, and `.neon`.
- [x] Create this `.md` activity schedule.
- [x] Confirm runtime region: `aws-us-east-1`.
- [x] Set deployment default: Vercel, replaceable later.

### Phase 1 - Neon project and branch setup

Status: complete except automated snapshots, which the project does not currently allow.

- [x] Confirm whether to use an existing Neon account or create a new one.
- [x] Create or select the Neon organization.
- [x] Create the Neon project for the inventory system.
- [x] Choose a region that supports all required Neon services.
- [x] Confirm the default branch name.
- [x] Create a development branch for backend schema work.
- [x] Link the backend folder to the Neon project with the Neon CLI.
- [x] Pull the branch environment into `.env.local`.
- [x] Verify pooled and direct connection strings.
- [x] Record the project/branch details in the operations notes without secrets.
- [ ] Set a snapshot/backup policy for the default branch. Blocked: `ERROR: backup schedule creation is not enabled for this project`.

Recorded details:

- Organization: `org-frosty-mountain-89174352` (`MANZI KWIZERA`, free plan).
- Project: `inventory-system-backend` (`autumn-paper-11525492`).
- Region: `aws-us-east-1`.
- Default branch: `main` (`br-rapid-shadow-bb61m2bp`).
- Development branch: `dev-backend-setup` (`br-flat-unit-bbojpm9k`), currently checked out in `.neon`.
- Database: `neondb`; role: `neondb_owner`.
- PostgreSQL: `18.7`.
- Local env: `.env.local` contains Neon-pooled and unpooled connection strings plus a `DIRECT_URL` alias.
- Connection check: `SELECT` succeeded on the development branch.

### Phase 2 - Database architecture

Status: design, migration files, and development seed files are complete and applied to the `dev-backend-setup` branch. Static and live checks confirm two admin profiles and no more than three seeded rows in each business table; reference/config tables retain their required sets.

Applied verification on `dev-backend-setup` (`br-flat-unit-bbojpm9k`): 117 statements across 16 files, 33 public base tables, 2 admin profiles, 3 sales, 2 purchases, 3 products, 3 audit entries, and one settings row.

- [x] Choose raw SQL, a query builder, or an ORM. Chosen: raw SQL with `@neondatabase/serverless`.
- [x] Create the initial migration workflow in `database/migrations` (`001`-`015`).
- [x] Define naming conventions for tables, columns, indexes, and constraints.
- [x] Design `users` and role/permission tables.
- [x] Design `sessions` or confirm Neon Auth-managed sessions. Chosen: Neon Auth-managed.
- [x] Design `warehouses`.
- [x] Design `products`.
- [x] Design `stock_balances` and `stock_movements`.
- [x] Design `customers`.
- [x] Design `suppliers`.
- [x] Design `sales` and `sale_items`.
- [x] Design `sales_returns` and `sale_return_items`.
- [x] Design `purchases` and `purchase_items`.
- [x] Design `purchase_returns` and `purchase_return_items`.
- [x] Design `payments`.
- [x] Design `expenses` and `expense_categories`.
- [x] Design `settings`.
- [x] Design `notifications`.
- [x] Design `announcements`.
- [x] Design audit-log tables.
- [x] Add foreign keys and delete/update rules.
- [x] Add unique constraints for natural keys such as email, SKU, and reference numbers.
- [x] Add indexes for frequently filtered columns such as dates, status, customer, supplier, product, and warehouse.
- [x] Add seed data in `database/seeds` (`016_seed_dev.sql`) for two admin profiles, permissions, reference data, and limited business records.
- [x] Review the schema against every frontend screen before implementation.

#### Naming and type conventions

- Table names: plural `snake_case`.
- Column names: singular `snake_case`.
- Primary keys: `id uuid primary key default gen_random_uuid()`.
- Timestamps: `created_at`, `updated_at`, `deleted_at` as `timestamptz`; store in UTC.
- Business dates: `date` for sale/purchase/return/expense/movement dates.
- Money: `numeric(14,2)`; never floating point.
- Quantities: `integer`; no fractional stock in phase 2.
- Enum-like values: `text` plus `CHECK` constraints, so values can be changed without dropping Postgres enum types.
- User-facing reference fields such as `SL_00001`, `PO_00001`, and `EXP_0001` are unique and generated from `document_sequences`.
- Derived frontend values such as payment status, due amount, stock status, debtor rows, payment rows, and report KPIs are not stored as source data unless a cached column is explicitly noted.
- Transaction rows are treated as immutable after completion; corrections happen through returns, reversals, or adjustment documents.
- Foreign keys use `ON DELETE RESTRICT` by default. Optional references use `ON DELETE SET NULL`.
- Catalog and party tables use `deleted_at` for soft deletion. Transaction tables do not use soft deletion.

#### Auth and access tables

Neon Auth owns password hashing, user credentials, sessions, and the `neon_auth` schema. The application adds profile and authorization tables only.

- `app_users`
  - `id uuid` PK.
  - `auth_user_id text` UNIQUE NOT NULL, links to the Neon Auth user.
  - `email text` UNIQUE NOT NULL.
  - `name text` NOT NULL.
  - `phone text`.
  - `shop_zone text`.
  - `avatar_url text`.
  - `role text` CHECK (`super_admin`, `admin`) NOT NULL.
  - `status text` CHECK (`Active`, `Suspended`) NOT NULL.
  - `last_login_at timestamptz`.
  - `created_at`, `updated_at`.
- `permissions`
  - `key text` PK: `sales`, `sales_returns`, `products`, `stock`, `warehouses`, `purchases`, `purchase_returns`, `customers`, `suppliers`, `debtors`, `payments`, `expenses`, `reports`.
  - `label text`, `description text`.
- `role_permissions`
  - `role text`, `permission_key text`, `allowed boolean`.
  - PK (`role`, `permission_key`).
  - Holds defaults matching frontend `defaultAdminPermissions`.
- `user_permissions`
  - `user_id uuid`, `permission_key text`, `allowed boolean`.
  - PK (`user_id`, `permission_key`).
  - Overrides `role_permissions` for a specific employee.

No `password_hash`, `password_salt`, or application `sessions` table is needed with Neon Auth.

#### Catalog and warehouse tables

- `warehouses`
  - `id uuid` PK, `code text` UNIQUE, `name text` UNIQUE.
  - `address`, `city`, `manager`, `phone`, `email`.
  - `capacity integer`, `active boolean`, `created_at`, `updated_at`, `deleted_at`.
- `brands`
  - `id uuid` PK, `name text` UNIQUE, `active boolean`, `created_at`.
- `product_categories`
  - `id uuid` PK, `name text` UNIQUE, `active boolean`, `created_at`.
- `products`
  - `id uuid` PK, `code text` UNIQUE, `name text` NOT NULL.
  - `brand_id uuid` FK, `category_id uuid` FK.
  - `unit text`, `type text`, `image_url text`, `image_bg text`, `blend boolean`.
  - `active boolean`, `created_at`, `updated_at`, `deleted_at`.
  - Product cost and price are current catalog values; historical transaction prices live in item snapshot rows.
- `product_barcodes`
  - `id uuid` PK, `product_id uuid` FK, `barcode text` UNIQUE, `is_primary boolean`.
- `stock_balances`
  - `product_id uuid`, `warehouse_id uuid`, PK (`product_id`, `warehouse_id`).
  - `quantity_on_hand integer` NOT NULL DEFAULT 0.
  - `reorder_point integer`, `critical_point integer`.
  - `average_cost numeric(14,2)`.
  - `updated_at`.
- `stock_movements`
  - `id uuid` PK, `product_id uuid` FK, `warehouse_id uuid` FK.
  - `movement_type text` CHECK (`purchase`, `sale`, `adjustment`, `transfer`, `sale_return`, `purchase_return`).
  - `quantity_delta integer` NOT NULL, `balance_after integer`.
  - `reference_type text`, `reference_id uuid`, `occurred_at date`.
  - `note text`, `created_by uuid` FK, `created_at`.
- `stock_adjustments`
  - `id uuid` PK, `reference text` UNIQUE.
  - `date date`, `product_id uuid`, `warehouse_id uuid`.
  - `quantity_delta integer`.
  - `reason text` CHECK (`Stock count`, `Damaged`, `Returned`, `Transfer`, `Other`).
  - `note text`, `created_by uuid`, `created_at`.
- `stock_transfers`
  - `id uuid` PK, `reference text` UNIQUE.
  - `from_warehouse_id uuid`, `to_warehouse_id uuid`, `product_id uuid`.
  - `quantity integer`, `date date`, `note text`, `created_by uuid`, `created_at`.

#### Party tables

- `customers`
  - `id uuid` PK, `name text`, `type text` CHECK (`Individual`, `Business`).
  - `email`, `phone`, `country`, `city`, `address`, `tax_number`.
  - `opening_balance numeric(14,2)` DEFAULT 0.
  - `credit_limit numeric(14,2)` DEFAULT 0.
  - `created_at`, `updated_at`, `deleted_at`.
- `suppliers`
  - `id uuid` PK, `name text`, `contact text`.
  - `email`, `phone`, `country`, `city`, `address`, `category`, `tax_number`.
  - `opening_balance numeric(14,2)` DEFAULT 0.
  - `credit_limit numeric(14,2)` DEFAULT 0.
  - `created_at`, `updated_at`, `deleted_at`.

Party balances are derived from opening balance plus posted sales, purchases, payments, and returns.

#### Numbering table

- `document_sequences`
  - `key text` PK: `sale`, `purchase`, `sale_return`, `purchase_return`, `expense`, `stock_adjustment`, `stock_transfer`.
  - `prefix text`, `next_number integer`, `updated_at`.
  - Sequence allocation must be transactional so two requests never receive the same reference.

#### Sales tables

- `sales`
  - `id uuid` PK, `reference text` UNIQUE, `date date`.
  - `customer_id uuid` FK, `warehouse_id uuid` FK, `seller_id uuid` FK to `app_users`.
  - `status text` CHECK (`Completed`, `Pending`, `Ordered`).
  - `currency char(3)`.
  - `subtotal numeric(14,2)`, `discount_amount numeric(14,2)`, `tax_amount numeric(14,2)`, `total_amount numeric(14,2)`.
  - `paid_amount numeric(14,2)` cached from posted payments; enforce `paid_amount <= total_amount`.
  - `payment_method text` CHECK (`Bank Account`, `MTN MoMo`, `Airtel Money`, `Cash`).
  - `shipping_status text`, `note text`.
  - `created_by uuid`, `created_at`, `updated_at`.
  - Payment status and due amount are derived from `total_amount` and `paid_amount`.
- `sale_items`
  - `id uuid` PK, `sale_id uuid` FK.
  - `product_id uuid` FK, `name_snapshot text`, `code_snapshot text`.
  - `quantity integer`, `unit_price numeric(14,2)`, `discount_amount numeric(14,2)`, `tax_amount numeric(14,2)`, `line_total numeric(14,2)`, `sort_order integer`.
- `sale_returns`
  - `id uuid` PK, `reference text` UNIQUE, `date date`.
  - `sale_id uuid` FK, `customer_id uuid` FK, `warehouse_id uuid` FK.
  - `reason text` CHECK (`Damaged item`, `Defective item`, `Wrong item delivered`, `Customer changed mind`, `Late delivery`, `Other`).
  - `resolution text` CHECK (`Refund`, `Store Credit`, `Replacement`).
  - `status text` CHECK (`Pending`, `Approved`, `Completed`, `Rejected`).
  - `refund_method text` payment-method CHECK, `amount numeric(14,2)`, `restock boolean`.
  - `note text`, `created_by uuid`, `created_at`, `updated_at`.
- `sale_return_items`
  - `id uuid` PK, `sale_return_id uuid` FK.
  - `product_id uuid` FK, `name_snapshot text`, `code_snapshot text`.
  - `quantity integer`, `unit_price numeric(14,2)`, `line_total numeric(14,2)`.

#### Purchase tables

- `purchases`
  - `id uuid` PK, `reference text` UNIQUE, `date date`.
  - `supplier_id uuid` FK, `buyer_id uuid` FK to `app_users`, `warehouse_id uuid` FK.
  - `status text` CHECK (`Received`, `Pending`, `Ordered`).
  - `currency char(3)`.
  - `subtotal numeric(14,2)`, `discount_amount numeric(14,2)`, `tax_amount numeric(14,2)`, `total_amount numeric(14,2)`.
  - `paid_amount numeric(14,2)` cached from posted payments; enforce `paid_amount <= total_amount`.
  - `payment_method text` payment-method CHECK.
  - `shipping_status text`, `note text`.
  - `created_by uuid`, `created_at`, `updated_at`.
- `purchase_items`
  - `id uuid` PK, `purchase_id uuid` FK.
  - `product_id uuid` FK, `name_snapshot text`, `code_snapshot text`.
  - `quantity integer`, `unit_price numeric(14,2)`, `discount_amount numeric(14,2)`, `tax_amount numeric(14,2)`, `line_total numeric(14,2)`, `sort_order integer`.
- `purchase_returns`
  - `id uuid` PK, `reference text` UNIQUE, `date date`.
  - `purchase_id uuid` FK, `supplier_id uuid` FK, `warehouse_id uuid` FK.
  - `reason text` CHECK (`Damaged goods`, `Defective goods`, `Wrong item received`, `Overstock`, `Supplier error`, `Other`).
  - `resolution text` CHECK (`Refund`, `Replacement`, `Credit Note`).
  - `status text` CHECK (`Pending`, `Approved`, `Completed`, `Rejected`).
  - `refund_method text` payment-method CHECK, `amount numeric(14,2)`, `deduct_stock boolean`.
  - `note text`, `created_by uuid`, `created_at`, `updated_at`.
- `purchase_return_items`
  - `id uuid` PK, `purchase_return_id uuid` FK.
  - `product_id uuid` FK, `name_snapshot text`, `code_snapshot text`.
  - `quantity integer`, `unit_price numeric(14,2)`, `line_total numeric(14,2)`.

#### Payment tables

- `payments`
  - `id uuid` PK, `reference text` UNIQUE.
  - `direction text` CHECK (`incoming`, `outgoing`).
  - `source_type text` CHECK (`sale`, `purchase`, `sale_return`, `purchase_return`, `expense`).
  - `source_id uuid` nullable FK by convention, not a polymorphic database FK.
  - `party_type text` CHECK (`customer`, `supplier`).
  - `party_id uuid` nullable FK by convention.
  - `method text` CHECK (`Bank Account`, `MTN MoMo`, `Airtel Money`, `Cash`).
  - `amount numeric(14,2)`, `paid_at date`, `note text`.
  - `created_by uuid`, `created_at`.
- `payment_allocations`
  - `payment_id uuid` FK, `target_type text`, `target_id uuid`, `amount numeric(14,2)`.
  - PK (`payment_id`, `target_type`, `target_id`).
  - Sum of allocations must not exceed the payment amount.

This replaces the frontend's derived-only payment rows and makes payment history auditable.

#### Expense tables

- `expense_categories`
  - `id uuid` PK, `name text` UNIQUE, `active boolean`, `created_at`.
- `expenses`
  - `id uuid` PK, `reference text` UNIQUE, `date date`.
  - `category_id uuid` FK, `vendor text`, `description text`.
  - `amount numeric(14,2)`.
  - `payment_method text` payment-method CHECK.
  - `status text` CHECK (`Paid`, `Pending`, `Cancelled`).
  - `note text`, `created_by uuid`, `created_at`, `updated_at`.

#### Settings tables

- `app_settings`
  - `id boolean` PK DEFAULT true CHECK (`id`).
  - `company jsonb`, `localization jsonb`, `inventory jsonb`, `sales_pos jsonb`, `purchasing jsonb`, `finance jsonb`, `notifications jsonb`, `security jsonb`, `appearance jsonb`, `documents jsonb`, `integrations jsonb`, `system jsonb`.
  - `updated_at`, `updated_by uuid`.
- Each JSONB group mirrors the corresponding frontend `SystemSettings` group.
- Secrets such as SMTP password, payment gateway secret, webhook secret, and API keys are not stored here; they belong in environment variables or a secret manager.
- Settings changes are recorded in `audit_logs`.

#### Notification and announcement tables

- `notifications`
  - `id uuid` PK, `user_id uuid` FK.
  - `kind text` CHECK (`alert`, `activity`).
  - `category text` CHECK (`stock`, `sales`, `purchase`, `sales-return`, `purchase-return`, `customer`, `supplier`, `expense`).
  - `tone text` CHECK (`danger`, `warning`, `success`, `info`).
  - `title text`, `description text`, `href text`.
  - `occurred_at timestamptz`, `read_at timestamptz`, `created_at`.
- `announcements`
  - `id uuid` PK, `title text`, `body text`, `category text`, `date date`.
  - `tone text` CHECK (`danger`, `warning`, `success`, `info`).
  - `icon text`, `created_by uuid`, `created_at`, `updated_at`.
- `announcement_reads`
  - `announcement_id uuid` FK, `user_id uuid` FK, `read_at timestamptz`.
  - PK (`announcement_id`, `user_id`).

#### Audit table

- `audit_logs`
  - `id bigint generated always as identity` PK.
  - `actor_id uuid` nullable FK, `action text`, `entity_type text`, `entity_id text`.
  - `before_data jsonb`, `after_data jsonb`.
  - `ip_address text`, `user_agent text`, `created_at timestamptz`.

#### Derived API views, not source tables

- Payment status: `Unpaid`, `Partial`, `Paid` from `paid_amount` and `total_amount`.
- Due amount: `greatest(0, total_amount - paid_amount)`.
- Stock status: `Out of Stock`, `Low Stock`, `In Stock` from `quantity_on_hand` and `reorder_point`.
- Debtor rows: customers plus sales totals, payment allocations, and opening balances.
- Payment rows: sales, purchases, returns, and expenses joined to `payments`.
- Notification feed: stored notifications plus read state.
- Reports: date/warehouse-filtered aggregates across sales, purchases, returns, expenses, products, and stock balances.

#### Constraints and indexes

- Unique: product `code`, warehouse `code`/`name`, customer/supplier email where present, all document references, permission key, role/permission pairs, user/permission pairs, stock balance product/warehouse pair.
- Check: all documented status, type, method, tone, category, and direction values.
- Foreign keys: all `_id` fields point to the intended parent table with `ON DELETE RESTRICT`, except optional `created_by` fields which may use `ON DELETE SET NULL`.
- Date indexes: `sales(date)`, `purchases(date)`, `sales_returns(date)`, `purchase_returns(date)`, `expenses(date)`, `stock_movements(occurred_at)`.
- Relationship indexes: `sales(customer_id, warehouse_id, status)`, `purchases(supplier_id, warehouse_id, status)`, `products(category_id, brand_id)`, `stock_balances(warehouse_id)`, `stock_movements(product_id, warehouse_id)`, `payments(party_type, party_id, paid_at)`, `notifications(user_id, read_at)`.
- Reference lookup indexes: reference columns are already unique and do not need a second index.
- Report queries should be rechecked with `EXPLAIN` after seed data is loaded.

#### Proposed migration order

1. `001_extensions.sql` - `pgcrypto` if needed for `gen_random_uuid()`.
2. `002_auth_profile_and_access.sql` - `app_users`, `permissions`, `role_permissions`, `user_permissions`.
3. `003_catalog_and_warehouses.sql` - warehouses, brands, categories, products, barcodes.
4. `004_parties.sql` - customers, suppliers.
5. `005_numbering.sql` - `document_sequences`.
6. `006_stock.sql` - balances, movements, adjustments, transfers.
7. `007_sales.sql` - sales and sale items.
8. `008_purchases.sql` - purchases and purchase items.
9. `009_returns.sql` - sales returns, purchase returns, and their items.
10. `010_payments.sql` - payments and allocations.
11. `011_expenses.sql` - expense categories and expenses.
12. `012_settings.sql` - `app_settings`.
13. `013_notifications.sql` - notifications, announcements, announcement reads.
14. `014_audit.sql` - audit logs.
15. `015_indexes_and_constraints.sql` - final index and constraint pass.
16. `016_seed_dev.sql` - development-only seed data.

#### Seed data plan

- Admin profiles: exactly two (`Primary Admin` as `super_admin`, `Secondary Admin` as `admin`). Neon Auth credentials are provisioned separately in Phase 4.
- Permissions: all 13 `PermissionKey` values with frontend labels.
- Role defaults: super admin all allowed; admin defaults from `defaultAdminPermissions`.
- Business records are capped at three rows per table.
- Warehouses: `Main Warehouse` (`WH-001`), `Secondary Warehouse` (`WH-002`).
- Brands: `Apple`, `Bose`, `Sony`.
- Categories: `Audio`, `Tablets`.
- Products: three sample products.
- Customers: three sample customers.
- Suppliers: three sample suppliers.
- Sales: three; purchases: two; sales returns: two; purchase returns: one.
- Payments, expenses, notifications, and audit entries: three each at most.
- Expense categories: `Rent`, `Utilities`, `Transport`.
- Payment methods: `Bank Account`, `MTN MoMo`, `Airtel Money`, `Cash`.
- Document sequences: sale, purchase, sale return, purchase return, expense, adjustment, transfer.
- Settings: one `app_settings` row built from frontend defaults.
- All seeded people and companies use `.local` example data; no real production data is included.

### Phase 3 - Next.js API foundation

- [x] Add `package.json`.
- [x] Add TypeScript configuration.
- [x] Add Next.js configuration with `outputFileTracingRoot`.
- [x] Add the Neon serverless client dependency.
- [x] Add validation library (`zod`).
- [x] Add shared error-response format.
- [x] Add shared success-response format.
- [x] Add request parsing helper.
- [x] Add pagination helper.
- [x] Add sorting helper.
- [x] Add date-range filtering helper.
- [x] Add authentication guard helper using Neon Auth JWT verification.
- [x] Add permission guard helper.
- [x] Add audit-log helper for the planned `audit_logs` table.
- [x] Add API versioning strategy (`v1` in response metadata).
- [x] Add health-check endpoints (`/api/health`, `/api/health/db`).
- [ ] Add CORS policy if a separate frontend origin is used.
- [ ] Add rate limiting for public and authentication endpoints.

Phase 3 verification completed:

- `npm run typecheck` passed.
- `npm run build` passed.
- `GET /api/health` returned `ok` with `databaseConfigured: true` and `authConfigured: false`.
- `GET /api/health/db` returned `ok` with `database: connected`.
- `authConfigured` is expected to stay `false` until Neon Auth is provisioned in Phase 4.

### Phase 4 - Authentication and access control

- [x] Decide between Neon Auth and custom sessions.
- [x] Implement sign-in through the Neon Auth proxy.
- [x] Implement sign-out through `/api/auth/session` `DELETE` and the Neon Auth proxy.
- [x] Implement current-session lookup through `/api/auth/session` `GET`.
- [x] Password hashing is handled by Neon Auth; no custom hashing.
- [x] Session creation and expiry are handled by Neon Auth; no custom sessions.
- [x] Implement role and permission loading from `app_users` and `user_permissions`.
- [x] Apply route-level permission checks to feature endpoints in Phases 5-8.
- [x] Implement profile read/update through `/api/profile`.
- [x] Implement profile photo upload/removal in Phase 8 with Neon Object Storage.
- [x] Implement password change with current-password verification through `/api/auth/password`.
- [ ] Implement email confirmation for password changes when email provider is ready.
- [x] Implement forgot-password flow through the Neon Auth proxy.
- [x] Implement account suspension enforcement in session resolution.
- [x] Implement audit entries for auth events (`auth.sign_out`, `profile.update`, `auth.password_change`).

Phase 4 verification completed on `dev-backend-setup`:

- Neon Auth is provisioned with `@neon/auth`; the backend was upgraded to Next.js 16.4.6 to satisfy the package peer requirement.
- `npm run typecheck` and `npm run build` pass.
- `GET /api/health` reports `authConfigured: true`.
- Exactly two Neon Auth users exist and are bound by email to the two seeded `app_users`: `admin@itg.local` as `super_admin` and `manager@itg.local` as `admin`.
- Sign-in, session lookup, profile read, sign-out, and password change/revert were exercised successfully.
- Public sign-up is disabled after provisioning; the temporary dev password is stored only in `.env.local` as `DEV_ADMIN_PASSWORD`.
- CORS allows `http://localhost:3000` with credentials for frontend integration.

### Phase 5 - Core inventory APIs

- [x] Warehouse create/read/update/delete.
- [x] Product create/read/update/delete.
- [x] Product SKU uniqueness enforcement.
- [x] Product image upload and removal.
- [x] Stock balance read by product and warehouse.
- [x] Stock movement recording on sale, purchase, return, and adjustment.
- [x] Low-stock threshold support.
- [x] Customer create/read/update/delete.
- [x] Customer balance calculation.
- [x] Supplier create/read/update/delete.
- [x] Supplier balance calculation.
- [x] User/employee create/read/update/delete.
- [x] Role and permission assignment.

Phase 5 notes:
- Product image support started URL-based through `imageUrl` and `imageBg`; binary upload/storage was added in Phase 8.
- The stock movement helper supports sale, purchase, return, and adjustment movement types; transaction endpoints that invoke it are in Phase 6.
- Customer and supplier delete endpoints are soft deletes (`deleted_at`), and user delete is implemented as suspension because transaction rows restrict hard deletes.
- `npm run typecheck` and `npm run build` pass for Phase 5.

### Phase 6 - Transaction APIs

- [x] Sale create with line items.
- [x] Sale number generation.
- [x] Sale stock deduction.
- [x] Sale payment allocation.
- [x] Sale update constraints.
- [x] Sale void/cancel flow.
- [x] Sale hard delete with linked return, stock, and payment cleanup.
- [x] Sales return create with line items.
- [x] Sales return stock restoration.
- [x] Purchase create with line items.
- [x] Purchase number generation.
- [x] Purchase stock increase.
- [x] Purchase payment allocation.
- [x] Purchase update constraints.
- [x] Purchase hard delete with linked return, stock, and payment cleanup.
- [x] Purchase return create with line items.
- [x] Purchase return stock reduction.
- [x] Payment create for customers and suppliers.
- [x] Payment methods including Cash, Bank Account, MTN MoMo, and Airtel Money.
- [x] Expense create/read/update/delete.
- [x] Expense category management.
- [x] Transactional integrity for all stock and money changes.
- [x] Audit entries for all transaction mutations.

Phase 6 notes:
- Migration `016_transaction_support.sql` adds Cancelled statuses, the shared stock adjustment function, and the payment document sequence. It was tested successfully on a temporary branch (since deleted), including positive and insufficient-stock stock-function smoke tests, then applied and verified on `dev-backend-setup` (`br-flat-unit-bbojpm9k`).
- Sales and purchases only move stock when created as Completed/Received; void reverses stock and payment for those states.
- Sale and purchase hard deletes restore net stock from linked stock movements only for posted documents (Completed sales and Received purchases); cancelled/non-posted documents delete their stale movements without changing current stock. Posted deletes roll back if any balance would become negative.
- Return quantities are validated as per-product totals because return item rows do not yet store source line-item IDs.
- Payment allocations enforce party and direction compatibility and cannot exceed the outstanding balance.
- Invalid calendar dates are rejected with a 422 response.
- `npm run typecheck` and `npm run build` pass for Phase 6.

### Phase 7 - Reports and dashboard APIs

- [x] Sales and purchases trend endpoint by day/week/month.
- [x] Today, 7D, 30D, MTD, YTD, and custom range support.
- [x] Warehouse filtering.
- [x] Payment method summary.
- [x] Top customers endpoint.
- [x] Top products endpoint.
- [x] Stock valuation endpoint.
- [x] Low-stock summary endpoint.
- [x] Expense summary endpoint.
- [x] Debtor and creditor summary endpoint.
- [x] Dashboard KPI endpoint.
- [x] Report export format decision: CSV, PDF, or both.

Phase 7 notes:
- Export format is CSV via `?format=csv`; JSON remains the default. CSV responses are attachments; JSON responses use the standard `ok()` envelope.
- Reports support `preset=today|7d|30d|mtd|ytd|all|custom`; custom ranges require valid `start` and `end` dates. Trend reports support `granularity=day|week|month`.
- Warehouse filtering is applied to sales, purchases, returns, stock, top products, and top customers. When a warehouse filter is supplied, top-customer payments are excluded because `payments` has no warehouse column, so balances are sales minus returns for that warehouse.
- Payment-method warehouse filtering attributes allocated payment amounts through sale, purchase, sale-return, and purchase-return targets. Unallocated payments and expense-linked payments are excluded when a warehouse filter is applied.
- Dashboard warehouse filtering scopes sales, returns, purchases, stock value, and low-stock SKUs; expenses, payment totals, and debtor/creditor balances remain global and are identified in the response `scope` field.
- Debtor and creditor summaries accept `asOf=YYYY-MM-DD` and compute balances from completed sales, received purchases, completed returns, and payments through that date.
- `npm run typecheck` and `npm run build` pass for Phase 7.

### Phase 8 - Settings, files, and notifications

- [x] Company settings read/update.
- [x] Company logo upload.
- [x] Profile photo storage.
- [x] Product image storage.
- [x] Object storage bucket decision.
- [x] Public/private access rules for uploaded objects.
- [x] Notification create/read/mark-as-read.
- [x] Announcement create/read/update/delete.
- [x] Announcement read tracking per user.

Phase 8 notes:
- Bucket decision: one private Neon Object Storage bucket named `inventory-assets`, declared in `neon.ts` and configured through `STORAGE_BUCKET` plus the four `AWS_*` S3 variables. It is confirmed private on `dev-backend-setup`; no public bucket or public objects are used.
- Access rules: managed objects are stored under `avatars/`, `settings/`, and `products/`. `POST /api/uploads` requires an authenticated session plus the `settings` permission for logos and the `products` permission for product images; it returns a 15-minute presigned PUT URL. Reads convert bare object keys to 1-hour presigned GET URLs. Absolute `http(s)` URLs and root-relative paths are treated as externally hosted assets and are passed through unchanged. APIs reject object keys whose prefix does not match the field scope. Replacing or removing an image deletes the previous managed object; delete failures never fail the request.
- Company settings: `GET`/`PATCH /api/settings` read and merge the JSONB groups. The logo is stored at `company.logoUrl`; upload uses `POST /api/uploads` with `scope: "logo"`, and removal sends `company.logoUrl: null`. Settings require the `settings` permission and record `settings.update` audit entries.
- Profile photos: `PATCH /api/profile` accepts `avatarUrl` from `POST /api/uploads` with `scope: "avatar"`, and `avatarUrl: null` removes it. Neon Auth's `image` field is also updated for cookie sessions; that value is a signed URL and expires after one hour, while `app_users.avatar_url` remains the source of truth.
- Product images: `POST /api/products` and `PATCH /api/products/[id]` accept `imageUrl` from `POST /api/uploads` with `scope: "product"`, and `imageUrl: null` removes it. Soft-deleting a product also deletes its managed image.
- Notifications: `GET /api/notifications` lists the current user's notifications with filters; `POST /api/notifications` creates one or broadcasts to all Active users in one atomic insert; `PATCH /api/notifications/[id]` marks read/unread and `POST /api/notifications/read-all` marks all of the current user's notifications read. Owners may update their own notifications; other users need the `notifications` permission. Business-event automation and realtime delivery remain deferred.
- Announcements: `GET`/`POST /api/announcements` and `GET`/`PATCH`/`DELETE /api/announcements/[id]` provide CRUD with the `announcements` permission for writes. `POST`/`DELETE /api/announcements/[id]/read` set and clear the current user's read state in `announcement_reads`; list and detail queries join that state per user.
- Migration `017_phase8.sql` adds the `settings`, `notifications`, and `announcements` permissions with role defaults plus `announcement_reads_user_idx`; it is applied and verified on `dev-backend-setup` (`br-flat-unit-bbojpm9k`).
- Verification: the private `inventory-assets` bucket, the three Phase 8 permissions, six role defaults, `announcement_reads_user_idx`, the singleton settings row, and the seeded notifications/announcements were confirmed on the development branch; the four `AWS_*` S3 variables are present locally; `npm run typecheck` and `npm run build` pass for Phase 8.

### Phase 9 - Frontend integration

- [x] Create a typed API client in the frontend.
- [x] Define shared frontend/backend TypeScript types.
- [x] Replace frontend auth mock with backend auth endpoints.
- [x] Replace localStorage user store with session-backed user data.
- [x] Replace product localStorage store with product APIs.
- [x] Replace customer localStorage store with customer APIs.
- [x] Replace supplier localStorage store with supplier APIs.
- [x] Replace sales localStorage store with sales APIs.
- [x] Replace sales-return localStorage store with sales-return APIs.
- [x] Replace purchase localStorage store with purchase APIs.
- [x] Replace purchase-return localStorage store with purchase-return APIs.
- [x] Replace expense localStorage store with expense APIs.
- [x] Replace stock localStorage store with stock APIs.
- [x] Replace settings localStorage store with settings APIs.
- [x] Replace notification mock data with API data.
- [x] Replace announcement mock data with API data.
- [x] Replace dashboard/report mock data with report APIs.
- [x] Add loading, empty, and error states for every integrated screen.
- [x] Remove obsolete mock data and JSON-file session logic only after parity is verified.

Phase 9 notes:
- The frontend calls the backend through `frontend/src/lib/api.ts`, `frontend/src/lib/api-types.ts`, and the `frontend/src/app/api/backend/[...path]/route.ts` proxy. Auth uses backend session endpoints with `frontend/src/middleware.ts` guarding app routes.
- All migrated stores keep their synchronous context APIs, call backend endpoints internally, reload after mutations, and expose `error`/`reload`. The dashboard and reports pages derive their data from the same APIs instead of seed arrays.
- Integrated screens show hydration/loading states and empty rows; `frontend/src/components/app-shell.tsx` renders deduplicated store errors with a Retry action. Dashboard, admin-dashboard, announcements, reports, and payments have explicit empty states.
- Return edit/delete UI remains unavailable because the backend exposes no return update/delete endpoints; those actions show an explicit backend-limitation message. The payments view maps known sale/purchase/return source types and ignores other `sourceType` values.
- Obsolete local auth/user routes, `frontend/src/lib/auth.ts`, `frontend/src/lib/session.ts`, `frontend/src/lib/users-server.ts`, `frontend/data/users.json`, and unused seed record arrays were removed. Shared types, static option lists, and helper functions remain.
- Verification: `npm run typecheck` and `npm run build` pass in both `frontend` and `backend`. Stale generated `.next` route types were cleared before the final frontend checks.
- Runtime fix: `frontend/src/components/settings/settings-store.tsx` now normalizes the flat `/api/settings` response; the previous `response.groups` lookup made `Object.values(undefined)` throw the global `Cannot convert undefined or null to object` / `Retry` error. `frontend/src/lib/api-types.ts` defines the response as top-level `SettingsGroupKey` groups.
- Runtime fix: `frontend/src/app/api/backend/[...path]/route.ts` no longer forwards the `expect` header, which caused undici `ERR_UND_NOT_SUPPORTED` and HTTP 500 for clients sending `Expect: 100-continue`.
- Runtime fix: backend UUID validation now uses a shared canonical 8-4-4-4-16 hex schema from `backend/src/lib/validation.ts`. Zod's stricter `.uuid()` rejected seed IDs such as `00000000-0000-0000-0000-000000000041` even though Postgres accepts them.
- Runtime fix: `frontend/src/lib/api.ts` appends backend validation detail paths and messages to `ApiClientError`, so the global retry banner identifies the exact failing field instead of showing only `Request validation failed.`
- Runtime fix: `frontend/src/components/products/product-image-panel.tsx` uploads selected files through `uploadImage("product", file)` and sends the returned `products/…` object key. The previous base64 data URL exceeded `storedFileValue` limits and failed product create/edit validation.
- Runtime fix: sale and purchase Delete actions call real `DELETE /api/sales/[id]` and `DELETE /api/purchases/[id]` endpoints and only show success or navigate after the backend confirms deletion; void endpoints remain available for explicit cancel/void flows.
- Runtime fix: `frontend/src/components/settings/settings-page.tsx` uploads logos through `uploadImage("logo", file)` and sends the returned `settings/…` object key. The previous base64 data URL failed `company.logoUrl` validation; SVG is no longer offered because storage accepts PNG/JPG/WebP/GIF only.
- Stock behavior: normal stock movement and adjustment lists exclude soft-deleted products/warehouses; the audit rows remain in `stock_movements`/`stock_adjustments` and audit logs for compliance.
- Stock behavior: products with no `stock_balances` row are labeled `Not Stocked` instead of `Out of Stock`; `Out of Stock` now means a real stock record exists at zero or below.
- Runtime fix: PostgreSQL `date` columns are mapped with `toDateOnlyString` instead of `toIsoString`, preventing local-midnight dates from shifting to the previous UTC day (for example, `2026-11-20` became `2026-11-19T22:00Z` and sliced to `2026-11-19` in the frontend). Applied to sales, purchases, returns, expenses, payments, and stock adjustments so reports and today's activity show the correct calendar day.
- Audit visibility: `GET /api/audit-logs` provides report-permission access to paginated audit history with date presets, action/entity/user/IP search, and CSV export; CSV export writes an `audit_logs.export` entry. The frontend `/audit-logs` page exposes filters, change details, pagination, and export.
- Profit accuracy: `018_cogs_snapshots.sql` adds `sale_items.unit_cost` and `sale_return_items.sale_item_id`/`unit_cost`, backfills them from warehouse `stock_balances.average_cost` and `products.cost_price`, and was verified on a temporary Neon branch before being applied to `dev-backend-setup`. Sale create/update and sale-return creation now capture cost snapshots. `GET /api/reports/profit` returns actual COGS-based profit totals and series; the reports page uses it when available and labels the catalog-ratio calculation as an estimate fallback only.

### Phase 10 - Testing and quality

- [ ] Unit tests for shared helpers.
- [ ] Integration tests for each API folder.
- [ ] Database migration tests on a Neon branch.
- [ ] Authentication and permission tests.
- [ ] Stock movement integrity tests.
- [ ] Payment allocation integrity tests.
- [ ] Report aggregation tests against known seed data.
- [ ] API contract tests for frontend integration.
- [ ] Error-response consistency checks.
- [ ] Performance checks for report queries.
- [ ] Security review for authorization and input validation.

### Phase 11 - Deployment and operations

- [ ] Choose hosting platform for the Next.js backend.
- [ ] Add production environment variables.
- [ ] Add production Neon branch.
- [ ] Configure secrets management.
- [ ] Configure build and deploy pipeline.
- [ ] Run migrations through a controlled release step.
- [ ] Add health monitoring.
- [ ] Add error monitoring.
- [ ] Add log retention policy.
- [ ] Add database backup and restore runbook.
- [ ] Add rollback procedure for schema changes.
- [ ] Document production support steps.

## Cross-cutting standards

- All list endpoints should support pagination, sorting, and filtering.
- All responses should use one consistent envelope for success and error cases.
- All mutations should be wrapped in database transactions where multiple rows change.
- All stock and money calculations should be server-authoritative.
- All role/permission checks must happen on the server.
- All user-facing errors should be clear and non-technical.
- All logs must avoid passwords, tokens, connection strings, and personal data.
- All schema changes should happen through migrations.
- All API changes should update the frontend contract in the same work item.

## Decision log

- Authentication: Neon Auth / Managed Better Auth.
- Database access: raw SQL with `@neondatabase/serverless`.
- File storage: Neon Object Storage, using one private `inventory-assets` bucket with 15-minute presigned uploads and 1-hour presigned downloads; externally hosted URLs are passed through.
- Email provider: deferred until the email phase.
- Deployment: Vercel default, replaceable later.
- Report export format: deferred until the reports phase.
- Realtime notifications: deferred beyond Phase 8; notifications are stored and polled, not pushed.

## Immediate next step

Phases 1 through 9 are complete on `dev-backend-setup`, except automated snapshots, which are not enabled for this project. Neon Auth is provisioned, both admin accounts are bound to the seeded profiles, public sign-up is disabled, and auth/session/profile/password endpoints are verified. Phase 5 adds warehouse, product, stock, customer, supplier, and user-management APIs; Phase 6 adds transactional sales, purchases, returns, payments, and expenses; Phase 7 adds report and dashboard APIs with CSV/JSON export; Phase 8 adds company settings, private Neon Object Storage uploads, notifications, and announcements with per-user read tracking; Phase 9 connects the frontend stores and screens to those APIs and removes the obsolete mock/session layer. Both frontend and backend type checks and builds pass. Next: begin **Phase 10 - Testing and quality**.
