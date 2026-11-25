export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

export type ApiMeta = {
  version?: string;
  pagination?: PaginationMeta;
  [key: string]: unknown;
};

export type ApiEnvelope<T> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  meta?: ApiMeta;
};

export type AuditLogStats = {
  actors: number;
  entities: number;
  lastEvent: string | null;
};

export type ApiListResult<T> = {
  items: T[];
  pagination?: PaginationMeta;
  stats?: AuditLogStats;
};

export type BackendPermissionMap = Partial<
  Record<
    | "sales"
    | "sales_returns"
    | "products"
    | "stock"
    | "warehouses"
    | "purchases"
    | "purchase_returns"
    | "customers"
    | "suppliers"
    | "debtors"
    | "payments"
    | "expenses"
    | "reports"
    | "settings"
    | "notifications"
    | "announcements",
    boolean
  >
>;

export type BackendProfile = {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  phone: string | null;
  shopZone: string | null;
  avatarUrl: string | null;
  role: "super_admin" | "admin";
  status: "Active" | "Suspended";
  lastLoginAt: string | null;
  permissions: BackendPermissionMap;
  ownerAccess?: boolean;
};

export type BackendSession = {
  authenticated: boolean;
  source?: "bearer" | "cookie";
  user?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string | null;
  };
  profile: BackendProfile;
};

export type BackendUser = {
  id: string;
  authUserId: string;
  email: string;
  name: string;
  phone: string | null;
  shopZone: string | null;
  role: "super_admin" | "admin";
  status: "Active" | "Suspended";
  lastLoginAt: string | null;
  createdAt: string;
  permissions: BackendPermissionMap;
};

export type BackendProduct = {
  id: string;
  sku: string;
  name: string;
  brandId: string | null;
  categoryId: string | null;
  brand: string | null;
  category: string | null;
  unit: string | null;
  type: string | null;
  imageUrl: string | null;
  imageBg: string | null;
  blend: boolean;
  costPrice: number;
  sellingPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BackendCustomer = {
  id: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  taxNumber: string | null;
  openingBalance: number;
  creditLimit: number;
  balance: number;
  dueAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type BackendSupplier = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  category: string | null;
  taxNumber: string | null;
  openingBalance: number;
  creditLimit: number;
  balance: number;
  dueAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type BackendWarehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  manager: string | null;
  phone: string | null;
  email: string | null;
  capacity: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BackendAuditLog = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData: unknown;
  afterData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type BackendProfitReport = {
  range: { start: string; end: string; preset: string };
  granularity: "day" | "week" | "month";
  warehouseId: string | null;
  basis: string;
  unpricedSaleItems: number;
  unpricedReturnItems: number;
  series: Array<{
    bucket: string;
    sales: number;
    salesReturns: number;
    cogs: number;
    returnedCogs: number;
    netCogs: number;
    expenses: number;
    netSales: number;
    grossProfit: number;
    netProfit: number;
  }>;
  totals: {
    sales: number;
    salesReturns: number;
    netSales: number;
    cogs: number;
    returnedCogs: number;
    netCogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
  };
};

export type BackendStockRow = {
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantityOnHand: number;
  reorderPoint: number;
  criticalPoint: number;
  averageCost: number;
  status: string;
};

export type BackendStockAdjustment = {
  id: string;
  reference: string;
  date: string;
  productId: string;
  productCode: string;
  productName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantityDelta: number;
  balanceAfter: number;
  reason: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type BackendSale = {
  id: string;
  reference: string;
  date: string | null;
  customerId: string;
  warehouseId: string;
  sellerId: string;
  status: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  shippingStatus: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  customerName: string | null;
  warehouseName: string | null;
  sellerName: string | null;
};

export type BackendSaleItem = {
  id: string;
  saleId: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
  unitCost: number;
};

export type BackendSaleReturn = {
  id: string;
  reference: string;
  date: string | null;
  saleId: string;
  saleReference: string | null;
  customerId: string;
  warehouseId: string;
  reason: string;
  resolution: string;
  status: string;
  refundMethod: string;
  amount: number;
  restock: boolean;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  customerName: string | null;
  warehouseName: string | null;
};

export type BackendReturnItem = {
  id: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  saleItemId: string | null;
  unitCost: number;
};

export type BackendPurchase = {
  id: string;
  reference: string;
  date: string | null;
  supplierId: string;
  buyerId: string;
  warehouseId: string;
  status: string;
  currency: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  shippingStatus: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  supplierName: string | null;
  warehouseName: string | null;
  buyerName: string | null;
};

export type BackendPurchaseItem = {
  id: string;
  purchaseId: string;
  productId: string;
  name: string;
  code: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder: number;
};

export type BackendPurchaseReturn = {
  id: string;
  reference: string;
  date: string | null;
  purchaseId: string;
  purchaseReference: string | null;
  supplierId: string;
  warehouseId: string;
  reason: string;
  resolution: string;
  status: string;
  refundMethod: string;
  amount: number;
  deductStock: boolean;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  supplierName: string | null;
  warehouseName: string | null;
};

export type BackendExpenseCategory = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string | null;
};

export type BackendExpense = {
  id: string;
  reference: string;
  date: string | null;
  categoryId: string;
  categoryName: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
  paymentMethod: string;
  status: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BackendPayment = {
  id: string;
  reference: string;
  direction: string;
  sourceType: string;
  sourceId: string | null;
  partyType: string;
  partyId: string | null;
  method: string;
  amount: number;
  paidAt: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string | null;
  partyName: string | null;
};

export type BackendNotification = {
  id: string;
  kind: string;
  category: string | null;
  tone: string;
  title: string;
  description: string | null;
  href: string | null;
  occurredAt: string | null;
  readAt: string | null;
  createdAt: string;
};

export type BackendAnnouncement = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  date: string;
  tone: string;
  icon: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  read: boolean;
  readAt: string | null;
};

export type AnnouncementInput = {
  title: string;
  body: string;
  category?: string | null;
  date?: string;
  tone: "danger" | "warning" | "success" | "info";
  icon?: string | null;
};

export type SettingsGroupKey =
  | "company"
  | "localization"
  | "inventory"
  | "salesPos"
  | "purchasing"
  | "finance"
  | "notifications"
  | "security"
  | "appearance"
  | "documents"
  | "integrations"
  | "system";

export type BackendSettings = {
  [key in SettingsGroupKey]: Record<string, unknown>;
} & {
  updatedAt: string | null;
  updatedBy: string | null;
  [key: string]: unknown;
};

export type BackendUploadTicket = {
  key: string;
  uploadUrl: string;
  contentType: string;
  size: number;
  expiresIn: number;
};
