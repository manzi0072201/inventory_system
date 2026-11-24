# Stocky Inventory System User Guide

A practical guide to using the inventory workspace from first sign-in to end-of-day closeout.

Version 1.0 - November 2026

## Table of contents

1. Before you begin
2. Sign in and get oriented
3. Dashboard
4. Products
5. Warehouses
6. Stock management
7. Customers and people
8. Suppliers
9. Sales
10. Sales returns
11. Purchases
12. Purchase returns
13. Debtors and payments
14. Expenses
15. Reports
16. Notifications and announcements
17. Profile, employees, settings, and audit logs
18. End-to-end working routines
19. Status reference
20. Troubleshooting
21. Permission quick reference
22. Best-practice checklist

## Before you begin

### What this guide covers

This guide explains how to use the Stocky inventory workspace in normal daily work. It starts with signing in, explains every major area of the application, and finishes with opening, closing, and review routines.

The system records four kinds of activity:

- Catalog records: products, warehouses, customers, suppliers, and employees.
- Stock records: balances, adjustments, and movement history.
- Transactions: sales, purchases, returns, payments, and expenses.
- Insight records: dashboard figures, reports, notifications, announcements, and audit logs.

### Production address

Open the frontend application at:

https://inventory-system-frontend-five-chi.vercel.app

Your administrator provides your login email and password. If your browser redirects you to the sign-in page, sign in and continue to the page you originally requested.

### Terms used in this guide

| Term | Meaning |
| --- | --- |
| Super Admin | Full-access role. Can manage users, settings, and all modules. |
| Shop Admin | Role limited by module permissions. Default access covers daily sales, products, stock, customers, debtors, payments, reports, and notifications. |
| Permission | A switch that allows a module. Super Admins bypass all module checks. |
| Warehouse | A physical stock location or shop zone. |
| Product | A sellable catalog item with cost, price, category, brand, and unit. |
| Stock balance | The current quantity of a product in a warehouse. |
| Sale | A customer transaction. Completed sales reduce stock and can create incoming payments. |
| Purchase | A supplier transaction. Received purchases increase stock and can create outgoing payments. |
| Return | A correction document that restores or removes stock and may reverse money. |
| Payment | Money recorded against a sale, purchase, return, or expense. |
| Audit log | A read-only record of who changed what and when. |

### Golden rules

- Only Completed sales and Received purchases change stock.
- Only returns with status Completed change stock or create refund records.
- Pending and Ordered documents are open work. They do not move stock.
- Cancelled documents do not count in active totals.
- The Payments page is a history view. Payment methods are normally set on the source document.
- If a sidebar link is missing, your role does not have permission for that module.

## Sign in and get oriented

### Sign in

1. Open the production address.
2. On the Sign in page, enter your Email address.
3. Enter your Password.
4. Use Show password or Hide password if needed.
5. Select Sign in.
6. While the request runs, the button shows Signing in...
7. On success, the app opens the dashboard or the safe page you originally requested.

If sign-in fails, the exact error is displayed. A suspended account shows: This account is suspended. Contact your administrator if this happens.

### If you forget your password

1. Open Forgot password from the sign-in page.
2. The recovery page explains that password recovery is administrator-assisted.
3. Use the email address you sign in with.
4. Ask your administrator to reset the password.
5. Sign in again with the new password.

### Understand your role

| Role | UI label | Access |
| --- | --- | --- |
| super_admin | Super Admin | Full access to every module, settings, user management, and audit activity. |
| admin | Shop Admin | Access is controlled by module permissions. Settings and user management are always blocked. |

Account status is either Active or Suspended. Active users can sign in. Suspended users cannot use their credentials until an administrator reactivates them.

### Understand permissions

Super Admins have every permission. Shop Admins use the following defaults unless an administrator changes them:

| Module group | Modules allowed by default for Shop Admin |
| --- | --- |
| Shop and Sales | Sales & POS, Sales Returns, Customers, Debtors, Payments |
| Inventory | Products, Stock Management |
| Purchasing | None by default |
| Finance and Insights | Reports |
| Administration | Notifications |

Warehouses, Purchases, Purchase Returns, Suppliers, Expenses, Settings, and Announcements are not granted by default.

If you try to open a page you do not have permission for, the application redirects you to the dashboard with a denied notice. If the backend rejects the action, the message is: You do not have access to this resource.

### Learn the application shell

The application has three main areas:

- Sidebar: the primary navigation. Groups include Main, Inventory, Sales, Purchasing, People and Contacts, Money, Analytics, and Administration.
- Topbar: POS shortcut, History, Notifications, language selector, fullscreen control, theme switch, and account menu.
- Main content: the current page.

Available page paths include:

