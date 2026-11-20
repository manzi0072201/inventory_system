begin;

insert into app_users (id, auth_user_id, email, name, phone, shop_zone, role, status)
values
  ('00000000-0000-0000-0000-000000000001', 'seed-super-admin', 'admin@itg.local', 'Primary Admin', '+250788000001', 'Main Warehouse', 'super_admin', 'Active'),
  ('00000000-0000-0000-0000-000000000002', 'seed-admin', 'manager@itg.local', 'Secondary Admin', '+250788000002', 'Main Warehouse', 'admin', 'Active')
on conflict (id) do update set
  auth_user_id = excluded.auth_user_id,
  email = excluded.email,
  name = excluded.name,
  phone = excluded.phone,
  shop_zone = excluded.shop_zone,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into permissions (key, label, description)
values
  ('sales', 'Sales', 'Create and manage sales.'),
  ('sales_returns', 'Sales Returns', 'Create and manage sales returns.'),
  ('products', 'Products', 'Create and manage products.'),
  ('stock', 'Stock', 'View and manage stock.'),
  ('warehouses', 'Warehouses', 'Create and manage warehouses.'),
  ('purchases', 'Purchases', 'Create and manage purchases.'),
  ('purchase_returns', 'Purchase Returns', 'Create and manage purchase returns.'),
  ('customers', 'Customers', 'Create and manage customers.'),
  ('suppliers', 'Suppliers', 'Create and manage suppliers.'),
  ('debtors', 'Debtors', 'View debtor balances.'),
  ('payments', 'Payments', 'Create and manage payments.'),
  ('expenses', 'Expenses', 'Create and manage expenses.'),
  ('reports', 'Reports', 'View reports and analytics.'),
  ('settings', 'Settings', 'Manage company settings and uploaded assets.'),
  ('notifications', 'Notifications', 'Create and manage in-app notifications.'),
  ('announcements', 'Announcements', 'Create and manage announcements.')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

insert into role_permissions (role, permission_key, allowed)
values
  ('super_admin', 'sales', true),
  ('super_admin', 'sales_returns', true),
  ('super_admin', 'products', true),
  ('super_admin', 'stock', true),
  ('super_admin', 'warehouses', true),
  ('super_admin', 'purchases', true),
  ('super_admin', 'purchase_returns', true),
  ('super_admin', 'customers', true),
  ('super_admin', 'suppliers', true),
  ('super_admin', 'debtors', true),
  ('super_admin', 'payments', true),
  ('super_admin', 'expenses', true),
  ('super_admin', 'reports', true),
  ('super_admin', 'settings', true),
  ('super_admin', 'notifications', true),
  ('super_admin', 'announcements', true),
  ('admin', 'sales', true),
  ('admin', 'sales_returns', true),
  ('admin', 'products', true),
  ('admin', 'stock', true),
  ('admin', 'warehouses', false),
  ('admin', 'purchases', false),
  ('admin', 'purchase_returns', false),
  ('admin', 'customers', true),
  ('admin', 'suppliers', false),
  ('admin', 'debtors', true),
  ('admin', 'payments', true),
  ('admin', 'expenses', false),
  ('admin', 'reports', true),
  ('admin', 'settings', false),
  ('admin', 'notifications', true),
  ('admin', 'announcements', false)
on conflict (role, permission_key) do update set
  allowed = excluded.allowed;

insert into warehouses (id, code, name, address, city, manager, phone, email, capacity, active)
values
  ('00000000-0000-0000-0000-000000000010', 'WH-001', 'Main Warehouse', 'KG 123 St', 'Kigali', 'Primary Admin', '+250788000001', 'main@itg.local', 1000, true),
  ('00000000-0000-0000-0000-000000000011', 'WH-002', 'Secondary Warehouse', 'KG 456 St', 'Kigali', 'Secondary Admin', '+250788000002', 'secondary@itg.local', 500, true)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  address = excluded.address,
  city = excluded.city,
  manager = excluded.manager,
  phone = excluded.phone,
  email = excluded.email,
  capacity = excluded.capacity,
  active = excluded.active,
  updated_at = now();

