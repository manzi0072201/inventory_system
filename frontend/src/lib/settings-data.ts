export type ThemeChoice = "Light" | "Dark" | "System";
export type AccentChoice = "Purple" | "Blue" | "Green" | "Orange" | "Rose";
export type DensityChoice = "Comfortable" | "Compact";
export type FontSizeChoice = "Small" | "Medium" | "Large";

export type SystemSettings = {
  companyName: string;
  legalName: string;
  businessType: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;
  taxId: string;
  registrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  postalCode: string;
  logoUrl: string;
  fiscalYearStart: string;
  defaultLandingPage: string;

  language: string;
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  weekStartsOn: string;
  weightUnit: string;
  dimensionUnit: string;

  defaultWarehouse: string;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  lowStockAlerts: boolean;
  allowNegativeStock: boolean;
  autoGenerateSku: boolean;
  skuPrefix: string;
  skuSeparator: string;
  barcodeFormat: string;
  barcodePrefix: string;
  defaultUnit: string;
  valuationMethod: string;
  trackBatches: boolean;
  trackExpiry: boolean;
  expiryAlertDays: number;
  trackSerialNumbers: boolean;
  deductStockOnSale: boolean;
  showOutOfStockProducts: boolean;
  defaultProductTax: number;
  autoUpdateProductCost: boolean;

  invoicePrefix: string;
  nextInvoiceNumber: number;
  autoGenerateInvoice: boolean;
  defaultCustomer: string;
  defaultSalesTax: number;
  defaultSalesPaymentMethod: string;
  allowDiscounts: boolean;
  maxDiscountPercent: number;
  requireCustomer: boolean;
  allowCreditSales: boolean;
  defaultCreditLimit: number;
  enableLoyalty: boolean;
  loyaltyPointsPerAmount: number;
  salesReturnWindowDays: number;
  autoPrintReceipt: boolean;
  receiptCopies: number;
  roundCashPayments: boolean;
  requireManagerApproval: boolean;
  enablePosHold: boolean;
  posDefaultView: string;

  purchasePrefix: string;
  nextPurchaseNumber: number;
  autoGeneratePurchase: boolean;
  defaultSupplier: string;
  defaultPurchaseWarehouse: string;
  defaultPaymentTerms: string;
  requirePurchaseApproval: boolean;
  purchaseApprovalThreshold: number;
  receiveIntoStock: boolean;
  defaultPurchaseTax: number;
  allowPartialReceipts: boolean;
  purchaseReturnWindowDays: number;
  defaultPurchaseStatus: string;

  taxEnabled: boolean;
  taxName: string;
  taxNumber: string;
  defaultTaxRate: number;
  pricesIncludeTax: boolean;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  swiftCode: string;
  mobileMoneyNumber: string;
  defaultFinancePaymentMethod: string;
  invoiceDueDays: number;
  lateFeePercent: number;
  earlyPaymentDiscountPercent: number;
  earlyPaymentDiscountDays: number;
  allowPartialPayments: boolean;
  autoAllocatePayments: boolean;
  roundTotals: boolean;
  showTaxOnReceipt: boolean;
  expenseApprovalRequired: boolean;
  expenseApprovalThreshold: number;
  defaultExpenseCategory: string;

  emailNotifications: boolean;
  smsNotifications: boolean;
  notifyLowStock: boolean;
  notifyNewSale: boolean;
  notifyPaymentReceived: boolean;
  notifyPaymentDue: boolean;
  notifyPurchaseReceived: boolean;
  notifyReturnRequest: boolean;
  notifySupplierReturn: boolean;
  notifyNewCustomer: boolean;
  notifyUserActivity: boolean;
  notifyDailySummary: boolean;
  notifyWeeklyReport: boolean;
  notifyMonthlyReport: boolean;
  alertEmail: string;
  alertPhone: string;
  dailySummaryTime: string;

  defaultUserRole: string;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  inviteExpiryDays: number;
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordExpiryDays: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  rememberDevice: boolean;
  loginNotifications: boolean;
  ipAllowlist: string;
  auditLogEnabled: boolean;
  auditRetentionDays: number;

  theme: ThemeChoice;
  accentColor: AccentChoice;
  density: DensityChoice;
  fontSize: FontSizeChoice;
  sidebarCollapsed: boolean;
  showFooter: boolean;
  tablePageSize: number;
  stickyHeader: boolean;

  documentTemplate: string;
  paperSize: string;
  showLogoOnDocuments: boolean;
  showTaxOnDocuments: boolean;
  showSkuOnDocuments: boolean;
  showBarcodeOnDocuments: boolean;
  showQrCode: boolean;
  autoPrintInvoices: boolean;
  documentFooterNote: string;
  termsAndConditions: string;
  authorizedSignature: string;

  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: string;
  fromEmail: string;
  smsProvider: string;
  smsSenderId: string;
  paymentGateway: string;
  paymentGatewayPublicKey: string;
  paymentGatewaySecretKey: string;
  webhooksEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;
  apiAccessEnabled: boolean;
  googleAnalyticsId: string;
  slackWebhookUrl: string;

  enableInventory: boolean;
  enableSales: boolean;
  enablePurchasing: boolean;
  enableReturns: boolean;
  enableExpenses: boolean;
  enableReports: boolean;
  enableMultiWarehouse: boolean;
  enableBarcodeScanning: boolean;
  enableLowStockWidget: boolean;
  backupFrequency: string;
  backupTime: string;
  backupRetentionDays: number;
  cloudBackupEnabled: boolean;
  autoBackupEnabled: boolean;
  maintenanceMode: boolean;
  debugMode: boolean;
  dataRetentionMonths: number;
  experimentalFeatures: boolean;
  cacheMinutes: number;
  exportFormat: string;
  supportEmail: string;
  supportPhone: string;
};

