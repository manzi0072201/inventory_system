import { z } from "zod";
import { requireRequestSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const toneSchema = z.enum(["danger", "warning", "success", "info"]);

const dateField = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid YYYY-MM-DD date.");

const updateSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    body: z.string().trim().min(1).max(5000),
    category: z.string().trim().max(80).nullish(),
    date: dateField,
    tone: toneSchema,
    icon: z.string().trim().max(80).nullish(),
  })
  .partial()
  .strict();

type RouteContext = { params: Promise<{ id: string }> };

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

async function loadAnnouncement(
  sql: ReturnType<typeof getSql>,
  id: string,
  userId: string,
): Promise<AnnouncementRow | undefined> {
  const rows = (await sql`
    select
      a.*,
      (ar.read_at is not null) as read,
      ar.read_at as read_at
    from announcements a
    left join announcement_reads ar
      on ar.announcement_id = a.id
      and ar.user_id = ${userId}::uuid
    where a.id = ${id}::uuid
  `) as AnnouncementRow[];
  return rows[0];
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireRequestSession(request);
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const row = await loadAnnouncement(sql, id, session.appUser.id);
    if (!row) throw notFound("Announcement not found.");
    return ok(mapAnnouncement(row));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "announcements");
    const id = parseUuid((await context.params).id);
    const input = await parseJson(request, updateSchema);
    const sql = getSql();

    const existing = await loadAnnouncement(sql, id, session.appUser.id);
    if (!existing) throw notFound("Announcement not found.");
    const before = mapAnnouncement(existing);

    const rows = (await sql`
      with updated as (
        update announcements
        set
          title = coalesce(${input.title ?? null}, title),
          body = coalesce(${input.body ?? null}, body),
          category = case when ${input.category !== undefined} then ${input.category ?? null} else category end,
          date = coalesce(${input.date ?? null}::date, date),
          tone = coalesce(${input.tone ?? null}, tone),
          icon = case when ${input.icon !== undefined} then ${input.icon ?? null} else icon end,
          updated_at = now()
        where id = ${id}::uuid
        returning *
      )
      select
        u.*,
        (ar.read_at is not null) as read,
        ar.read_at as read_at
      from updated u
      left join announcement_reads ar
        on ar.announcement_id = u.id
        and ar.user_id = ${session.appUser.id}::uuid
    `) as AnnouncementRow[];
    if (!rows[0]) throw notFound("Announcement not found.");

    const after = mapAnnouncement(rows[0]);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "announcement.update",
      entityType: "announcement",
      entityId: id,
      beforeData: before,
      afterData: after,
      ...requestMeta(request),
    });
    return ok(after);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requirePermission(request, "announcements");
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const existing = await loadAnnouncement(sql, id, session.appUser.id);
    if (!existing) throw notFound("Announcement not found.");

    const rows = await sql`
      delete from announcements where id = ${id}::uuid returning id
    `;
    if (!rows[0]) throw notFound("Announcement not found.");

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "announcement.delete",
      entityType: "announcement",
      entityId: id,
      beforeData: mapAnnouncement(existing),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