| Area | Page | Path |
| --- | --- | --- |
| Main | Dashboard | / |
| Main | Announcements | /announcements |
| Inventory | Products | /products |
| Inventory | Stock | /stock |
| Inventory | Warehouses | /warehouses |
| Sales | Sales | /sales |
| Sales | Sales Returns | /sales-return |
| Purchasing | Purchases | /purchases |
| Purchasing | Purchase Returns | /purchase-return |
| People and Contacts | Customers / People | /people |
| People and Contacts | Suppliers | /suppliers |
| Money | Debtors | /debtors |
| Money | Payments | /payments |
| Money | Expenses | /expenses |
| Analytics | Reports | /reports |
| Administration | Audit Logs | /audit-logs |
| Administration | Employees and Roles | /user-management |
| Administration | Settings | /settings |
| Account | Profile | /profile |

### Sign out

1. Open the account menu in the top-right corner.
2. Select Sign out.
3. The button shows Signing out... while the request runs.
4. The application clears the browser session and returns you to the sign-in page.
5. The backend records an auth.sign_out audit event.

Always sign out at the end of a shift, especially on shared computers.

## Dashboard

### Open the dashboard

The dashboard is the home page at /. The path /dashboard redirects there. Every signed-in user can open it.

### Choose a reporting view

1. Select a range tab: Today, 7D, 30D, MTD, YTD, or Custom.
2. If you choose Custom, set From and To dates.
3. Choose a warehouse or leave All warehouses selected.
4. Choose a display currency: RWF, USD, or EUR.
5. Select Refresh to reload the figures.

### Review the key numbers

| Card | Meaning |
| --- | --- |
| Sales | Total filtered sales. |
| Purchases | Total filtered purchases. |
| Sales Return | Total value of sales returns. |
| Purchases Return | Total value of purchase returns. |
| Profit | Sales minus sales returns, minus purchases, plus purchase returns. |

The dashboard also shows Sales and Purchases, Top Selling Products, Payment Sent and Received, Top customers, Sales by Payment, Stock Alert, and Recent Sales panels.

Stock Alert lists products where reorder point is greater than zero and quantity on hand is at or below that point in the selected warehouse.

### Use quick actions

Quick actions are permission-filtered. Depending on your role you can open:

- POS, which goes to /sales.
- New sale, which goes to /sales/create.
- New purchase, which goes to /purchases/create.
- Add product, which goes to /products/create.
- Add customer, which goes to /people/create.
- Reports, which goes to /reports.

The dashboard is informational. Viewing it does not create stock movements, payments, or transactions.

## Products

### Open products

Go to Inventory > Products at /products. This page requires the products permission.

### Find a product

Use the filters for Code Product, Product Name, Category, Brand, and Warehouse. You can switch between table and card view. Sort by Name, Code, Cost, Price, Brand, Category, Quantity, or createdAt. Pagination options are 10, 25, 50, and 100 rows.

### Create a product

1. Select Create product.
2. Enter Product Name.
3. Enter Code Product. The system suggests codes such as EL-####.
4. Choose Brand and Category.
5. Choose Product Type: Single or Variable.
6. Choose Unit. Common units include pc, kg, g, l, ml, box, pack, and set.
7. Enter Cost and Price.
8. Enter Quantity if you are recording the starting quantity at creation.
9. Choose Warehouse.
10. Add an image and image background if needed.
11. Submit the form.

Required fields are name, code, brand, category, and warehouse. Duplicate product codes are rejected.

Important: the product form quantity is a catalog starting value. It is not a stock movement. Ongoing on-hand quantity comes from stock balances and changes through stock adjustments, sales, purchases, and returns.

### Edit or delete a product

Use the row menu named Product actions and choose View, Edit, or Delete. Delete asks for confirmation: Delete product name? This cannot be undone.

Deleting a product deactivates it and soft-deletes the record. Managed product images are removed.

### Import products

1. Select Import products.
2. In the Import Products dialog, select Download template CSV.
3. Fill the CSV.
4. Required columns are Name, Code, Brand, Category, Warehouse, Cost, Price, and Quantity.
5. Optional columns are Type, Unit, Image URL, and Thumbnail Background.
6. Upload the CSV and review the result.

### Export products

Use PDF or Excel from the product list to export the current product catalog.

## Warehouses

### Open warehouses

Go to Inventory > Warehouses at /warehouses. This page requires the warehouses permission. Shop Admins do not have this permission by default.

### Review a warehouse card

Each warehouse card shows:

- Products assigned to the warehouse.
- Units currently held.
- Stock value.
- Capacity used.
- A count such as n of capacity units.
- Health label: Needs attention, Low stock, or Healthy.

### Create or edit a warehouse

1. Select Add warehouse or Edit warehouse.
2. Warehouse Code is generated automatically.
3. Enter Warehouse Name.
4. Add Manager, Phone, Email, City, and Address if needed.
5. Enter Capacity (units). It must be greater than zero.
6. Select Create warehouse or Save changes.
7. Select Cancel to leave without saving.

Warehouse Name is required and must be unique. Email must be valid if provided.

### Delete a warehouse