export const defaultSettings: SystemSettings = {
  companyName: "Stocky Inventory",
  legalName: "Stocky Inventory Ltd",
  businessType: "Retail & Wholesale",
  companyEmail: "hello@stocky.rw",
  companyPhone: "+250 788 123 456",
  companyWebsite: "https://stocky.rw",
  taxId: "TIN-102938475",
  registrationNumber: "RDB-2024-001928",
  addressLine1: "12 KG 7 Avenue",
  addressLine2: "Gikondo Industrial Zone",
  city: "Kigali",
  country: "Rwanda",
  postalCode: "250",
  logoUrl: "",
  fiscalYearStart: "01-01",
  defaultLandingPage: "/",

  language: "English",
  currencyCode: "RWF",
  currencySymbol: "FRw",
  currencyPosition: "After",
  decimalPlaces: 0,
  thousandsSeparator: ",",
  decimalSeparator: ".",
  dateFormat: "MMM D, YYYY",
  timeFormat: "24-hour",
  timezone: "Africa/Kigali",
  weekStartsOn: "Monday",
  weightUnit: "kg",
  dimensionUnit: "cm",

  defaultWarehouse: "Main Warehouse",
  lowStockThreshold: 10,
  criticalStockThreshold: 3,
  lowStockAlerts: true,
  allowNegativeStock: false,
  autoGenerateSku: true,
  skuPrefix: "SKU",
  skuSeparator: "-",
  barcodeFormat: "Code 128",
  barcodePrefix: "STK",
  defaultUnit: "pc",
  valuationMethod: "Weighted Average",
  trackBatches: false,
  trackExpiry: false,
  expiryAlertDays: 30,
  trackSerialNumbers: false,
  deductStockOnSale: true,
  showOutOfStockProducts: true,
  defaultProductTax: 18,
  autoUpdateProductCost: true,

  invoicePrefix: "INV",
  nextInvoiceNumber: 1045,
  autoGenerateInvoice: true,
  defaultCustomer: "Walk-in Customer",
  defaultSalesTax: 18,
  defaultSalesPaymentMethod: "Cash",
  allowDiscounts: true,
  maxDiscountPercent: 20,
  requireCustomer: false,
  allowCreditSales: true,
  defaultCreditLimit: 100000,
  enableLoyalty: false,
  loyaltyPointsPerAmount: 1000,
  salesReturnWindowDays: 7,
  autoPrintReceipt: false,
  receiptCopies: 1,
  roundCashPayments: true,
  requireManagerApproval: false,
  enablePosHold: true,
  posDefaultView: "Grid",

  purchasePrefix: "PO",
  nextPurchaseNumber: 45061,
  autoGeneratePurchase: true,
  defaultSupplier: "",
  defaultPurchaseWarehouse: "Main Warehouse",
  defaultPaymentTerms: "Net 30",
  requirePurchaseApproval: false,
  purchaseApprovalThreshold: 500000,
  receiveIntoStock: true,
  defaultPurchaseTax: 18,
  allowPartialReceipts: true,
  purchaseReturnWindowDays: 14,
  defaultPurchaseStatus: "Received",

  taxEnabled: true,
  taxName: "VAT",
  taxNumber: "VAT-102938475",
  defaultTaxRate: 18,
  pricesIncludeTax: false,
  bankName: "Bank of Kigali",
  bankAccountName: "Stocky Inventory Ltd",
  bankAccountNumber: "000123456789",
  bankBranch: "Kigali Main Branch",
  swiftCode: "BKIGRWRW",
  mobileMoneyNumber: "+250 788 123 456",
  defaultFinancePaymentMethod: "Bank Account",
  invoiceDueDays: 30,
  lateFeePercent: 2,
  earlyPaymentDiscountPercent: 3,
  earlyPaymentDiscountDays: 10,
  allowPartialPayments: true,
  autoAllocatePayments: true,
  roundTotals: true,
  showTaxOnReceipt: true,
  expenseApprovalRequired: false,
  expenseApprovalThreshold: 100000,
  defaultExpenseCategory: "General",

  emailNotifications: true,
  smsNotifications: false,
  notifyLowStock: true,
  notifyNewSale: false,
  notifyPaymentReceived: true,
  notifyPaymentDue: true,
  notifyPurchaseReceived: true,
  notifyReturnRequest: true,
  notifySupplierReturn: true,
  notifyNewCustomer: true,
  notifyUserActivity: false,
  notifyDailySummary: true,
  notifyWeeklyReport: true,
  notifyMonthlyReport: false,
  alertEmail: "alerts@stocky.rw",
  alertPhone: "+250 788 123 456",
  dailySummaryTime: "18:00",

  defaultUserRole: "Cashier",
  allowSelfRegistration: false,
  requireEmailVerification: true,
  inviteExpiryDays: 7,
  twoFactorRequired: false,
  sessionTimeoutMinutes: 120,
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  rememberDevice: true,
  loginNotifications: true,
  ipAllowlist: "",
  auditLogEnabled: true,
  auditRetentionDays: 365,

  theme: "Light",
  accentColor: "Purple",
  density: "Comfortable",
  fontSize: "Medium",
  sidebarCollapsed: false,
  showFooter: true,
  tablePageSize: 10,
  stickyHeader: true,

  documentTemplate: "Modern",
  paperSize: "A4",
  showLogoOnDocuments: true,
  showTaxOnDocuments: true,
  showSkuOnDocuments: true,
  showBarcodeOnDocuments: false,
  showQrCode: false,
  autoPrintInvoices: false,
  documentFooterNote: "Thank you for your business.",
  termsAndConditions:
    "Payment is due within 30 days. Goods remain the property of Stocky Inventory Ltd until paid in full.",
  authorizedSignature: "Jean-Paul Nkurunziza",

  emailProvider: "SMTP",
  smtpHost: "smtp.stocky.rw",
  smtpPort: 587,
  smtpUsername: "notifications@stocky.rw",
  smtpPassword: "",
  smtpEncryption: "TLS",
  fromEmail: "notifications@stocky.rw",
  smsProvider: "None",
  smsSenderId: "STOCKY",
  paymentGateway: "MTN MoMo",
  paymentGatewayPublicKey: "",
  paymentGatewaySecretKey: "",
  webhooksEnabled: false,
  webhookUrl: "",
  webhookSecret: "",
  apiAccessEnabled: false,
  googleAnalyticsId: "",
  slackWebhookUrl: "",

  enableInventory: true,
  enableSales: true,
  enablePurchasing: true,
  enableReturns: true,
  enableExpenses: true,
  enableReports: true,
  enableMultiWarehouse: true,
  enableBarcodeScanning: true,
  enableLowStockWidget: true,
  backupFrequency: "Daily",
  backupTime: "02:00",
  backupRetentionDays: 30,
  cloudBackupEnabled: true,
  autoBackupEnabled: true,
  maintenanceMode: false,
  debugMode: false,
  dataRetentionMonths: 60,
  experimentalFeatures: false,
  cacheMinutes: 15,
  exportFormat: "CSV",
  supportEmail: "support@stocky.rw",
  supportPhone: "+250 788 123 456",
};

