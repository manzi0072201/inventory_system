import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRequestSession } from "@/lib/auth/session";
import { getSql, type SqlExecutor } from "@/lib/db";
import { toIsoString } from "@/lib/date-range";
import { badRequest, notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta } from "@/lib/http";
import { assertPermission } from "@/lib/permissions";
import { parseJson, parseUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateSchema = z.object({ read: z.boolean() }).strict();

type RouteContext = { params: Promise<{ id: string }> };

type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  category: string;
  tone: string;
  title: string;
  description: string | null;
  href: string | null;
  occurred_at: unknown;
  read_at: unknown;
  created_at: unknown;
};

function mapNotification(row: NotificationRow) {
  return {
    id: row.id,
    kind: row.kind,
    category: row.category,
    tone: row.tone,
    title: row.title,
    description: row.description,
    href: row.href,
    occurredAt: toIsoString(row.occurred_at),
    readAt: toIsoString(row.read_at),
    createdAt: toIsoString(row.created_at),
  };
}

async function loadNotification(sql: SqlExecutor, id: string) {
  const rows = (await sql`
    select
      id::text as id,
      user_id::text as user_id,
      kind,
      category,
      tone,
      title,
      description,
      href,
      occurred_at,
      read_at,
      created_at
    from notifications
    where id = ${id}::uuid
  `) as NotificationRow[];
  return rows[0];
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireRequestSession(request);
    const rawId = (await context.params).id;
    const input = await parseJson(request, updateSchema);
    const sql = getSql();

    if (rawId.startsWith("live:")) {
      const key = rawId.slice(5);
      if (!/^[a-z0-9-]{1,100}$/.test(key)) {
        throw badRequest("Invalid live notification id.");
      }
      if (input.read) {
        await sql`
          insert into live_notification_reads (
            user_id, notification_key, read_at
          )
          values (${session.appUser.id}::uuid, ${key}, now())
          on conflict (user_id, notification_key)
          do update set read_at = now()
        `;
      } else {
        await sql`
          delete from live_notification_reads
          where user_id = ${session.appUser.id}::uuid
            and notification_key = ${key}
        `;
      }
      const readAt = input.read ? new Date().toISOString() : null;
      const occurredAt = new Date().toISOString();
      const notification = {
        id: rawId,
        kind: "alert",
        category: null,
        tone: "info",
        title: key,
        description: null,
        href: null,
        occurredAt,
        readAt,
        createdAt: occurredAt,
      };
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "notification.read_live",
        entityType: "notification",
        entityId: rawId,
        afterData: { id: rawId, key, read: input.read, readAt },
        ...requestMeta(request),
      });
      return ok(notification);
    }

    const id = parseUuid(rawId);
    const existing = await loadNotification(sql, id);
    if (!existing) throw notFound("Notification not found.");
    if (existing.user_id !== session.appUser.id) {
      assertPermission(
        session.appUser.role,
        session.appUser.permissions,
        "notifications",
      );
    }

    const rows = (await sql`
      update notifications
      set read_at = case when ${input.read}::boolean then now() else null end
      where id = ${id}::uuid
      returning
        id,
        user_id::text as user_id,
        kind,
        category,
        tone,
        title,
        description,
        href,
        occurred_at,
        read_at,
        created_at
    `) as NotificationRow[];
    const notification = mapNotification(rows[0]);

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "notification.read",
      entityType: "notification",
      entityId: id,
      beforeData: mapNotification(existing),
      afterData: notification,
      ...requestMeta(request),
    });
    return ok(notification);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireRequestSession(request);
    const id = parseUuid((await context.params).id);
    const sql = getSql();
    const existing = await loadNotification(sql, id);
    if (!existing) throw notFound("Notification not found.");
    if (existing.user_id !== session.appUser.id) {
      assertPermission(
        session.appUser.role,
        session.appUser.permissions,
        "notifications",
      );
    }

    await sql`
      delete from notifications
      where id = ${id}::uuid
    `;
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "notification.delete",
      entityType: "notification",
      entityId: id,
      beforeData: mapNotification(existing),
      ...requestMeta(request),
    });
    return ok({ id, deleted: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