Select Delete warehouse and confirm. A warehouse cannot be deleted while products are assigned to it. The system asks you to move those products first.

Warehouses do not create stock or payment movements by themselves. They are locations used by stock balances and transactions.

## Stock management

### Open stock

Go to Inventory > Stock at /stock. This page requires the stock permission.

### Find stock records

Filter by Warehouse, Category, Brand, and Status. Use Search stock for a quick lookup. Table Columns controls which columns appear, and Refresh Table reloads data. Row actions include View stock details and Adjust Stock. Movement history has a Load More control.

The summary cards show Total Stock Units, Stock Value, Low Stock Items, and Out of Stock.

### Understand stock status

| Status | Meaning |
| --- | --- |
| Not Stocked | No balance row exists for that product and warehouse. |
| Out of Stock | Quantity on hand is zero or less. |
| Low Stock | Quantity is at or below the reorder point or critical point. |
| In Stock | Quantity is above the alert thresholds. |

Stock Value is unit cost multiplied by quantity on hand.

### Adjust stock

1. Open /stock/adjust, or select Adjust Stock from a stock row or stock detail page.
2. Choose a mode:
   - Add stock: increase the balance.
   - Remove stock: decrease the balance.
   - Set stock level: set the target balance.
3. Select Product and Warehouse.
4. Optionally filter by Category and Brand.
5. Review Current Stock.
6. Enter Quantity.
7. Choose Reason: Stock count, Damaged, Returned, Transfer, or Other.
8. Add a Note if needed.
9. Select Save Adjustment.

Positive adjustments can create a missing stock balance. Negative adjustments cannot drive the balance below zero. If the system reports Insufficient stock; the adjustment was not recorded., lower the removal quantity.

### How transactions affect stock

| Event | Effect |
| --- | --- |
| Completed sale | Decreases stock. |
| Received purchase | Increases stock. |
| Completed sales return with restock enabled | Increases stock. |
| Completed purchase return with deduct stock enabled | Decreases stock. |
| Stock adjustment | Changes stock according to the selected mode and reason. |
| Pending or Ordered sale or purchase | No stock effect. |
| Cancelled sale or purchase | No active stock effect; reversals are applied. |

## Customers and people

### Open customers

Go to People and Contacts > People at /people. This page requires the customers permission.

### Review customer totals

The customer list shows Total Customers, Business Accounts, Total Sales, and Outstanding.

Customer outstanding is based on opening balance plus completed sales totals minus payments and completed sales returns. The frontend also calculates due amounts from sales records.

### Find a customer

Use Customer Name, Email, Customer Type, Country, and Balance filters. Balance options are All Balances, With Outstanding, and No Outstanding. The table searches name, ID, email, phone, city, country, and tax number.

The table columns are Customer, Type, Contact, Location, Orders, Total Spent, Outstanding, and Credit Limit.

### Create or edit a customer

1. Select Create customer to open /people/create, or choose Edit from the row menu.
2. Complete Customer ID and Full Name. Full Name is required.
3. Choose Customer Type. Individual is the default.
4. Add Phone, Email, Tax Number, Country, City, and Address.
5. Enter Opening balance and Credit limit. Both default to zero and cannot be negative.
6. Select Create customer or Save changes.
7. Select Cancel to leave without saving.

Renaming a customer also updates linked sales that used the old name.

### View customer details

Use View from the Customer actions menu. The details page shows account summary, opening balance, total spent, outstanding amount, last order, and related sales. If there are no related sales, it shows No sales recorded for this customer.

### Delete a customer

Use Delete from the Customer actions menu. Confirm the action. Use this carefully because customer history is linked to sales.

## Suppliers

### Open suppliers

Go to People and Contacts > Suppliers at /suppliers. This page requires the suppliers permission. Shop Admins do not have this permission by default.

### Review supplier totals

The supplier list shows Supplier, Category, Contact, Location, Orders, Total Purchased, Outstanding, and Credit Limit. Total purchased and outstanding come from linked purchase records.

### Find a supplier

Use Supplier Name, Email, Category, Country, and Balance filters. Balance options are All Balances, With Outstanding, and No Outstanding.

### Create or edit a supplier

1. Select Create supplier to open /suppliers/create, or choose Edit from the row menu.
2. Enter Supplier ID and Supplier Name. Supplier Name is required.
3. Add contact name, email, phone, country, city, address, category, and tax number.
4. Enter Opening balance and Credit limit.
5. Select Create supplier or Save changes.

Defaults are Country Rwanda and Category General Goods. Balances default to zero and cannot be negative.

Renaming a supplier also updates linked purchases that used the old name.

### Delete a supplier

Deleting a supplier asks: Delete supplier name? Their purchase history will remain unchanged. This cannot be undone.

## Sales

### Open sales

Go to Sales > Sales at /sales. This page requires the sales permission.

### Find a sale