export const settingsTabs = [
  "General",
  "Localization",
  "Inventory",
  "Sales & POS",
  "Purchasing",
  "Finance",
  "Notifications",
  "Security",
  "Appearance",
  "Documents",
  "Integrations",
  "System",
] as const;

export type SettingsTab = (typeof settingsTabs)[number];

export const settingOptions = {
  businessTypes: [
    "Retail & Wholesale",
    "Retail",
    "Wholesale",
    "Manufacturing",
    "Distribution",
    "Services",
    "Other",
  ],
  languages: ["English", "French", "Kinyarwanda", "Swahili"],
  currencies: [
    { code: "RWF", symbol: "FRw", label: "Rwandan Franc" },
    { code: "USD", symbol: "$", label: "US Dollar" },
    { code: "EUR", symbol: "€", label: "Euro" },
    { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
    { code: "UGX", symbol: "USh", label: "Ugandan Shilling" },
    { code: "TZS", symbol: "TSh", label: "Tanzanian Shilling" },
    { code: "GBP", symbol: "£", label: "British Pound" },
  ],
  currencyPositions: ["Before", "After"],
  decimalPlaces: [0, 1, 2, 3],
  thousandsSeparators: [
    { value: ",", label: "Comma (1,000)" },
    { value: ".", label: "Dot (1.000)" },
    { value: " ", label: "Space (1 000)" },
    { value: "", label: "None (1000)" },
  ],
  decimalSeparators: [
    { value: ".", label: "Dot (1.00)" },
    { value: ",", label: "Comma (1,00)" },
  ],
  dateFormats: [
    "MMM D, YYYY",
    "DD/MM/YYYY",
    "MM/DD/YYYY",
    "YYYY-MM-DD",
    "D MMMM YYYY",
  ],
  timeFormats: ["12-hour", "24-hour"],
  timezones: [
    "Africa/Kigali",
    "Africa/Nairobi",
    "Africa/Kampala",
    "Africa/Dar_es_Salaam",
    "UTC",
    "Europe/London",
    "America/New_York",
  ],
  weekStarts: ["Monday", "Sunday"],
  weightUnits: ["kg", "g", "lb", "oz"],
  dimensionUnits: ["cm", "m", "in", "ft"],
  barcodeFormats: ["EAN-13", "UPC-A", "Code 128", "QR Code", "Code 39"],
  units: ["pc", "box", "carton", "kg", "g", "litre", "pack", "set", "pair"],
  valuationMethods: ["FIFO", "Weighted Average", "LIFO"],
  paymentTerms: [
    "Due on receipt",
    "Net 7",
    "Net 15",
    "Net 30",
    "Net 45",
    "Net 60",
  ],
  purchaseStatuses: ["Pending", "Ordered", "Received"],
  paymentMethods: ["Bank Account", "MTN MoMo", "Airtel Money", "Cash"],
  userRoles: [
    "Admin",
    "Manager",
    "Cashier",
    "Inventory Officer",
    "Accountant",
    "Viewer",
  ],
  themes: ["Light", "Dark", "System"] as ThemeChoice[],
  accents: ["Purple", "Blue", "Green", "Orange", "Rose"] as AccentChoice[],
  densities: ["Comfortable", "Compact"] as DensityChoice[],
  fontSizes: ["Small", "Medium", "Large"] as FontSizeChoice[],
  tablePageSizes: [10, 15, 25, 50, 100],
  documentTemplates: ["Modern", "Classic", "Minimal"],
  paperSizes: ["A4", "A5", "Letter", "80mm Receipt"],
  emailProviders: ["SMTP", "SendGrid", "Postmark", "Mailgun"],
  smtpEncryptions: ["TLS", "SSL", "None"],
  smsProviders: ["None", "Twilio", "Africa's Talking"],
  paymentGateways: [
    "None",
    "Stripe",
    "Flutterwave",
    "MTN MoMo",
    "Airtel Money",
  ],
  backupFrequencies: ["Manual", "Daily", "Weekly", "Monthly"],
  exportFormats: ["CSV", "Excel", "JSON", "PDF"],
  landingPages: [
    { value: "/", label: "Dashboard" },
    { value: "/products", label: "Products" },
    { value: "/sales", label: "Sales & POS" },
    { value: "/purchases", label: "Purchases" },
    { value: "/stock", label: "Stock Management" },
    { value: "/reports", label: "Reports" },
  ],
};

export const settingsStorageKey = "stocky:system-settings";

export function readStoredLogo(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(settingsStorageKey);
    if (!raw) return "";
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return "";
    const candidate = (parsed as { logoUrl?: unknown }).logoUrl;
    return typeof candidate === "string" ? candidate : "";
  } catch {
    return "";
  }
}
