export type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
  limit: number;
};

export type Paginated<T> = {
  rows: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

function positiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(params: URLSearchParams): Pagination {
  const page = positiveInt(params.get("page"), 1);
  const pageSize = Math.min(positiveInt(params.get("pageSize"), 50), 200);
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    limit: pageSize,
  };
}

export function paginate<T>(rows: T[], pagination: Pagination): Paginated<T> {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  return {
    rows: rows.slice(pagination.skip, pagination.skip + pagination.limit),
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    },
  };
}