Filter by Date, Customer, Warehouse, Status, Payment Status, and Shipping Status. Use PDF or Excel to export sales, or Create Sale to start a new sale. The row menu named Sale actions has View, Edit, and Delete.

### Create a sale

1. Select Create Sale to open /sales/create.
2. Set the Date.
3. Choose Seller.
4. Choose Customer.
5. Choose Warehouse.
6. Choose Currency.
7. Choose Status.
8. Choose Payment Method: Bank Account, MTN MoMo, Airtel Money, or Cash.
9. Choose payment choice: Pending, Paid, or Partial.
10. If you choose Partial, enter an amount greater than zero and no more than the sale total.
11. Choose discount type Fixed or Percentage, then enter Discount.
12. Add Tax and Shipping if needed.
13. Add a Note if needed.
14. Use Scan/Search Product by Code Or Name to add product rows.
15. For each row, review price, stock, quantity, discount, and tax.
16. Select Submit.

Date, customer, and warehouse are required. At least one product is required. Percentage discount cannot exceed 100. Fixed discount cannot exceed the items total. Partial paid cannot exceed the total. Order-level discount, tax, and shipping are saved with the sale and included in the recorded total.

### Understand sale status

| Status | Meaning | Stock and money effect |
| --- | --- | --- |
| Completed | Finalized sale. | Decreases stock. Paid amount creates incoming payment. |
| Pending | Open sale. | No stock effect. |
| Ordered | Open order. | No stock effect. |
| Cancelled | Voided sale. | Active effect is removed. |

Payment status is shown as Unpaid when paid is zero or less, Paid when paid is at least the total, and Partial otherwise.

Shipping status values include Delivered, Shipped, and Packed.

### View, edit, void, or delete a sale

- View opens the sale detail page with Edit sale, PDF, and Delete sale actions.
- Edit is limited to pending or ordered header details. Line items and paid amounts are not edited from this page.
- Void sets status to Cancelled, restores stock for a completed sale, and creates a reversal payment if the sale was paid.
- Delete reverses stock, removes related payments, allocations, movements, returns, and items, then deletes the sale. Deletion is blocked if reversing would make stock negative.

Use void when you need an auditable cancellation trail. Use delete only for records that were created incorrectly.

## Sales returns

### Open sales returns

Go to Sales > Sales Returns at /sales-return. This page requires the sales_returns permission.

### Find or export a sales return

Filter by search, customer, status, reason, resolution, and period. Period options are this month, last month, and this year. Use Export CSV for a downloadable list or Record Return to create a new return.

Row actions are View return, Edit return, and Delete return.

### Record a sales return

1. Select Record Return to open /sales-return/create.
2. Set Date.
3. Select the original Sale.
4. Confirm Customer and Warehouse.
5. Choose Refund method.
6. Choose Resolution: Refund, Store Credit, or Replacement.
7. Choose Status.
8. Add a Note if needed.
9. Choose whether to restock returned items.
10. Add product rows with return quantity and unit price.
11. Submit the return.

Common reasons include Damaged item, Defective item, Wrong item delivered, Customer changed mind, Late delivery, and Other.

Return quantity must be at least 1. Unit price cannot be negative. You cannot return from a cancelled sale, cannot duplicate selected sale items, and cannot return more than the remaining sold quantity.

### Understand sales return status

| Status | Meaning |
| --- | --- |
| Pending | Needs review. No stock or money effect. |
| Approved | Accepted, but not finalized. No stock or money effect. |
| Completed | Finalized. Stock and money effects are applied. |
| Rejected | Excluded from report totals. |

Only Completed returns affect the workspace. If restock is enabled, stock is added back. If resolution is Refund and the amount is greater than zero, an outgoing payment is recorded and the original sale paid amount is reduced.

### Edit or delete limitation

The UI shows Edit return and Delete return, but the backend does not currently support them. Attempts show: Editing sales returns is not available in the backend yet. or Deleting sales returns is not available in the backend yet.

Create the return carefully. If corrections are needed, ask an administrator how to handle the record.

## Purchases

### Open purchases

Go to Purchasing > Purchases at /purchases. This page requires the purchases permission. Shop Admins do not have this permission by default.

### Find a purchase

Filter by Date, Supplier, Warehouse, Status, Payment Status, and Shipping Status. Use PDF or Excel to export purchases, or Create Purchase to start a new purchase. Row actions are View, Edit, and Delete.

### Create a purchase

1. Select Create Purchase to open /purchases/create.
2. Set the Date.
3. Choose Buyer.
4. Choose Supplier.
5. Choose Warehouse.
6. Choose Currency.
7. Choose Status.
8. Choose Payment Method.
9. Choose payment choice: Pending, Paid, or Partial.
10. Choose discount type and Discount.
11. Add Tax and Shipping if needed.
12. Add a Note if needed.
13. Use Scan/Search Product by Code Or Name to add product rows.
14. Review price, stock, quantity, discount, and tax for each row.
15. Select Submit.

