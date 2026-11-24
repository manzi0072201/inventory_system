import type {
  ApiEnvelope,
  ApiErrorPayload,
  ApiListResult,
  AuditLogStats,
  PaginationMeta,
  BackendAnnouncement,
  BackendAuditLog,
  BackendCustomer,
  BackendExpense,
  BackendExpenseCategory,
  BackendNotification,
  BackendPayment,
  BackendProduct,
  BackendProfitReport,
  BackendProfile,
  BackendPurchase,
  BackendPurchaseItem,
  BackendPurchaseReturn,
  BackendSale,
  BackendSaleItem,
  BackendSaleReturn,
  BackendReturnItem,
  BackendSession,
  BackendSettings,
  BackendStockAdjustment,
  BackendStockRow,
  BackendSupplier,
  BackendUploadTicket,
  BackendUser,
  BackendWarehouse,
} from "@/lib/api-types";

export const API_BASE = "/api/backend";

function describeDetails(details: unknown): string {
  if (!Array.isArray(details)) return "";
  return details
    .map((item) => {
      if (typeof item !== "object" || item === null) return "";
      const record = item as Record<string, unknown>;
      const path = typeof record.path === "string" ? record.path : "";
      const text = typeof record.message === "string" ? record.message : "";
      return path && text ? `${path}: ${text}` : text;
    })
    .filter(Boolean)
    .slice(0, 4)
    .join("; ");
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    const suffix = describeDetails(details);
    super(suffix ? `${message} (${suffix})` : message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function withPageSize(path: string, pageSize = 200): string {
  if (/[?&]pageSize=/.test(path)) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}pageSize=${pageSize}`;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await readPayload(response);
  const record = asRecord(payload);
  const error = asRecord(record?.error);

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED",
      typeof error?.message === "string"
        ? error.message
        : typeof payload === "string"
          ? payload
          : "The request could not be completed.",
      error?.details,
    );
  }

  if (record && "data" in record) {
    return (record as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export async function apiList<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiListResult<T>> {
  const response = await fetch(`${API_BASE}${withPageSize(path)}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await readPayload(response);
  const record = asRecord(payload);
  const error = asRecord(record?.error);

  if (!response.ok) {
    const failure = payload as ApiErrorPayload;
    throw new ApiClientError(
      response.status,
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED",
      typeof error?.message === "string"
        ? error.message
        : "The request could not be completed.",
      error?.details ?? failure?.error?.details,
    );
  }

  const envelope = payload as ApiEnvelope<
    T[] | { items?: T[]; pagination?: PaginationMeta } | null
  >;
  const data = envelope.data;
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : [];
  return {
    items,
    pagination:
      envelope.meta?.pagination ??
      (Array.isArray(data) ? undefined : data?.pagination),
    stats: (envelope.meta as { stats?: AuditLogStats } | undefined)?.stats,
  };
}

function jsonBody(value: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(value) };
}

export type AuditLogFilters = {
  preset?: string;
  start?: string;
  end?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

function auditLogPath(
  filters: AuditLogFilters,
  options: { format?: "csv"; includePagination?: boolean } = {},
): string {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    preset: filters.preset,
    start: filters.start,
    end: filters.end,
    action: filters.action,
    entityType: filters.entityType,
    entityId: filters.entityId,
    actorId: filters.actorId,
    search: filters.search,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, String(value));
  }
  if (options.includePagination !== false) {
    if (filters.page) params.set("page", String(filters.page));
    if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  }
  if (options.format) params.set("format", options.format);
  return `/audit-logs?${params.toString()}`;
}

export async function authRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await readPayload(response);
  const record = asRecord(payload);
  const error = asRecord(record?.error);
  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      typeof error?.code === "string" ? error.code : "REQUEST_FAILED",
      typeof error?.message === "string"
        ? error.message
        : typeof record?.message === "string"
          ? record.message
          : "The request could not be completed.",
      error?.details,
    );
  }
  if (record && "data" in record) return (record as ApiEnvelope<T>).data;
  return payload as T;
}

