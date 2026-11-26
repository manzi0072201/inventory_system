import type { IconName } from "@/components/ui/icon";
import { expenseCategories } from "@/lib/expenses-data";
import { settingOptions, type SettingsTab, type SystemSettings } from "@/lib/settings-data";
import { seedCustomers } from "@/lib/customers-data";
import { seedSuppliers } from "@/lib/suppliers-data";
import { seedWarehouses } from "@/lib/warehouses-data";

export type SettingsFieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "password"
  | "textarea"
  | "select"
  | "date"
  | "time"
  | "logo"
  | "toggle";

export type SettingsFieldOption =
  | string
  | { value: string; label: string };

export type SettingsField = {
  key: keyof SystemSettings;
  label: string;
  type: SettingsFieldType;
  options?: SettingsFieldOption[];
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  wide?: boolean;
};

export type SettingsGroup = {
  title: string;
  description?: string;
  fields: SettingsField[];
};

export type SettingsTabConfig = {
  label: SettingsTab;
  icon: IconName;
  description: string;
  groups: SettingsGroup[];
};

const currencyOptions = settingOptions.currencies.map((currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.label}`,
}));

const warehouseOptions = seedWarehouses.map((warehouse) => warehouse.name);

const customerOptions = [
  "Walk-in Customer",
  ...seedCustomers.slice(0, 20).map((customer) => customer.name),
];

const supplierOptions = [
  { value: "", label: "No default supplier" },
  ...seedSuppliers.map((supplier) => ({
    value: supplier.name,
    label: supplier.name,
  })),
];

const expenseOptions = [
  "General",
  ...expenseCategories,
];

export const settingsTabConfig: Record<SettingsTab, SettingsTabConfig> = {
  General: {
    label: "General",
    icon: "settings",
    description: "Company identity, contact details, and workspace defaults.",
    groups: [
      {
        title: "Company profile",
        description: "This information appears on invoices, receipts, and reports.",
        fields: [
          { key: "companyName", label: "Business name", type: "text", placeholder: "Stocky Inventory" },
          { key: "legalName", label: "Legal name", type: "text" },
          {
            key: "businessType",
            label: "Business type",
            type: "select",
            options: settingOptions.businessTypes,
          },
          { key: "companyEmail", label: "Email address", type: "email" },
          { key: "companyPhone", label: "Phone number", type: "tel" },
          { key: "companyWebsite", label: "Website", type: "url" },
          { key: "taxId", label: "Tax identification number", type: "text" },
          { key: "registrationNumber", label: "Registration number", type: "text" },
        ],
      },
      {
        title: "Registered address",
        description: "Used as the default origin for documents and deliveries.",
        fields: [
          { key: "addressLine1", label: "Address line 1", type: "text", wide: true },
          { key: "addressLine2", label: "Address line 2", type: "text", wide: true },
          { key: "city", label: "City", type: "text" },
          { key: "postalCode", label: "Postal code", type: "text" },
          { key: "country", label: "Country", type: "text" },
        ],
      },
      {
        title: "Workspace defaults",
        description: "Set the default experience for everyone using this workspace.",
        fields: [
          {
            key: "logoUrl",
            label: "Company logo",
            type: "logo",
            wide: true,
            hint: "Upload from your device or paste a hosted logo URL. Used on the login screen, sidebar, and documents.",
          },
          {
            key: "fiscalYearStart",
            label: "Fiscal year starts",
            type: "text",
            placeholder: "01-01",
            hint: "Use MM-DD format, for example 01-01 for January 1.",
          },
          {
            key: "defaultLandingPage",
            label: "Default landing page",
            type: "select",
            options: settingOptions.landingPages.map((page) => ({
              value: page.value,
              label: page.label,
            })),
          },
        ],
      },
      {
        title: "App branding",
        description: "Text shown in the sidebar and page footer.",
        fields: [
          {
            key: "sidebarTitle",
            label: "Sidebar title",
            type: "text",
            placeholder: "VirtueVibe Trading",
            hint: "Bold app name shown at the top of the sidebar.",
          },
          {
            key: "sidebarSubtitle",
            label: "Sidebar subtitle",
            type: "text",
            placeholder: "Inventory",
            hint: "Text shown directly under the sidebar title.",
          },
          {
            key: "footerCopyright",
            label: "Footer copyright",
            type: "text",
            wide: true,
            placeholder: "© 2026 Virtue Vibe Trading. All rights reserved.",
          },
        ],
      },
    ],
  },
  Localization: {
    label: "Localization",
    icon: "reports",
    description: "Language, currency, formats, and measurement units.",
    groups: [
      {
        title: "Language and region",
        fields: [
          { key: "language", label: "Language", type: "select", options: settingOptions.languages },
          { key: "timezone", label: "Timezone", type: "select", options: settingOptions.timezones },
          {
            key: "weekStartsOn",
            label: "Week starts on",
            type: "select",
            options: settingOptions.weekStarts,
          },
          {
            key: "dateFormat",
            label: "Date format",
            type: "select",
            options: settingOptions.dateFormats,
          },
          {
            key: "timeFormat",
            label: "Time format",
            type: "select",
            options: settingOptions.timeFormats,
          },
        ],
      },
      {
        title: "Currency",
        description: "Currency formatting applies across sales, purchases, and reports.",
        fields: [
          { key: "currencyCode", label: "Currency", type: "select", options: currencyOptions },
          { key: "currencySymbol", label: "Currency symbol", type: "text" },
          {
            key: "currencyPosition",
            label: "Symbol position",
            type: "select",
            options: settingOptions.currencyPositions,
          },
          {
            key: "decimalPlaces",
            label: "Decimal places",
            type: "select",
            options: settingOptions.decimalPlaces.map((value) => ({
              value: String(value),
              label: String(value),
            })),
          },
          {
            key: "thousandsSeparator",
            label: "Thousands separator",
            type: "select",
            options: settingOptions.thousandsSeparators,
          },
          {
            key: "decimalSeparator",
            label: "Decimal separator",
            type: "select",
            options: settingOptions.decimalSeparators,
          },
        ],
      },
      {
        title: "Measurement units",
        fields: [
          {
            key: "weightUnit",
            label: "Default weight unit",
            type: "select",
            options: settingOptions.weightUnits,
          },
          {
            key: "dimensionUnit",
            label: "Default dimension unit",
            type: "select",
            options: settingOptions.dimensionUnits,
          },
        ],
      },
    ],
  },
  Inventory: {
    label: "Inventory",
    icon: "stock",
    description: "Stock rules, SKU generation, tracking, and valuation.",
    groups: [
      {
        title: "Stock defaults",
        fields: [
          {
            key: "defaultWarehouse",
            label: "Default warehouse",
            type: "select",
            options: warehouseOptions,
          },
          { key: "defaultUnit", label: "Default unit of measure", type: "select", options: settingOptions.units },
          {
            key: "valuationMethod",
            label: "Inventory valuation",
            type: "select",
            options: settingOptions.valuationMethods,
          },
          {
            key: "lowStockThreshold",
            label: "Low stock threshold",
            type: "number",
            min: 0,
            suffix: "units",
            hint: "Products at or below this level trigger a low stock alert.",
          },
          {
            key: "criticalStockThreshold",
            label: "Critical stock threshold",
            type: "number",
            min: 0,
            suffix: "units",
          },
          {
            key: "defaultProductTax",
            label: "Default product tax",
            type: "number",
            min: 0,
            max: 100,
            suffix: "%",
          },
        ],
      },
      {
        title: "Stock behavior",
        fields: [
          { key: "lowStockAlerts", label: "Enable low stock alerts", type: "toggle" },
          { key: "allowNegativeStock", label: "Allow negative stock", type: "toggle" },
          { key: "deductStockOnSale", label: "Deduct stock when a sale is completed", type: "toggle" },
          { key: "showOutOfStockProducts", label: "Show out-of-stock products in sales", type: "toggle" },
          { key: "autoUpdateProductCost", label: "Update product cost from purchases", type: "toggle" },
          { key: "trackBatches", label: "Track product batches", type: "toggle" },
          { key: "trackExpiry", label: "Track expiry dates", type: "toggle" },
          {
            key: "expiryAlertDays",
            label: "Expiry alert lead time",
            type: "number",
            min: 1,
            suffix: "days",
          },
          { key: "trackSerialNumbers", label: "Track serial numbers", type: "toggle" },
        ],
      },
      {
        title: "SKUs and barcodes",
        fields: [
          { key: "autoGenerateSku", label: "Auto-generate SKUs", type: "toggle" },
          { key: "skuPrefix", label: "SKU prefix", type: "text" },
          {
            key: "skuSeparator",
            label: "SKU separator",
            type: "select",
            options: [
              { value: "-", label: "Hyphen (-)" },
              { value: "/", label: "Slash (/)" },
              { value: "_", label: "Underscore (_)" },
              { value: "", label: "None" },
            ],
          },
          {
            key: "barcodeFormat",
            label: "Barcode format",
            type: "select",
            options: settingOptions.barcodeFormats,
          },
          { key: "barcodePrefix", label: "Barcode prefix", type: "text" },
        ],
      },
    ],
  },
  "Sales & POS": {
    label: "Sales & POS",
    icon: "sales",
    description: "Invoicing, point of sale behavior, discounts, and returns.",
    groups: [
      {
        title: "Invoicing",
        fields: [
          { key: "invoicePrefix", label: "Invoice prefix", type: "text" },
          { key: "nextInvoiceNumber", label: "Next invoice number", type: "number", min: 1 },
          { key: "autoGenerateInvoice", label: "Auto-generate invoice numbers", type: "toggle" },
          {
            key: "defaultCustomer",
            label: "Default customer",
            type: "select",
            options: customerOptions,
          },
          {
            key: "defaultSalesPaymentMethod",
            label: "Default payment method",
            type: "select",
            options: settingOptions.paymentMethods,
          },
          {
            key: "defaultSalesTax",
            label: "Default sales tax",
            type: "number",
            min: 0,
            max: 100,
            suffix: "%",
          },
        ],
      },
      {
        title: "POS behavior",
        fields: [
          {
            key: "posDefaultView",
            label: "POS default view",
            type: "select",
            options: ["Grid", "List"],
          },
          { key: "enablePosHold", label: "Allow held POS orders", type: "toggle" },
          { key: "allowDiscounts", label: "Allow discounts", type: "toggle" },
          {
            key: "maxDiscountPercent",
            label: "Maximum discount",
            type: "number",
            min: 0,
            max: 100,
            suffix: "%",
          },
          { key: "requireCustomer", label: "Require a customer for every sale", type: "toggle" },
          { key: "allowCreditSales", label: "Allow credit sales", type: "toggle" },
          { key: "defaultCreditLimit", label: "Default credit limit", type: "number", min: 0, suffix: "RWF" },
          { key: "requireManagerApproval", label: "Require manager approval for discounts", type: "toggle" },
        ],
      },
      {
        title: "Receipts and returns",
        fields: [
          { key: "enableLoyalty", label: "Enable loyalty points", type: "toggle" },
          {
            key: "loyaltyPointsPerAmount",
            label: "Spend required per point",
            type: "number",
            min: 1,
            suffix: "RWF",
          },
          {
            key: "salesReturnWindowDays",
            label: "Sales return window",
            type: "number",
            min: 0,
            suffix: "days",
          },
          { key: "autoPrintReceipt", label: "Auto-print receipt after checkout", type: "toggle" },
          { key: "receiptCopies", label: "Receipt copies", type: "number", min: 1, max: 5 },
          { key: "roundCashPayments", label: "Round cash payments", type: "toggle" },
        ],
      },
    ],
  },
  Purchasing: {
    label: "Purchasing",
    icon: "purchases",
    description: "Purchase orders, receiving, approvals, and supplier defaults.",
    groups: [
      {
        title: "Purchase orders",
        fields: [
          { key: "purchasePrefix", label: "Purchase order prefix", type: "text" },
          { key: "nextPurchaseNumber", label: "Next purchase number", type: "number", min: 1 },
          { key: "autoGeneratePurchase", label: "Auto-generate purchase numbers", type: "toggle" },
          { key: "defaultSupplier", label: "Default supplier", type: "select", options: supplierOptions },
          {
            key: "defaultPurchaseWarehouse",
            label: "Default receiving warehouse",
            type: "select",
            options: warehouseOptions,
          },
          {
            key: "defaultPaymentTerms",
            label: "Default payment terms",
            type: "select",
            options: settingOptions.paymentTerms,
          },
          {
            key: "defaultPurchaseStatus",
            label: "Default purchase status",
            type: "select",
            options: settingOptions.purchaseStatuses,
          },
        ],
      },
      {
        title: "Receiving and approvals",
        fields: [
          { key: "requirePurchaseApproval", label: "Require purchase approval", type: "toggle" },
          {
            key: "purchaseApprovalThreshold",
            label: "Approval threshold",
            type: "number",
            min: 0,
            suffix: "RWF",
          },
          { key: "receiveIntoStock", label: "Add received items to stock automatically", type: "toggle" },
          { key: "allowPartialReceipts", label: "Allow partial receipts", type: "toggle" },
          {
            key: "defaultPurchaseTax",
            label: "Default purchase tax",
            type: "number",
            min: 0,
            max: 100,
            suffix: "%",
          },
          {
            key: "purchaseReturnWindowDays",
            label: "Supplier return window",
            type: "number",
            min: 0,
            suffix: "days",
          },
        ],
      },
    ],
  },
  Finance: {
    label: "Finance",
    icon: "money",
    description: "Tax, banking, invoices, payments, and expense controls.",
    groups: [
      {
        title: "Tax",
        fields: [
          { key: "taxEnabled", label: "Enable tax", type: "toggle" },
          { key: "taxName", label: "Tax name", type: "text" },
          { key: "taxNumber", label: "Tax registration number", type: "text" },
          {
            key: "defaultTaxRate",
            label: "Default tax rate",
            type: "number",
            min: 0,
            max: 100,
            suffix: "%",
          },
          { key: "pricesIncludeTax", label: "Product prices include tax", type: "toggle" },
          { key: "showTaxOnReceipt", label: "Show tax breakdown on receipts", type: "toggle" },
        ],
      },
      {
        title: "Banking and mobile money",
        fields: [
          { key: "bankName", label: "Bank name", type: "text" },
          { key: "bankAccountName", label: "Account name", type: "text" },
          { key: "bankAccountNumber", label: "Account number", type: "text" },
          { key: "bankBranch", label: "Branch", type: "text" },
          { key: "swiftCode", label: "SWIFT code", type: "text" },
          { key: "mobileMoneyNumber", label: "Mobile money number", type: "tel" },
          {
            key: "defaultFinancePaymentMethod",
            label: "Default payment method",
            type: "select",
            options: settingOptions.paymentMethods,
          },
        ],
      },
      {
        title: "Invoices and payments",
        fields: [
          { key: "invoiceDueDays", label: "Invoice due after", type: "number", min: 0, suffix: "days" },
          { key: "lateFeePercent", label: "Late fee", type: "number", min: 0, max: 100, suffix: "%" },
          {
            key: "earlyPaymentDiscountPercent",
            label: "Early payment discount",
            type: "number",
            min: 0,
            max: 100,
            suffix: "%",
          },
          {
            key: "earlyPaymentDiscountDays",
            label: "Early payment window",
            type: "number",
            min: 0,
            suffix: "days",
          },
          { key: "allowPartialPayments", label: "Allow partial payments", type: "toggle" },
          { key: "autoAllocatePayments", label: "Auto-allocate payments to invoices", type: "toggle" },
          { key: "roundTotals", label: "Round invoice totals", type: "toggle" },
        ],
      },
      {
        title: "Expenses",
        fields: [
          { key: "expenseApprovalRequired", label: "Require expense approval", type: "toggle" },
          {
            key: "expenseApprovalThreshold",
            label: "Expense approval threshold",
            type: "number",
            min: 0,
            suffix: "RWF",
          },
          {
            key: "defaultExpenseCategory",
            label: "Default expense category",
            type: "select",
            options: expenseOptions,
          },
        ],
      },
    ],
  },
  Notifications: {
    label: "Notifications",
    icon: "bell",
    description: "Choose which events trigger email and SMS alerts.",
    groups: [
      {
        title: "Channels",
        fields: [
          { key: "emailNotifications", label: "Email notifications", type: "toggle" },
          { key: "smsNotifications", label: "SMS notifications", type: "toggle" },
          { key: "alertEmail", label: "Alert email", type: "email" },
          { key: "alertPhone", label: "Alert phone", type: "tel" },
        ],
      },
      {
        title: "Event alerts",
        fields: [
          { key: "notifyLowStock", label: "Low or out-of-stock products", type: "toggle" },
          { key: "notifyNewSale", label: "New sale completed", type: "toggle" },
          { key: "notifyPaymentReceived", label: "Payment received", type: "toggle" },
          { key: "notifyPaymentDue", label: "Payment due or overdue", type: "toggle" },
          { key: "notifyPurchaseReceived", label: "Purchase received", type: "toggle" },
          { key: "notifyReturnRequest", label: "Sales return requested", type: "toggle" },
          { key: "notifySupplierReturn", label: "Supplier return updated", type: "toggle" },
          { key: "notifyNewCustomer", label: "New customer added", type: "toggle" },
          { key: "notifyUserActivity", label: "User and security activity", type: "toggle" },
        ],
      },
      {
        title: "Scheduled reports",
        fields: [
          { key: "notifyDailySummary", label: "Daily summary", type: "toggle" },
          { key: "notifyWeeklyReport", label: "Weekly report", type: "toggle" },
          { key: "notifyMonthlyReport", label: "Monthly report", type: "toggle" },
          { key: "dailySummaryTime", label: "Daily summary time", type: "time" },
        ],
      },
    ],
  },
  Security: {
    label: "Security",
    icon: "lock",
    description: "User access, password policy, sessions, and audit logs.",
    groups: [
      {
        title: "User access",
        fields: [
          {
            key: "defaultUserRole",
            label: "Default role for new users",
            type: "select",
            options: settingOptions.userRoles,
          },
          { key: "allowSelfRegistration", label: "Allow self-registration", type: "toggle" },
          { key: "requireEmailVerification", label: "Require email verification", type: "toggle" },
          { key: "inviteExpiryDays", label: "Invitation expires after", type: "number", min: 1, suffix: "days" },
        ],
      },
      {
        title: "Password policy",
        fields: [
          { key: "passwordMinLength", label: "Minimum password length", type: "number", min: 6, max: 32 },
          { key: "passwordRequireUppercase", label: "Require uppercase letter", type: "toggle" },
          { key: "passwordRequireLowercase", label: "Require lowercase letter", type: "toggle" },
          { key: "passwordRequireNumber", label: "Require number", type: "toggle" },
          { key: "passwordRequireSymbol", label: "Require symbol", type: "toggle" },
          { key: "passwordExpiryDays", label: "Password expires after", type: "number", min: 0, suffix: "days" },
        ],
      },
      {
        title: "Sessions and sign-in",
        fields: [
          { key: "twoFactorRequired", label: "Require two-factor authentication", type: "toggle" },
          {
            key: "sessionTimeoutMinutes",
            label: "Inactivity logout after",
            type: "number",
            min: 1,
            max: 1440,
            suffix: "minutes",
            hint: "Automatically signs out after this period with no mouse, keyboard, touch, or scroll activity.",
          },
          { key: "maxLoginAttempts", label: "Maximum login attempts", type: "number", min: 1, max: 20 },
          { key: "lockoutMinutes", label: "Lockout duration", type: "number", min: 1, suffix: "minutes" },
          { key: "rememberDevice", label: "Allow remembered devices", type: "toggle" },
          { key: "loginNotifications", label: "Notify on new sign-in", type: "toggle" },
        ],
      },
      {
        title: "Audit and network",
        fields: [
          { key: "auditLogEnabled", label: "Enable audit log", type: "toggle" },
          { key: "auditRetentionDays", label: "Audit log retention", type: "number", min: 30, suffix: "days" },
          {
            key: "ipAllowlist",
            label: "IP allowlist",
            type: "textarea",
            wide: true,
            placeholder: "One IP address or CIDR range per line",
            hint: "Leave blank to allow sign-in from any IP address.",
          },
        ],
      },
    ],
  },
  Appearance: {
    label: "Appearance",
    icon: "sun",
    description: "Theme, accent color, density, and navigation preferences.",
    groups: [
      {
        title: "Theme and color",
        fields: [
          { key: "theme", label: "Theme", type: "select", options: settingOptions.themes },
          { key: "accentColor", label: "Accent color", type: "select", options: settingOptions.accents },
          { key: "density", label: "Density", type: "select", options: settingOptions.densities },
          { key: "fontSize", label: "Font size", type: "select", options: settingOptions.fontSizes },
        ],
      },
      {
        title: "Layout",
        fields: [
          { key: "sidebarCollapsed", label: "Start with sidebar collapsed", type: "toggle" },
          { key: "showFooter", label: "Show page footer", type: "toggle" },
          { key: "stickyHeader", label: "Keep table headers visible", type: "toggle" },
          {
            key: "tablePageSize",
            label: "Rows per page",
            type: "select",
            options: settingOptions.tablePageSizes.map((size) => ({
              value: String(size),
              label: `${size} rows`,
            })),
          },
        ],
      },
    ],
  },
  Documents: {
    label: "Documents",
    icon: "download",
    description: "Invoice templates, paper sizes, branding, and legal text.",
    groups: [
      {
        title: "Template and paper",
        fields: [
          {
            key: "documentTemplate",
            label: "Document template",
            type: "select",
            options: settingOptions.documentTemplates,
          },
          { key: "paperSize", label: "Paper size", type: "select", options: settingOptions.paperSizes },
          { key: "showLogoOnDocuments", label: "Show company logo", type: "toggle" },
          { key: "showTaxOnDocuments", label: "Show tax breakdown", type: "toggle" },
          { key: "showSkuOnDocuments", label: "Show product SKUs", type: "toggle" },
          { key: "showBarcodeOnDocuments", label: "Show barcodes", type: "toggle" },
          { key: "showQrCode", label: "Show QR code", type: "toggle" },
          { key: "autoPrintInvoices", label: "Auto-print invoices", type: "toggle" },
        ],
      },
      {
        title: "Document text",
        fields: [
          {
            key: "documentFooterNote",
            label: "Footer note",
            type: "textarea",
            wide: true,
            placeholder: "Thank you for your business.",
          },
          {
            key: "termsAndConditions",
            label: "Terms and conditions",
            type: "textarea",
            wide: true,
          },
          { key: "authorizedSignature", label: "Authorized signature", type: "text", wide: true },
        ],
      },
    ],
  },
  Integrations: {
    label: "Integrations",
    icon: "grid",
    description: "Connect email, SMS, payments, webhooks, and analytics.",
    groups: [
      {
        title: "Email delivery",
        fields: [
          {
            key: "emailProvider",
            label: "Email provider",
            type: "select",
            options: settingOptions.emailProviders,
          },
          { key: "fromEmail", label: "Sender email", type: "email" },
          { key: "smtpHost", label: "SMTP host", type: "text" },
          { key: "smtpPort", label: "SMTP port", type: "number", min: 1, max: 65535 },
          { key: "smtpUsername", label: "SMTP username", type: "text" },
          { key: "smtpPassword", label: "SMTP password", type: "password" },
          {
            key: "smtpEncryption",
            label: "Encryption",
            type: "select",
            options: settingOptions.smtpEncryptions,
          },
        ],
      },
      {
        title: "SMS",
        fields: [
          { key: "smsProvider", label: "SMS provider", type: "select", options: settingOptions.smsProviders },
          { key: "smsSenderId", label: "Sender ID", type: "text" },
        ],
      },
      {
        title: "Payment gateway",
        fields: [
          {
            key: "paymentGateway",
            label: "Payment gateway",
            type: "select",
            options: settingOptions.paymentGateways,
          },
          { key: "paymentGatewayPublicKey", label: "Public key", type: "text" },
          { key: "paymentGatewaySecretKey", label: "Secret key", type: "password" },
        ],
      },
      {
        title: "API and webhooks",
        fields: [
          { key: "apiAccessEnabled", label: "Enable API access", type: "toggle" },
          { key: "webhooksEnabled", label: "Enable webhooks", type: "toggle" },
          { key: "webhookUrl", label: "Webhook URL", type: "url", wide: true },
          { key: "webhookSecret", label: "Webhook signing secret", type: "password", wide: true },
          { key: "googleAnalyticsId", label: "Google Analytics ID", type: "text" },
          { key: "slackWebhookUrl", label: "Slack webhook URL", type: "url", wide: true },
        ],
      },
    ],
  },
  System: {
    label: "System",
    icon: "refresh",
    description: "Modules, backups, maintenance, data retention, and support.",
    groups: [
      {
        title: "Modules and features",
        fields: [
          { key: "enableInventory", label: "Inventory management", type: "toggle" },
          { key: "enableSales", label: "Sales and POS", type: "toggle" },
          { key: "enablePurchasing", label: "Purchasing", type: "toggle" },
          { key: "enableReturns", label: "Sales and purchase returns", type: "toggle" },
          { key: "enableExpenses", label: "Expense management", type: "toggle" },
          { key: "enableReports", label: "Reports and analytics", type: "toggle" },
          { key: "enableMultiWarehouse", label: "Multiple warehouses", type: "toggle" },
          { key: "enableBarcodeScanning", label: "Barcode scanning", type: "toggle" },
          { key: "enableLowStockWidget", label: "Low stock dashboard widget", type: "toggle" },
        ],
      },
      {
        title: "Backups",
        fields: [
          {
            key: "backupFrequency",
            label: "Backup frequency",
            type: "select",
            options: settingOptions.backupFrequencies,
          },
          { key: "backupTime", label: "Backup time", type: "time" },
          { key: "autoBackupEnabled", label: "Enable automatic backups", type: "toggle" },
          { key: "cloudBackupEnabled", label: "Store backups in the cloud", type: "toggle" },
          { key: "backupRetentionDays", label: "Keep backups for", type: "number", min: 1, suffix: "days" },
        ],
      },
      {
        title: "Maintenance and data",
        fields: [
          { key: "maintenanceMode", label: "Maintenance mode", type: "toggle" },
          { key: "debugMode", label: "Debug logging", type: "toggle" },
          { key: "experimentalFeatures", label: "Experimental features", type: "toggle" },
          { key: "cacheMinutes", label: "Cache duration", type: "number", min: 0, suffix: "minutes" },
          { key: "dataRetentionMonths", label: "Keep activity data for", type: "number", min: 1, suffix: "months" },
          {
            key: "exportFormat",
            label: "Default export format",
            type: "select",
            options: settingOptions.exportFormats,
          },
        ],
      },
      {
        title: "Support contacts",
        fields: [
          { key: "supportEmail", label: "Support email", type: "email" },
          { key: "supportPhone", label: "Support phone", type: "tel" },
        ],
      },
    ],
  },
};