Date, supplier, buyer, and warehouse are required. At least one product is required. Discounts and partial amounts follow the same limits as sales. Order-level discount, tax, and shipping are saved with the purchase and included in the recorded total.

### Understand purchase status

| Status | Meaning | Stock and money effect |
| --- | --- | --- |
| Received | Finalized purchase. | Increases stock. Paid amount creates outgoing payment. |
| Pending | Open purchase. | No stock effect. |
| Ordered | Open order. | No stock effect. |
| Cancelled | Voided purchase. | Active effect is removed. |

Payment status is Unpaid, Partial, or Paid based on paid amount versus total.

### View, edit, void, or delete a purchase

- View opens details with Edit purchase, PDF, and Delete purchase.
- Edit is limited to pending or ordered header details.
- Void sets status to Cancelled, reverses stock for a received purchase, and creates an incoming reversal payment if the purchase was paid.
- Delete reverses stock and removes related payments, allocations, returns, movements, and items. It is blocked if stock would become negative.

## Purchase returns

### Open purchase returns

Go to Purchasing > Purchase Returns at /purchase-return. This page requires the purchase_returns permission. Shop Admins do not have this permission by default.

### Find or export a purchase return

Filter by search, supplier, status, reason, resolution, and period. Use Export CSV or Record Return. Row actions are View return, Edit return, and Delete return.

### Record a purchase return

1. Select Record Return to open /purchase-return/create.
2. Set Date.
3. Select the original Purchase.
4. Confirm Supplier and Warehouse.
5. Choose Refund method.
6. Choose Resolution: Refund, Replacement, or Credit Note.
7. Choose Status.
8. Add a Note if needed.
9. Choose whether to deduct stock.
10. Add product rows with return quantity and unit price.
11. Submit the return.

Common reasons include Damaged goods, Defective goods, Wrong item received, Overstock, Supplier error, and Other.

You cannot return from a cancelled purchase, cannot duplicate selected purchase items, and cannot return more than the remaining purchased quantity.

### Understand purchase return status

Only Completed purchase returns affect stock and money. Pending, Approved, and Rejected do not.

If deduct stock is enabled, stock is reduced. If resolution is Refund and the amount is greater than zero, an incoming payment is recorded and the original purchase paid amount is reduced.

### Edit or delete limitation

The backend currently exposes purchase return detail as read-only. UI edit and delete attempts show: Editing purchase returns is not available in the backend yet. or Deleting purchase returns is not available in the backend yet.

## Debtors and payments

### Debtors

Go to Money > Debtors at /debtors. This page requires the debtors permission.

Debtors are customers with outstanding balances. The page shows Total Debtors, Total Outstanding, Average Balance, and over-limit count.

Filters are Debtor Name, Email, Country, Credit Status, and Minimum Balance. Credit Status options are All Debtors, Over Credit Limit, and Within Credit Limit. Rows link to customer details and customer edit pages.

The authoritative backend calculation is opening balance plus completed sales total, minus incoming customer payments, minus completed sales returns. Only positive balances appear.

### Payments history

Go to Money > Payments at /payments. This page requires the payments permission.

The Payments page is read-only. It lists payments recorded across sales, purchases, and expenses. It does not provide a standalone Create Payment button.

Payment types are:

- Sale and sale return, shown as Sale.
- Purchase and purchase return, shown as Purchase.
- Expense, shown as Expense.

Payment methods are Bank Account, MTN MoMo, Airtel Money, and Cash. Any unknown method is displayed as Cash.

Filters are Payment Reference, Party, Payment Method, and Type. Type options are All Types, Sales, Purchases, and Expenses.

Payment reference links open the source document. Sale links open /sales/reference, purchase links open /purchases/reference, and expense links open the expense edit page.

### How payments are normally created

| Source | Payment direction | When created |
| --- | --- | --- |
| Sale with paid amount greater than zero | Incoming | On sale creation. |
| Purchase with paid amount greater than zero | Outgoing | On purchase creation. |
| Completed sales return with refund | Outgoing | On return completion. |
| Completed purchase return with refund | Incoming | On return completion. |
| Sale void with prior payment | Outgoing reversal | On void. |
| Purchase void with prior payment | Incoming reversal | On void. |
| Expense | Depends on expense setup | When the expense is recorded. |

The backend supports direct payment creation with allocations, but the standard user workflow is to set the payment amount and method on the source document.

## Expenses

### Open expenses

Go to Money > Expenses at /expenses. This page requires the expenses permission. Shop Admins do not have this permission by default.

### Review and find expenses

The page provides Record Expense, Export CSV, and summary cards. Filters are Search, Category, Payment Method, Status, and Period. Period options are All Time, This Month, Last Month, and This Year.

Summary cards exclude cancelled expenses and show active total, paid this month, pending amount, and top category.

CSV export includes Reference, Date, Category, Payee, Description, Amount, Payment Method, Status, and Note.

### Record an expense

