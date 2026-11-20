import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRequestSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { toIsoString } from "@/lib/date-range";
import { notFound } from "@/lib/errors";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import { paginate, parsePagination } from "@/lib/pagination";
import { parseSort, sortRows } from "@/lib/sorting";
import { parseJson, parseQuery, uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

const kinds = ["alert", "activity"] as const;
const categories = [
  "stock",
  "sales",
  "purchase",
  "sales-return",
  "purchase-return",
  "customer",
  "supplier",
  "expense",
] as const;
const tones = ["danger", "warning", "success", "info"] as const;

const listSchema = z
  .object({
    kind: z.enum(kinds).optional(),
    category: z.enum(categories).optional(),
    tone: z.enum(tones).optional(),
    unread: z.enum(["true", "false"]).optional(),
  })
  .strict();

const createSchema = z
  .object({
    userId: uuid.optional(),
    broadcast: z.boolean().default(false),
    kind: z.enum(kinds),
    category: z.enum(categories),
    tone: z.enum(tones),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).nullish(),
    href: z.string().trim().max(500).nullish(),
  })
  .strict()
  .refine((value) => value.broadcast || Boolean(value.userId), {
    message: "Provide userId or broadcast: true.",
  });

type NotificationRow = {
  id: string;
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

export async function GET(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const sql = getSql();
    const params = new URL(request.url).searchParams;
    const query = parseQuery(params, listSchema);
    const pagination = parsePagination(params);
    const sort = parseSort(
      params,
      ["occurredAt", "readAt", "title", "kind", "tone"],
      "occurredAt",
      "desc",
    );

    let items = ((await sql`
      select
        id::text as id,
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
      where user_id = ${session.appUser.id}::uuid
    `) as NotificationRow[]).map(mapNotification);

    if (query.kind) items = items.filter((item) => item.kind === query.kind);
    if (query.category) {
      items = items.filter((item) => item.category === query.category);
    }
    if (query.tone) items = items.filter((item) => item.tone === query.tone);
    if (query.unread) {
      items = items.filter((item) =>
        query.unread === "true" ? item.readAt === null : item.readAt !== null,
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
    const session = await requirePermission(request, "notifications");
    const input = await parseJson(request, createSchema);
    const sql = getSql();

    const targets = input.userId
      ? ((await sql`
          select id::text as id
          from app_users
          where id = ${input.userId}::uuid and status = 'Active'
        `) as { id: string }[])
      : ((await sql`
          select id::text as id
          from app_users
          where status = 'Active'
        `) as { id: string }[]);

    if (input.userId && targets.length === 0) {
      throw notFound("User not found.");
    }

    const targetRows = JSON.stringify(
      targets.map((target) => ({
        ...target,
        notificationId: crypto.randomUUID(),
      })),
    );
    const inserted = (await sql`
      with inserted as (
        insert into notifications (
          id, user_id, kind, category, tone, title, description, href
        )
        select
          (item.value ->> 'notificationId')::uuid,
          (item.value ->> 'id')::uuid,
          ${input.kind},
          ${input.category},
          ${input.tone},
          ${input.title},
          ${input.description ?? null},
          ${input.href ?? null}
        from jsonb_array_elements(${targetRows}::jsonb) as item(value)
        returning
          id,
          kind,
          category,
          tone,
          title,
          description,
          href,
          occurred_at,
          read_at,
          created_at
      )
      select * from inserted
    `) as NotificationRow[];
    const created = inserted.map(mapNotification);

    if (input.userId) {
      for (const item of created) {
        await writeAuditLog(sql, {
          actorId: session.appUser.id,
          action: "notification.create",
          entityType: "notification",
          entityId: item.id,
          afterData: item,
          ...requestMeta(request),
        });
      }
    } else {
      await writeAuditLog(sql, {
        actorId: session.appUser.id,
        action: "notification.create",
        entityType: "notification",
        entityId: "broadcast",
        afterData: {
          count: created.length,
          ids: created.map((item) => item.id),
        },
        ...requestMeta(request),
      });
    }

    return ok(created, 201);
  } catch (error) {
    return failUnexpected(error);
  }
}