const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function uploadImage(
  scope: "avatar" | "logo" | "product",
  file: File,
): Promise<string> {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new ApiClientError(400, "INVALID_IMAGE_TYPE", "Unsupported image type.");
  }
  const ticket = await apiRequest<BackendUploadTicket>(
    "/uploads",
    jsonBody({ scope, contentType: file.type, size: file.size }),
  );
  const response = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": ticket.contentType },
    body: file,
  });
  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      "UPLOAD_FAILED",
      "The image could not be uploaded.",
    );
  }
  return ticket.key;
}

export const api = {
  session: () => apiRequest<BackendSession>("/auth/session"),
  signOut: () => apiRequest<{ signedOut: boolean }>("/auth/session", { method: "DELETE" }),
  signIn: (email: string, password: string) =>
    authRequest<unknown>("/auth/sign-in/email", jsonBody({ email, password })),
  changePassword: (
    currentPassword: string,
    newPassword: string,
    revokeOtherSessions = false,
  ) =>
    apiRequest<unknown>(
      "/auth/password",
      jsonBody({ currentPassword, newPassword, revokeOtherSessions }),
    ),
  profile: () => apiRequest<BackendProfile>("/profile"),
  updateProfile: (input: {
    name?: string;
    phone?: string | null;
    shopZone?: string | null;
    avatarUrl?: string | null;
  }) => apiRequest<BackendProfile>("/profile", { method: "PATCH", body: JSON.stringify(input) }),

  auditLogs: (filters: AuditLogFilters = {}) =>
    apiList<BackendAuditLog>(auditLogPath({ preset: "30d", ...filters })),
  auditLogsExportUrl: (filters: AuditLogFilters = {}) =>
    `${API_BASE}${auditLogPath(
      { preset: "30d", ...filters },
      { format: "csv", includePagination: false },
    )}`,

  users: () => apiList<BackendUser>("/users"),
  createUser: (input: Record<string, unknown>) =>
    apiRequest<BackendUser>("/users", jsonBody(input)),
  updateUser: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendUser>(`/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteUser: (id: string) =>
    apiRequest<{ id: string; suspended: boolean }>(
      `/users/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  products: () => apiList<BackendProduct>("/products"),
  createProduct: (input: Record<string, unknown>) =>
    apiRequest<BackendProduct>("/products", jsonBody(input)),
  updateProduct: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendProduct>(`/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteProduct: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/products/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  customers: () => apiList<BackendCustomer>("/customers"),
  createCustomer: (input: Record<string, unknown>) =>
    apiRequest<BackendCustomer>("/customers", jsonBody(input)),
  updateCustomer: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendCustomer>(`/customers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteCustomer: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/customers/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  suppliers: () => apiList<BackendSupplier>("/suppliers"),
  createSupplier: (input: Record<string, unknown>) =>
    apiRequest<BackendSupplier>("/suppliers", jsonBody(input)),
  updateSupplier: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendSupplier>(`/suppliers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteSupplier: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/suppliers/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  warehouses: () => apiList<BackendWarehouse>("/warehouses"),
  createWarehouse: (input: Record<string, unknown>) =>
    apiRequest<BackendWarehouse>("/warehouses", jsonBody(input)),
  updateWarehouse: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendWarehouse>(`/warehouses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteWarehouse: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/warehouses/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),

  stock: () => apiList<BackendStockRow>("/stock"),
  stockMovements: () => apiList<Record<string, unknown>>("/stock/movements"),
  stockAdjustments: () => apiList<BackendStockAdjustment>("/stock/adjustments"),
  createStockAdjustment: (input: Record<string, unknown>) =>
    apiRequest<BackendStockAdjustment>("/stock/adjustments", jsonBody(input)),
  updateStockThresholds: (input: Record<string, unknown>) =>
    apiRequest<BackendStockRow>("/stock/thresholds", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  sales: () => apiList<BackendSale>("/sales?preset=all"),
  sale: (id: string) =>
    apiRequest<BackendSale & { items: BackendSaleItem[] }>(
      `/sales/${encodeURIComponent(id)}`,
    ),
  createSale: (input: Record<string, unknown>) =>
    apiRequest<BackendSale & { items: BackendSaleItem[] }>(
      "/sales",
      jsonBody(input),
    ),
  updateSale: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendSale & { items: BackendSaleItem[] }>(
      `/sales/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  deleteSale: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/sales/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  voidSale: (id: string, note?: string) =>
    apiRequest<BackendSale & { items: BackendSaleItem[] }>(
      `/sales/${encodeURIComponent(id)}/void`,
      jsonBody(note ? { note } : {}),
    ),

  salesReturns: () => apiList<BackendSaleReturn>("/sales/returns?preset=all"),
  salesReturn: (id: string) =>
    apiRequest<BackendSaleReturn & { items: BackendReturnItem[] }>(
      `/sales/returns/${encodeURIComponent(id)}`,
    ),
  createSalesReturn: (input: Record<string, unknown>) =>
    apiRequest<BackendSaleReturn & { items: BackendReturnItem[] }>(
      "/sales/returns",
      jsonBody(input),
    ),

  purchases: () => apiList<BackendPurchase>("/purchases?preset=all"),
  purchase: (id: string) =>
    apiRequest<BackendPurchase & { items: BackendPurchaseItem[] }>(
      `/purchases/${encodeURIComponent(id)}`,
    ),
  createPurchase: (input: Record<string, unknown>) =>
    apiRequest<BackendPurchase & { items: BackendPurchaseItem[] }>(
      "/purchases",
      jsonBody(input),
    ),
  updatePurchase: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendPurchase & { items: BackendPurchaseItem[] }>(
      `/purchases/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    ),
  deletePurchase: (id: string) =>
    apiRequest<{ id: string; deleted: boolean }>(
      `/purchases/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  voidPurchase: (id: string, note?: string) =>
    apiRequest<BackendPurchase & { items: BackendPurchaseItem[] }>(
      `/purchases/${encodeURIComponent(id)}/void`,
      jsonBody(note ? { note } : {}),
    ),

  purchaseReturns: () =>
    apiList<BackendPurchaseReturn>("/purchases/returns?preset=all"),
  purchaseReturn: (id: string) =>
    apiRequest<BackendPurchaseReturn & { items: BackendReturnItem[] }>(
      `/purchases/returns/${encodeURIComponent(id)}`,
    ),
  createPurchaseReturn: (input: Record<string, unknown>) =>
    apiRequest<BackendPurchaseReturn & { items: BackendReturnItem[] }>(
      "/purchases/returns",
      jsonBody(input),
    ),

  expenseCategories: () =>
    apiList<BackendExpenseCategory>("/expense-categories"),
  createExpenseCategory: (input: Record<string, unknown>) =>
    apiRequest<BackendExpenseCategory>("/expense-categories", jsonBody(input)),
  expenses: () => apiList<BackendExpense>("/expenses?preset=all"),
  createExpense: (input: Record<string, unknown>) =>
    apiRequest<BackendExpense>("/expenses", jsonBody(input)),
  updateExpense: (id: string, input: Record<string, unknown>) =>
    apiRequest<BackendExpense>(`/expenses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  deleteExpense: (id: string) =>
    apiRequest<{ id: string }>(`/expenses/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  payments: () => apiList<BackendPayment>("/payments?preset=all"),

  profitReport: (input: {
    preset: string;
    start?: string;
    end?: string;
    warehouseId?: string;
  }) => {
    const params = new URLSearchParams({ preset: input.preset });
    if (input.start) params.set("start", input.start);
    if (input.end) params.set("end", input.end);
    if (input.warehouseId) params.set("warehouseId", input.warehouseId);
    return apiRequest<BackendProfitReport>(`/reports/profit?${params.toString()}`);
  },

  settings: () => apiRequest<BackendSettings>("/settings"),
  updateSettings: (input: Record<string, unknown>) =>
    apiRequest<BackendSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  notifications: () => apiList<BackendNotification>("/notifications"),
  markNotificationRead: (id: string) =>
    apiRequest<BackendNotification>(`/notifications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ read: true }),
    }),
  markAllNotificationsRead: () =>
    apiRequest<{ updated: number }>("/notifications/read-all", jsonBody({})),
  announcements: () => apiList<BackendAnnouncement>("/announcements"),
  markAnnouncementRead: (id: string) =>
    apiRequest<{ id: string; readAt: string }>(
      `/announcements/${encodeURIComponent(id)}/read`,
      jsonBody({}),
    ),

  createUpload: (input: {
    scope: "avatar" | "logo" | "product";
    contentType: string;
    size: number;
  }) => apiRequest<Record<string, unknown>>("/uploads", jsonBody(input)),
};