1. Select Record Expense to open /expenses/create.
2. Enter or confirm Reference.
3. Set Date. Date is required.
4. Choose Category.
5. Choose Status. Paid is the default.
6. Enter Payee / Vendor.
7. Enter Amount.
8. Choose Payment Method. Cash is the default.
9. Enter Description.
10. Add Note if needed.
11. Select Record expense.

Payee or vendor, description, and amount are required. Amount must be greater than zero. Cancel returns to the expense list without saving.

### Edit or delete an expense

Use the row actions to edit or delete. Edit opens /expenses/id/edit and uses the same fields with Save changes. Delete confirms Delete expense reference? This cannot be undone.

On the backend, delete is a soft cancellation. Cancelled expenses are excluded from spend totals.

## Reports

### Open reports

Go to Analytics > Reports at /reports. This page requires the reports permission.

### Choose a reporting period

1. Select a preset: 7D, 30D, 90D, YTD, or All. The default is 90D.
2. Or set From and To dates.
3. Choose Warehouse.
4. Select Reset if you want to clear filters.
5. Select Print to print the primary section.
6. Select Export CSV to download all matching rows for the active tab.

The table footer shows Showing n of total records. Export CSV for the complete report.

### Report tabs

| Tab | Access rule |
| --- | --- |
| Overview | Requires Sales, Purchases, Inventory, Customers, Suppliers, and Expenses access. |
| Sales | Requires sales permission. |
| Purchases | Requires purchases permission. |
| Inventory | Requires products, stock, or warehouses permission. |
| Customers | Requires customers or debtors permission. |
| Suppliers | Requires suppliers or purchases permission. |
| Finance | Requires Sales, Purchases, Customers, Suppliers, expenses, and payments access. |

A default Shop Admin sees Sales, Inventory, and Customers. A Super Admin sees every tab.

### What each report shows

- Overview: Today at a glance, revenue purchases and expenses, payment mix, profit trend, top customers, business health, action center, and top suppliers.
- Sales: Gross sales, Collected, Outstanding, Average order, Sales returns, Net sales, sales trend, payment mix, status mix, seller performance, sales register, and returns.
- Purchases: Gross purchases, supplier payments, outstanding, average purchase, purchase returns, net purchases, trend, status mix, spend by supplier, register, and returns.
- Inventory: Stock value at cost, retail value, potential margin, units on hand, low stock, out of stock, valuation, reorder watchlist, adjustments, and movement register.
- Customers: Active customers, revenue, average customer value, closing receivables, over-limit count, concentration, aging, profitability, and balances.
- Suppliers: Active suppliers, spend, average supplier value, closing payables, purchase returns, concentration, aging, and performance.
- Finance: Net revenue, gross profit, operating expenses, net profit, net cash flow, break-even sales, profit and loss, expense categories, cash flow, payment method flow, and aging.

### Export columns

Sales export includes Date, Reference, Seller, Customer, Warehouse, Status, Payment status, Total, Paid, Due, and Payment method.

Purchases export includes Date, Reference, Supplier, Buyer, Warehouse, Status, Total, Paid, Due, and Payment method.

Inventory export includes Code, Product, Category, Brand, Warehouse, On hand, Unit, Reorder point, Status, Cost, Price, Margin percent, Stock value, and Retail value.

Customers and suppliers exports include balances and aging buckets: Current, 1-30, 31-60, 61-90, and 90+.

Export filenames follow reports-tab-start-to-end.csv.

## Notifications and announcements

### Notifications

Notifications are opened from the bell button in the topbar. There is no dedicated notifications page.

1. Select the bell button titled Notifications.
2. If unread items exist, the badge shows the count or 99+.
3. The panel groups items under Alerts and Recent activity.
4. Select Mark all read to clear unread items.
5. Select a notification to mark it read and open its linked page.

Common alerts include out-of-stock products, low-stock products, customer balances, supplier payment due dates, returns needing review, and pending expenses.

Common activity items include new sales, received purchases, returns, new customers, expenses, and stock adjustments.

### Announcements

Go to Main > Announcements at /announcements. Every signed-in user can read announcements.

1. Review the list showing title, message, category, date, and tone.
2. Use the All and Unread tabs to filter.
3. Select an unread item to mark it read.
4. Select Mark all as read to clear the unread count.
5. If you have the announcements permission, select New announcement to create one.

Announcement form fields are Title, Message, Category, Date, Tone, and Icon. Title, message, and date are required. Tone options are Danger, Warning, Success, and Info.

Edit and Delete actions are available only with the announcements permission. Delete confirmation is: Delete announcement title? This cannot be undone.

## Profile, employees, settings, and audit logs

### Profile

Open the account menu and choose Profile or Edit profile. The profile page shows your avatar, name, role, email, account ID, phone, shop zone, last sign-in, member since, and access overview.

In Edit profile, you can change your photo, full name, phone, and shop zone. Email address is read-only. Photos must be PNG, JPG, WebP, or GIF and no larger than 5 MB.