insert into brands (id, name, active)
values
  ('00000000-0000-0000-0000-000000000020', 'Apple', true),
  ('00000000-0000-0000-0000-000000000021', 'Bose', true),
  ('00000000-0000-0000-0000-000000000022', 'Sony', true)
on conflict (id) do update set
  name = excluded.name,
  active = excluded.active;

insert into product_categories (id, name, active)
values
  ('00000000-0000-0000-0000-000000000030', 'Audio', true),
  ('00000000-0000-0000-0000-000000000031', 'Tablets', true)
on conflict (id) do update set
  name = excluded.name,
  active = excluded.active;

insert into products (id, code, name, brand_id, category_id, unit, type, blend, cost_price, selling_price, active)
values
  ('00000000-0000-0000-0000-000000000040', 'P-001', 'AirPods Pro', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000030', 'Piece', 'Product', false, 180000.00, 249000.00, true),
  ('00000000-0000-0000-0000-000000000041', 'P-002', 'Sony WH-1000XM5', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000030', 'Piece', 'Product', false, 260000.00, 349000.00, true),
  ('00000000-0000-0000-0000-000000000042', 'P-003', 'Bose QuietComfort', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000030', 'Piece', 'Product', false, 220000.00, 299000.00, true)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  brand_id = excluded.brand_id,
  category_id = excluded.category_id,
  unit = excluded.unit,
  type = excluded.type,
  blend = excluded.blend,
  cost_price = excluded.cost_price,
  selling_price = excluded.selling_price,
  active = excluded.active,
  updated_at = now();

insert into product_barcodes (id, product_id, barcode, is_primary)
values
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000040', 'BC-P001', true),
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000041', 'BC-P002', true),
  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000042', 'BC-P003', true)
on conflict (id) do update set
  product_id = excluded.product_id,
  barcode = excluded.barcode,
  is_primary = excluded.is_primary;

insert into customers (id, name, type, email, phone, country, city, opening_balance, credit_limit)
values
  ('00000000-0000-0000-0000-000000000060', 'Jane Doe', 'Individual', 'jane.doe@example.local', '+250788100001', 'Rwanda', 'Kigali', 0.00, 500000.00),
  ('00000000-0000-0000-0000-000000000061', 'Acme Ltd', 'Business', 'acme@example.local', '+250788100002', 'Rwanda', 'Kigali', 0.00, 1000000.00),
  ('00000000-0000-0000-0000-000000000062', 'Samuel Green', 'Individual', 'samuel.green@example.local', '+250788100003', 'Rwanda', 'Butare', 0.00, 300000.00)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  email = excluded.email,
  phone = excluded.phone,
  country = excluded.country,
  city = excluded.city,
  opening_balance = excluded.opening_balance,
  credit_limit = excluded.credit_limit,
  updated_at = now();

insert into suppliers (id, name, contact, email, phone, country, city, opening_balance, credit_limit)
values
  ('00000000-0000-0000-0000-000000000070', 'Tech Distribution', 'Operations Desk', 'tech@example.local', '+250788200001', 'Rwanda', 'Kigali', 0.00, 2000000.00),
  ('00000000-0000-0000-0000-000000000071', 'Audio Supply Co.', 'Sales Desk', 'audio@example.local', '+250788200002', 'Rwanda', 'Kigali', 0.00, 1500000.00),
  ('00000000-0000-0000-0000-000000000072', 'Global Gadgets', 'Support Desk', 'gadgets@example.local', '+250788200003', 'Uganda', 'Kampala', 0.00, 1200000.00)
on conflict (id) do update set
  name = excluded.name,
  contact = excluded.contact,
  email = excluded.email,
  phone = excluded.phone,
  country = excluded.country,
  city = excluded.city,
  opening_balance = excluded.opening_balance,
  credit_limit = excluded.credit_limit,
  updated_at = now();

insert into document_sequences (key, prefix, next_number)
values
  ('sale', 'SL_', 3),
  ('purchase', 'PO_', 2),
  ('sale_return', 'SR_', 2),
  ('purchase_return', 'PR_', 1),
  ('payment', 'PAY_', 3),
  ('expense', 'EXP_', 3),
  ('stock_adjustment', 'ADJ_', 3),
  ('stock_transfer', 'TR_', 3)
on conflict (key) do update set
  prefix = excluded.prefix,
  next_number = excluded.next_number,
  updated_at = now();

insert into stock_balances (product_id, warehouse_id, quantity_on_hand, reorder_point, critical_point, average_cost)
values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000010', 25, 10, 5, 180000.00),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000010', 12, 5, 2, 260000.00),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000010', 8, 10, 5, 220000.00)
on conflict (product_id, warehouse_id) do update set
  quantity_on_hand = excluded.quantity_on_hand,
  reorder_point = excluded.reorder_point,
  critical_point = excluded.critical_point,
  average_cost = excluded.average_cost,
  updated_at = now();

insert into stock_movements (id, product_id, warehouse_id, movement_type, quantity_delta, balance_after, reference_type, reference_id, occurred_at, note, created_by)
values
  ('00000000-0000-0000-0000-000000000080', '00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000010', 'purchase', 30, 30, 'purchase', '00000000-0000-0000-0000-000000000140', '2026-11-01', 'Opening stock', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000010', 'purchase', 15, 15, 'purchase', '00000000-0000-0000-0000-000000000141', '2026-11-02', 'Opening stock', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000010', 'sale', -5, 25, 'sale', '00000000-0000-0000-0000-000000000100', '2026-11-10', 'Seed sale', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  product_id = excluded.product_id,
  warehouse_id = excluded.warehouse_id,
  movement_type = excluded.movement_type,
  quantity_delta = excluded.quantity_delta,
  balance_after = excluded.balance_after,
  reference_type = excluded.reference_type,
  reference_id = excluded.reference_id,
  occurred_at = excluded.occurred_at,
  note = excluded.note,
  created_by = excluded.created_by;

insert into stock_adjustments (id, reference, date, product_id, warehouse_id, quantity_delta, reason, note, created_by)
values
  ('00000000-0000-0000-0000-000000000090', 'ADJ_0001', '2026-11-12', '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000010', -2, 'Damaged', 'Damaged during handling', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000091', 'ADJ_0002', '2026-11-13', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000010', 3, 'Stock count', 'Count correction', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set
  reference = excluded.reference,
  date = excluded.date,
  product_id = excluded.product_id,
  warehouse_id = excluded.warehouse_id,
  quantity_delta = excluded.quantity_delta,
  reason = excluded.reason,
  note = excluded.note,
  created_by = excluded.created_by;

insert into stock_transfers (id, reference, from_warehouse_id, to_warehouse_id, product_id, quantity, date, note, created_by)
values
  ('00000000-0000-0000-0000-0000000000a0', 'TR_0001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000041', 4, '2026-11-14', 'Rebalance stock', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000a1', 'TR_0002', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000040', 3, '2026-11-15', 'Rebalance stock', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set
  reference = excluded.reference,
  from_warehouse_id = excluded.from_warehouse_id,
  to_warehouse_id = excluded.to_warehouse_id,
  product_id = excluded.product_id,
  quantity = excluded.quantity,
  date = excluded.date,
  note = excluded.note,
  created_by = excluded.created_by;

insert into sales (id, reference, date, customer_id, warehouse_id, seller_id, status, currency, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_method, shipping_status, note, created_by)
values
  ('00000000-0000-0000-0000-000000000100', 'SL_00001', '2026-11-10', '00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Completed', 'RWF', 249000.00, 0.00, 0.00, 249000.00, 249000.00, 'MTN MoMo', 'Delivered', 'Seed sale', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000101', 'SL_00002', '2026-11-11', '00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Completed', 'RWF', 349000.00, 5000.00, 0.00, 344000.00, 172000.00, 'Bank Account', 'Delivered', 'Seed sale', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000102', 'SL_00003', '2026-11-16', '00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'Ordered', 'RWF', 299000.00, 0.00, 0.00, 299000.00, 0.00, 'Cash', 'Pending', 'Seed sale', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set
  reference = excluded.reference,
  date = excluded.date,
  customer_id = excluded.customer_id,
  warehouse_id = excluded.warehouse_id,
  seller_id = excluded.seller_id,
  status = excluded.status,
  currency = excluded.currency,
  subtotal = excluded.subtotal,
  discount_amount = excluded.discount_amount,
  tax_amount = excluded.tax_amount,
  total_amount = excluded.total_amount,
  paid_amount = excluded.paid_amount,
  payment_method = excluded.payment_method,
  shipping_status = excluded.shipping_status,
  note = excluded.note,
  created_by = excluded.created_by,
  updated_at = now();

insert into sale_items (id, sale_id, product_id, name_snapshot, code_snapshot, quantity, unit_price, discount_amount, tax_amount, line_total, sort_order)
values
  ('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000040', 'AirPods Pro', 'P-001', 1, 249000.00, 0.00, 0.00, 249000.00, 0),
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000041', 'Sony WH-1000XM5', 'P-002', 1, 349000.00, 5000.00, 0.00, 344000.00, 0),
  ('00000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000042', 'Bose QuietComfort', 'P-003', 1, 299000.00, 0.00, 0.00, 299000.00, 0)
on conflict (id) do update set
  sale_id = excluded.sale_id,
  product_id = excluded.product_id,
  name_snapshot = excluded.name_snapshot,
  code_snapshot = excluded.code_snapshot,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  discount_amount = excluded.discount_amount,
  tax_amount = excluded.tax_amount,
  line_total = excluded.line_total,
  sort_order = excluded.sort_order;

insert into sale_returns (id, reference, date, sale_id, customer_id, warehouse_id, reason, resolution, status, refund_method, amount, restock, note, created_by)
values
  ('00000000-0000-0000-0000-000000000120', 'SR_00001', '2026-11-12', '00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000010', 'Defective item', 'Refund', 'Completed', 'MTN MoMo', 249000.00, true, 'Seed return', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000121', 'SR_00002', '2026-11-13', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000010', 'Wrong item delivered', 'Store Credit', 'Pending', 'Bank Account', 344000.00, true, 'Seed return', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set
  reference = excluded.reference,
  date = excluded.date,
  sale_id = excluded.sale_id,
  customer_id = excluded.customer_id,
  warehouse_id = excluded.warehouse_id,
  reason = excluded.reason,
  resolution = excluded.resolution,
  status = excluded.status,
  refund_method = excluded.refund_method,
  amount = excluded.amount,
  restock = excluded.restock,
  note = excluded.note,
  created_by = excluded.created_by,
  updated_at = now();

insert into sale_return_items (id, sale_return_id, product_id, name_snapshot, code_snapshot, quantity, unit_price, line_total)
values
  ('00000000-0000-0000-0000-000000000130', '00000000-0000-0000-0000-000000000120', '00000000-0000-0000-0000-000000000040', 'AirPods Pro', 'P-001', 1, 249000.00, 249000.00),
  ('00000000-0000-0000-0000-000000000131', '00000000-0000-0000-0000-000000000121', '00000000-0000-0000-0000-000000000041', 'Sony WH-1000XM5', 'P-002', 1, 344000.00, 344000.00)
on conflict (id) do update set
  sale_return_id = excluded.sale_return_id,
  product_id = excluded.product_id,
  name_snapshot = excluded.name_snapshot,
  code_snapshot = excluded.code_snapshot,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  line_total = excluded.line_total;

insert into purchases (id, reference, date, supplier_id, buyer_id, warehouse_id, status, currency, subtotal, discount_amount, tax_amount, total_amount, paid_amount, payment_method, shipping_status, note, created_by)
values
  ('00000000-0000-0000-0000-000000000140', 'PO_00001', '2026-11-01', '00000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Received', 'RWF', 180000.00, 0.00, 0.00, 180000.00, 180000.00, 'Bank Account', 'Received', 'Seed purchase', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000141', 'PO_00002', '2026-11-02', '00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'Pending', 'RWF', 260000.00, 0.00, 0.00, 260000.00, 130000.00, 'MTN MoMo', 'Pending', 'Seed purchase', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set
  reference = excluded.reference,
  date = excluded.date,
  supplier_id = excluded.supplier_id,
  buyer_id = excluded.buyer_id,
  warehouse_id = excluded.warehouse_id,
  status = excluded.status,
  currency = excluded.currency,
  subtotal = excluded.subtotal,
  discount_amount = excluded.discount_amount,
  tax_amount = excluded.tax_amount,
  total_amount = excluded.total_amount,
  paid_amount = excluded.paid_amount,
  payment_method = excluded.payment_method,
  shipping_status = excluded.shipping_status,
  note = excluded.note,
  created_by = excluded.created_by,
  updated_at = now();

insert into purchase_items (id, purchase_id, product_id, name_snapshot, code_snapshot, quantity, unit_price, discount_amount, tax_amount, line_total, sort_order)
values
  ('00000000-0000-0000-0000-000000000150', '00000000-0000-0000-0000-000000000140', '00000000-0000-0000-0000-000000000040', 'AirPods Pro', 'P-001', 1, 180000.00, 0.00, 0.00, 180000.00, 0),
  ('00000000-0000-0000-0000-000000000151', '00000000-0000-0000-0000-000000000141', '00000000-0000-0000-0000-000000000041', 'Sony WH-1000XM5', 'P-002', 1, 260000.00, 0.00, 0.00, 260000.00, 0)
on conflict (id) do update set
  purchase_id = excluded.purchase_id,
  product_id = excluded.product_id,
  name_snapshot = excluded.name_snapshot,
  code_snapshot = excluded.code_snapshot,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  discount_amount = excluded.discount_amount,
  tax_amount = excluded.tax_amount,
  line_total = excluded.line_total,
  sort_order = excluded.sort_order;

insert into purchase_returns (id, reference, date, purchase_id, supplier_id, warehouse_id, reason, resolution, status, refund_method, amount, deduct_stock, note, created_by)
values
  ('00000000-0000-0000-0000-000000000160', 'PR_00001', '2026-11-05', '00000000-0000-0000-0000-000000000140', '00000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000010', 'Damaged goods', 'Credit Note', 'Completed', 'Bank Account', 180000.00, true, 'Seed return', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  reference = excluded.reference,
  date = excluded.date,
  purchase_id = excluded.purchase_id,
  supplier_id = excluded.supplier_id,
  warehouse_id = excluded.warehouse_id,
  reason = excluded.reason,
  resolution = excluded.resolution,
  status = excluded.status,
  refund_method = excluded.refund_method,
  amount = excluded.amount,
  deduct_stock = excluded.deduct_stock,
  note = excluded.note,
  created_by = excluded.created_by,
  updated_at = now();

insert into purchase_return_items (id, purchase_return_id, product_id, name_snapshot, code_snapshot, quantity, unit_price, line_total)
values
  ('00000000-0000-0000-0000-000000000170', '00000000-0000-0000-0000-000000000160', '00000000-0000-0000-0000-000000000040', 'AirPods Pro', 'P-001', 1, 180000.00, 180000.00)
on conflict (id) do update set
  purchase_return_id = excluded.purchase_return_id,
  product_id = excluded.product_id,
  name_snapshot = excluded.name_snapshot,
  code_snapshot = excluded.code_snapshot,
  quantity = excluded.quantity,
  unit_price = excluded.unit_price,
  line_total = excluded.line_total;

insert into payments (id, reference, direction, source_type, source_id, party_type, party_id, method, amount, paid_at, note, created_by)
values
  ('00000000-0000-0000-0000-000000000180', 'PAY_00001', 'incoming', 'sale', '00000000-0000-0000-0000-000000000100', 'customer', '00000000-0000-0000-0000-000000000060', 'MTN MoMo', 249000.00, '2026-11-10', 'Seed payment', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000181', 'PAY_00002', 'incoming', 'sale', '00000000-0000-0000-0000-000000000101', 'customer', '00000000-0000-0000-0000-000000000061', 'Bank Account', 172000.00, '2026-11-11', 'Seed payment', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000182', 'PAY_00003', 'outgoing', 'purchase', '00000000-0000-0000-0000-000000000140', 'supplier', '00000000-0000-0000-0000-000000000070', 'Bank Account', 180000.00, '2026-11-01', 'Seed payment', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  reference = excluded.reference,
  direction = excluded.direction,
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  party_type = excluded.party_type,
  party_id = excluded.party_id,
  method = excluded.method,
  amount = excluded.amount,
  paid_at = excluded.paid_at,
  note = excluded.note,
  created_by = excluded.created_by;

insert into payment_allocations (payment_id, target_type, target_id, amount)
values
  ('00000000-0000-0000-0000-000000000180', 'sale', '00000000-0000-0000-0000-000000000100', 249000.00),
  ('00000000-0000-0000-0000-000000000181', 'sale', '00000000-0000-0000-0000-000000000101', 172000.00),
  ('00000000-0000-0000-0000-000000000182', 'purchase', '00000000-0000-0000-0000-000000000140', 180000.00)
on conflict (payment_id, target_type, target_id) do update set
  amount = excluded.amount;

insert into expense_categories (id, name, active)
values
  ('00000000-0000-0000-0000-000000000190', 'Rent', true),
  ('00000000-0000-0000-0000-000000000191', 'Utilities', true),
  ('00000000-0000-0000-0000-000000000192', 'Transport', true)
on conflict (id) do update set
  name = excluded.name,
  active = excluded.active;

insert into expenses (id, reference, date, category_id, vendor, description, amount, payment_method, status, note, created_by)
values
  ('00000000-0000-0000-0000-0000000001a0', 'EXP_0001', '2026-11-03', '00000000-0000-0000-0000-000000000190', 'Property Owner', 'Monthly rent', 500000.00, 'Bank Account', 'Paid', 'Seed expense', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000001a1', 'EXP_0002', '2026-11-04', '00000000-0000-0000-0000-000000000191', 'Utility Provider', 'Electricity and water', 120000.00, 'MTN MoMo', 'Pending', 'Seed expense', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-0000000001a2', 'EXP_0003', '2026-11-06', '00000000-0000-0000-0000-000000000192', 'Transport Vendor', 'Delivery transport', 45000.00, 'Cash', 'Paid', 'Seed expense', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set
  reference = excluded.reference,
  date = excluded.date,
  category_id = excluded.category_id,
  vendor = excluded.vendor,
  description = excluded.description,
  amount = excluded.amount,
  payment_method = excluded.payment_method,
  status = excluded.status,
  note = excluded.note,
  created_by = excluded.created_by,
  updated_at = now();

insert into app_settings (
  id,
  company,
  localization,
  inventory,
  sales_pos,
  purchasing,
  finance,
  notifications,
  security,
  appearance,
  documents,
  integrations,
  system,
  updated_by
)
values (
  true,
  '{"name":"ITG","email":"info@itg.local","phone":"+250788000000","address":"Kigali, Rwanda"}',
  '{"currencyCode":"RWF","currencySymbol":"FRw","currencyPosition":"After","timezone":"Africa/Kigali","dateFormat":"DD/MM/YYYY"}',
  '{"lowStockThreshold":10,"criticalStockThreshold":5,"trackBarcodes":true,"allowNegativeStock":false}',
  '{"receiptFooter":"Thank you for your business.","defaultWarehouseCode":"WH-001","taxEnabled":false}',
  '{"defaultSupplierId":null,"autoGenerateReference":true,"requireApproval":false}',
  '{"defaultPaymentMethod":"Cash","openingBalanceAccount":"Customer Balances"}',
  '{"emailAlerts":false,"inAppAlerts":true,"lowStockAlerts":true}',
  '{"requireStrongPasswords":true,"sessionHours":8,"allowRememberMe":true}',
  '{"theme":"light","accentColor":"#456A63","compactMode":false}',
  '{"invoicePrefix":"INV_","receiptPrefix":"RCP_","showLogo":true}',
  '{"storageProvider":"neon-object-storage","emailProvider":null}',
  '{"version":"0.1.0","maintenanceMode":false}',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set
  company = excluded.company,
  localization = excluded.localization,
  inventory = excluded.inventory,
  sales_pos = excluded.sales_pos,
  purchasing = excluded.purchasing,
  finance = excluded.finance,
  notifications = excluded.notifications,
  security = excluded.security,
  appearance = excluded.appearance,
  documents = excluded.documents,
  integrations = excluded.integrations,
  system = excluded.system,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into notifications (id, user_id, kind, category, tone, title, description, href, occurred_at)
values
  ('00000000-0000-0000-0000-0000000001b0', '00000000-0000-0000-0000-000000000001', 'alert', 'stock', 'warning', 'Low stock', 'Bose QuietComfort is below its reorder point.', '/stock', '2026-11-16T08:00:00Z'),
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-000000000001', 'activity', 'sales', 'success', 'Sale completed', 'SL_00001 was completed.', '/sales', '2026-11-10T14:30:00Z'),
  ('00000000-0000-0000-0000-0000000001b2', '00000000-0000-0000-0000-000000000002', 'activity', 'purchase', 'info', 'Purchase received', 'PO_00001 was received.', '/purchases', '2026-11-01T10:15:00Z')
on conflict (id) do update set
  user_id = excluded.user_id,
  kind = excluded.kind,
  category = excluded.category,
  tone = excluded.tone,
  title = excluded.title,
  description = excluded.description,
  href = excluded.href,
  occurred_at = excluded.occurred_at;

insert into announcements (id, title, body, category, date, tone, icon, created_by)
values
  ('00000000-0000-0000-0000-0000000001c0', 'Scheduled maintenance', 'The system will be unavailable during the maintenance window.', 'Operations', '2026-11-17', 'warning', 'warning', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000001c1', 'Sales reports updated', 'Sales reports now include preset date ranges.', 'Product', '2026-11-18', 'success', 'check', '00000000-0000-0000-0000-000000000002')
on conflict (id) do update set
  title = excluded.title,
  body = excluded.body,
  category = excluded.category,
  date = excluded.date,
  tone = excluded.tone,
  icon = excluded.icon,
  created_by = excluded.created_by,
  updated_at = now();

insert into announcement_reads (announcement_id, user_id, read_at)
values
  ('00000000-0000-0000-0000-0000000001c0', '00000000-0000-0000-0000-000000000001', '2026-11-17T09:00:00Z'),
  ('00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-000000000002', '2026-11-18T09:00:00Z')
on conflict (announcement_id, user_id) do update set
  read_at = excluded.read_at;

insert into audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
select '00000000-0000-0000-0000-000000000001', 'SEED_DATA_LOADED', 'app_users', 'admin@itg.local', null::jsonb, '{"count":2}'::jsonb
where not exists (
  select 1 from audit_logs
  where action = 'SEED_DATA_LOADED' and entity_type = 'app_users' and entity_id = 'admin@itg.local'
);

insert into audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
select '00000000-0000-0000-0000-000000000001', 'SEED_DATA_LOADED', 'transaction_tables', 'sales', null::jsonb, '{"count":3}'::jsonb
where not exists (
  select 1 from audit_logs
  where action = 'SEED_DATA_LOADED' and entity_type = 'transaction_tables' and entity_id = 'sales'
);

insert into audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
select '00000000-0000-0000-0000-000000000002', 'SEED_DATA_LOADED', 'transaction_tables', 'purchases', null::jsonb, '{"count":2}'::jsonb
where not exists (
  select 1 from audit_logs
  where action = 'SEED_DATA_LOADED' and entity_type = 'transaction_tables' and entity_id = 'purchases'
);

commit;
