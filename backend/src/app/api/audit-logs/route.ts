import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { toIsoString, type DateRange } from "@/lib/date-range";
import { badRequest } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { parsePagination } from "@/lib/pagination";
import {
  parseReportFormat,
  parseReportRange,
  reportResponse,
} from "@/lib/reports";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

type AuditLogFilters = {
  action: string | null;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  search: string | null;
};

type AuditLogRow = {
  id: string | number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_data: unknown;
  after_data: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: unknown;
  actor_name: string | null;
  actor_email: string | null;
};

type AuditStats = {
  actors: number;
  entities: number;
  lastEvent: string | null;
};

function boundedText(
  params: URLSearchParams,
  key: string,
  maxLength: number,
): string | null {
  const value = params.get(key)?.trim();
  if (!value) return null;
  if (value.length > maxLength) {
    throw badRequest(`${key} is too long.`);
  }
  return value;
}

function parseFilters(params: URLSearchParams): AuditLogFilters {
  const actorId = params.get("actorId")?.trim() || null;
  if (actorId && !uuid.safeParse(actorId).success) {
    throw badRequest("Invalid actor.");
  }
  return {
    action: boundedText(params, "action", 100),
    entityType: boundedText(params, "entityType", 100),
    entityId: boundedText(params, "entityId", 200),
    actorId,
    search: boundedText(params, "search", 200),
  };
}

function mapAuditLog(row: AuditLogRow) {
  return {
    id: String(row.id),
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeData: row.before_data ?? null,
    afterData: row.after_data ?? null,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: toIsoString(row.created_at),
  };
}

async function queryRows(
  sql: ReturnType<typeof getSql>,
  filters: AuditLogFilters,
  range: DateRange,
  limit: number,
  offset: number,
) {
  return (await sql`
    select
      al.id,
      al.actor_id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.before_data,
      al.after_data,
      al.ip_address,
      al.user_agent,
      al.created_at,
      au.name as actor_name,
      au.email as actor_email
    from audit_logs al
    left join app_users au on au.id = al.actor_id
    where al.created_at >= ${range.start}::timestamptz
      and al.created_at < (${range.end}::date + interval '1 day')::timestamptz
      and (${filters.action}::text is null or al.action ilike '%' || ${filters.action} || '%')
      and (${filters.entityType}::text is null or al.entity_type ilike '%' || ${filters.entityType} || '%')
      and (${filters.entityId}::text is null or al.entity_id ilike '%' || ${filters.entityId} || '%')
      and (${filters.actorId}::uuid is null or al.actor_id = ${filters.actorId}::uuid)
      and (
        ${filters.search}::text is null
        or al.action ilike '%' || ${filters.search} || '%'
        or al.entity_type ilike '%' || ${filters.search} || '%'
        or al.entity_id ilike '%' || ${filters.search} || '%'
        or au.name ilike '%' || ${filters.search} || '%'
        or au.email ilike '%' || ${filters.search} || '%'
        or al.ip_address ilike '%' || ${filters.search} || '%'
      )
    order by al.created_at desc, al.id desc
    limit ${limit} offset ${offset}
  `) as AuditLogRow[];
}

export async function GET(request: Request) {
  try {
    const session = await requirePermission(request, "reports");
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const filters = parseFilters(params);
    const range = parseReportRange(params);
    const format = parseReportFormat(params);
    const pagination = parsePagination(params);

    const countRows = (await sql`
      select
        count(*)::int as total,
        count(distinct al.actor_id)::int as actors,
        count(distinct al.entity_type)::int as entities,
        max(al.created_at) as last_event
      from audit_logs al
      left join app_users au on au.id = al.actor_id
      where al.created_at >= ${range.start}::timestamptz
        and al.created_at < (${range.end}::date + interval '1 day')::timestamptz
        and (${filters.action}::text is null or al.action ilike '%' || ${filters.action} || '%')
        and (${filters.entityType}::text is null or al.entity_type ilike '%' || ${filters.entityType} || '%')
        and (${filters.entityId}::text is null or al.entity_id ilike '%' || ${filters.entityId} || '%')
        and (${filters.actorId}::uuid is null or al.actor_id = ${filters.actorId}::uuid)
        and (
          ${filters.search}::text is null
          or al.action ilike '%' || ${filters.search} || '%'
          or al.entity_type ilike '%' || ${filters.search} || '%'
          or al.entity_id ilike '%' || ${filters.search} || '%'
          or au.name ilike '%' || ${filters.search} || '%'
          or au.email ilike '%' || ${filters.search} || '%'
          or al.ip_address ilike '%' || ${filters.search} || '%'
        )
    `) as {
      total: number;
      actors: number;
      entities: number;
      last_event: unknown;
    }[];

    const total = Number(countRows[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
    const stats: AuditStats = {
      actors: Number(countRows[0]?.actors ?? 0),
      entities: Number(countRows[0]?.entities ?? 0),
      lastEvent: toIsoString(countRows[0]?.last_event),
    };
    const meta = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
      stats,
    };

    const rows = await queryRows(
      sql,
      filters,
      range,
      pagination.limit,
      pagination.skip,
    );
    const items = rows.map(mapAuditLog);

    if (format === "csv") {
      const exportRows = await queryRows(sql, filters, range, 10000, 0);
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "audit_logs.export",
        entityType: "audit_logs",
        entityId: format,
        ...requestMeta(request),
      });
      return reportResponse(
        {
          items,
          pagination: meta,
          dateRange: range,
          exportTruncated: total > exportRows.length,
        },
        exportRows.map(mapAuditLog).map((row) => ({
          Timestamp: row.createdAt,
          User: row.actorName ?? row.actorEmail ?? "System",
          Action: row.action,
          Entity: row.entityType,
          EntityId: row.entityId,
          IpAddress: row.ipAddress ?? "",
          Before: JSON.stringify(row.beforeData),
          After: JSON.stringify(row.afterData),
        })),
        "audit-logs",
        format,
      );
    }

    return ok(
      { items, pagination: meta, dateRange: range },
      200,
      { pagination: meta, dateRange: range },
    );
  } catch (error) {
    return failUnexpected(error);
  }
}