In Change password, enter Current password, New password, and Confirm new password, then select Update password. Passwords must be at least 8 characters. After a successful password change, re-sign in if your session is no longer valid.

### Employees and Roles

Go to Administration > Employees and Roles at /user-management. This page is available only to Super Admins.

The page lets a Super Admin:

- Create shop admin credentials.
- Set shop zone, phone, and account status.
- Assign module permissions.
- Reset or set passwords.
- Suspend or reactivate accounts.

The team directory shows Employee, Role / zone, Access, Status, Last login, and Actions. Super Admin rows are protected. Shop Admin rows show n / 16 modules enabled.

Create or edit a shop admin using Full name, Login email, Shop zone, Phone, password fields, Account status, and Module permissions. Permission presets are Defaults, Sales only, Allow all, and Clear.

Validation requires name, email, and shop zone. Passwords must be at least 8 characters and confirmation must match. A create succeeds with Shop admin created. Share the credentials securely.

Delete employee suspends the account. It does not physically delete the user. The confirmation says: Delete name? Their login will stop working immediately.

A Super Admin cannot change or suspend their own role or status.

### Settings

Go to Administration > Settings at /settings or open Settings from the account menu. Settings are available only to Super Admins in the UI.

The page is titled System Settings. Categories are General, Localization, Inventory, Sales & POS, Purchasing, Finance, Notifications, Security, Appearance, Documents, Integrations, and System.

To change settings:

1. Choose a category in the Configuration sidebar.
2. Edit fields in the grouped panels.
3. Review the status: Unsaved changes or All changes saved.
4. Select Discard to revert local edits.
5. Select Save changes to apply them.

The General tab controls company profile, registered address, logo, fiscal year start, and default landing page. Localization controls language, timezone, week start, date format, time format, currency, symbol position, decimals, separators, and measurement units.

Inventory controls default warehouse, unit, valuation, stock thresholds, alerts, negative stock, sales deduction, expiry tracking, SKU generation, and barcodes.

Sales and POS controls invoice numbering, default customer, payment method, tax, POS view, held orders, discounts, credit sales, loyalty, return window, and receipts.

Purchasing controls purchase numbering, default supplier, receiving warehouse, payment terms, approvals, partial receipts, tax, and return windows.

Restore defaults is available under Reset workspace settings. It resets configuration only. Company records, products, sales, and purchases are not affected.

### Audit Logs

Go to Administration > Audit Logs at /audit-logs. The page is read-only. The backend requires reports permission.

Use the Filters panel to narrow by Search, Date range, Action, Entity type, From, and To. Select Apply filters or Reset. Review the Activity timeline, expand View change details, and use Previous and Next for pagination.

Each event shows action, entity type, timestamp, actor, entity ID, IP address, and optional before, after, and device details.

CSV export includes up to 10,000 matching records and writes its own audit entry.

## End-to-end working routines

### Opening the shop

1. Sign in with your Active account.
2. Open the dashboard.
3. Set the range to Today.
4. Review Stock Alert and Recent Sales.
5. Open Notifications and handle unread alerts.
6. Open Announcements and mark new notices as read.
7. Start daily work from the dashboard quick actions.

### Receiving goods from a supplier

1. Open Suppliers and confirm the supplier exists.
2. Open Products and confirm the products exist.
3. Open Purchases and select Create Purchase.
4. Enter supplier, warehouse, date, products, quantities, prices, and payment details.
5. Use status Received only after goods are actually received.
6. Submit the purchase.
7. Open Stock and confirm balances increased.
8. Open Payments and confirm the outgoing payment appears if one was recorded.

### Selling to a customer

1. Open Sales and select Create Sale.
2. Search for the product by code or name.
3. Confirm price and available stock.
4. Add quantities, discounts, and tax.
5. Choose customer, warehouse, seller, date, and payment method.
6. Record payment as Paid, Partial, or Pending.
7. Use status Completed only when the sale is final.
8. Submit the sale.
9. Open Stock and confirm balances decreased.
10. Open Payments and confirm the incoming payment appears if one was recorded.

### Handling a customer return

1. Open the original sale from Sales.
2. Confirm the sale is not cancelled.
3. Open Sales Returns and select Record Return.
4. Select the original sale and returned products.
5. Set return quantity, unit price, resolution, and refund method.
6. Enable restock if goods return to inventory.
7. Set status to Completed only after the return is approved.
8. Submit the return.
9. Check stock and payment history.

### Handling a supplier return

1. Open the original purchase from Purchases.
2. Confirm the purchase is not cancelled.
3. Open Purchase Returns and select Record Return.
4. Select the original purchase and returned products.
5. Set return quantity, unit price, resolution, and refund method.
6. Enable deduct stock if goods leave inventory.
7. Set status to Completed only after the return is approved.
8. Submit the return.

### Recording an expense

