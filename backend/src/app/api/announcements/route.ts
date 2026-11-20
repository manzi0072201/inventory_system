import { z } from "zod";
import { requireRequestSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery } from "@/lib/validation";

export const dynamic = "force-dynamic";

const toneSchema = z.enum(["danger", "warning", "success", "info"]);

const dateField = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid YYYY-MM-DD date.");

const listSchema = z
  .object({
    tone: toneSchema.optional(),
    read: z.enum(["true", "false"]).optional(),
    q: z.string().max(120).optional(),
  })
  .strict();

const createSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    body: z.string().trim().min(1).max(5000),
    category: z.string().trim().max(80).nullish(),
    date: dateField.optional(),
    tone: toneSchema,
    icon: z.string().trim().max(80).nullish(),
  })
  .strict();

type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  date: string | Date;
  tone: z.infer<typeof toneSchema>;
  icon: string | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  read?: boolean;
  read_at?: string | Date | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  date: string;
  tone: z.infer<typeof toneSchema>;
  icon: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  read: boolean;
  readAt: string | null;
};

function mapAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category ?? null,
    date: String(row.date).slice(0, 10),
    tone: row.tone,
    icon: row.icon ?? null,
    createdBy: row.created_by ?? null,
    createdAt: toIsoString(row.created_at) ?? "",
    updatedAt: toIsoString(row.updated_at) ?? "",
    read: Boolean(row.read),
    readAt: toIsoString(row.read_at ?? null),
  };
}

export async function GET(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["date", "title", "tone", "createdAt"],
      "date",
      "desc",
    );

    const rows = (await sql`
      select
        a.*,
        (ar.read_at is not null) as read,
        ar.read_at as read_at
      from announcements a
      left join announcement_reads ar
        on ar.announcement_id = a.id
        and ar.user_id = ${session.appUser.id}::uuid
    `) as AnnouncementRow[];

    let items = rows.map(mapAnnouncement);
    if (query.tone) {
      items = items.filter((item) => item.tone === query.tone);
    }
    if (query.read !== undefined) {
      const wanted = query.read === "true";
      items = items.filter((item) => item.read === wanted);
    }
    if (query.q) {
      const needle = query.q.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(needle) ||
          item.body.toLowerCase().includes(needle),
      );
    }

    const result = paginate(sortRows(items, sort), pagination);
    return ok(result.rows, 200, { pagination: result.meta });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePermission(request, "announcements");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const rows = (await sql`
      insert into announcements (
        title, body, category, date, tone, icon, created_by
      )
      values (
        ${input.title}, ${input.body}, ${input.category ?? null},
        coalesce(${input.date ?? null}::date, current_date),
        ${input.tone}, ${input.icon ?? null}, ${session.appUser.id}::uuid
      )
      returning *
    `) as AnnouncementRow[];

    const announcement = mapAnnouncement(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "announcement.create",
      entityType: "announcement",
      entityId: announcement.id,
      afterData: announcement,
      ...requestMeta(request),
    });
    return ok(announcement, 201);
  } catch (error) {
    return failUnexpected(error);
  }
}
