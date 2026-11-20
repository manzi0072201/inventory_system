import { requireRequestSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { toIsoString } from "@/lib/date-range";
import { getSql } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta } from "@/lib/http";
import { parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

type ReadRow = {
  announcement_id: string;
  user_id: string;
  read_at: string | Date;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireRequestSession(request);
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const announcements = await sql`
      select id from announcements where id = ${id}::uuid
    `;
    if (!announcements[0]) throw notFound("Announcement not found.");

    const rows = (await sql`
      insert into announcement_reads (announcement_id, user_id)
      values (${id}::uuid, ${session.appUser.id}::uuid)
      on conflict (announcement_id, user_id) do update set read_at = now()
      returning announcement_id, user_id, read_at
    `) as ReadRow[];

    const result = {
      announcementId: id,
      userId: session.appUser.id,
      read: true,
      readAt: toIsoString(rows[0].read_at) ?? "",
    };

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "announcement.read",
      entityType: "announcement",
      entityId: id,
      afterData: result,
      ...requestMeta(request),
    });
    return ok(result);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireRequestSession(request);
    const id = parseUuid((await context.params).id);
    const sql = getSql();

    const announcements = await sql`
      select id from announcements where id = ${id}::uuid
    `;
    if (!announcements[0]) throw notFound("Announcement not found.");

    const rows = (await sql`
      delete from announcement_reads
      where announcement_id = ${id}::uuid and user_id = ${session.appUser.id}::uuid
      returning read_at
    `) as { read_at: string | Date }[];

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "announcement.unread",
      entityType: "announcement",
      entityId: id,
      beforeData: {
        announcementId: id,
        userId: session.appUser.id,
        read: true,
        readAt: rows[0] ? toIsoString(rows[0].read_at) : null,
      },
      ...requestMeta(request),
    });
    return ok({ announcementId: id, userId: session.appUser.id, read: false });
  } catch (error) {
    return failUnexpected(error);
  }
}