1. Open Expenses.
2. Select Record Expense.
3. Enter date, payee, description, amount, category, status, and payment method.
4. Submit the expense.
5. Check Reports > Finance during review if you have access.

### Closing the day

1. Open Reports.
2. Choose the 7D or Today range where available.
3. Review Sales, Inventory, and Customers tabs available to your role.
4. Export CSV files needed for your records.
5. Open Payments and confirm payment entries match the day's sales and purchases.
6. Open Stock and check Low Stock Items and Out of Stock.
7. Handle unread notifications.
8. Review Announcements.
9. Open the account menu and select Sign out.

### Month-end review

1. Sign in and open Reports.
2. Set the range to the month being reviewed.
3. Review Sales, Purchases, Inventory, Customers, Suppliers, and Finance according to your role.
4. Export the reports you need.
5. Open Debtors and follow up on over-limit accounts.
6. Open Suppliers and review outstanding balances where permitted.
7. Open Audit Logs if you have access.
8. Ask a Super Admin to review Settings if business rules changed.
9. Sign out when finished.

## Status reference

### Sales

| Field | Values |
| --- | --- |
| Sale status | Completed, Pending, Ordered, Cancelled. |
| Payment status | Paid, Partial, Unpaid. |
| Shipping status | Delivered, Shipped, Packed. |

### Purchases

| Field | Values |
| --- | --- |
| Purchase status | Received, Pending, Ordered, Cancelled. |
| Payment status | Paid, Partial, Unpaid. |
| Shipping status | Delivered, Shipped, Packed. |

### Returns

| Field | Values |
| --- | --- |
| Return status | Pending, Approved, Completed, Rejected. |
| Sales return resolution | Refund, Store Credit, Replacement. |
| Purchase return resolution | Refund, Replacement, Credit Note. |

### Expenses

| Status | Meaning |
| --- | --- |
| Paid | Counted as paid spend. |
| Pending | Counted as expense total but not cash paid. |
| Cancelled | Excluded from active spend. |

### Stock movements

| Type | Reason examples |
| --- | --- |
| Purchase | Received from supplier. |
| Sale | Sold to customer. |
| Adjustment | Stock count, Damaged, Returned, Transfer, Other. |
| Transfer | Moved between locations. |

## Troubleshooting

### I cannot see a sidebar page

Your role does not have that module permission. Ask a Super Admin to review your access in Employees and Roles.

### I was redirected to the dashboard with a denied notice

You opened a page that requires a permission your account does not have. Return to an allowed page or ask an administrator.

### Sign-in says the account is suspended

An administrator suspended the account. Ask them to reactivate it.

### A sale or purchase does not reduce or increase stock

Check the document status. Only Completed sales and Received purchases move stock. Pending and Ordered documents do not.

### A payment is missing from the Payments page

Payments are created from source documents when paid amount is greater than zero. Check the original sale, purchase, return, or expense.

### Edit or delete is not available for a return

Backend editing and deletion are not currently available for sales returns or purchase returns. Create the document carefully.

### A warehouse cannot be deleted

Products are still assigned to it. Move those products to another warehouse first.

### A stock adjustment fails

The removal may drive stock below zero. Reduce the quantity or use a stock count adjustment after confirming physical stock.

### Reports show limited tabs

Report tabs are permission-filtered. A default Shop Admin sees Sales, Inventory, and Customers. A Super Admin sees all tabs.

### I forgot my password and cannot sign in

The recovery process is administrator-assisted. Contact an administrator with the email address you use to sign in.

## Permission quick reference

| Area | Permission | Default Shop Admin |
| --- | --- | --- |
| Sales | sales | Allowed |
| Sales returns | sales_returns | Allowed |
| Products | products | Allowed |
| Stock | stock | Allowed |
| Warehouses | warehouses | Blocked |
| Purchases | purchases | Blocked |
| Purchase returns | purchase_returns | Blocked |
| Customers | customers | Allowed |
| Suppliers | suppliers | Blocked |
| Debtors | debtors | Allowed |
| Payments | payments | Allowed |
| Expenses | expenses | Blocked |
| Reports | reports | Allowed |
| Notifications | notifications | Allowed |
| Announcements | announcements | Blocked |
| Settings | settings | Blocked |
| User management | Protected by role | Blocked |
| Audit logs | Backend requires reports | Usually limited |

## Best-practice checklist

- Sign out at the end of every shared-computer session.
- Keep product codes unique and descriptive.
- Set warehouses before stock adjustments.
- Use stock adjustments only for real physical differences.
- Mark sales Completed only when the transaction is final.
- Mark purchases Received only when goods are in the warehouse.
- Use Pending and Ordered statuses for open work.
- Record payment method and paid amount on the source document.
- Review Debtors before extending credit sales.
- Review Stock Alert before purchasing.
- Use report exports for end-of-day and month-end records.
- Read announcements daily.
- Keep profile details current so administrators can contact you.
- Super Admins should review audit logs regularly and share credentials securely.
