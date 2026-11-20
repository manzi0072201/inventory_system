import { writeAuditLog } from "@/lib/audit";
import { requireRequestSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { failUnexpected, ok, requestMeta } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const sql = getSql();
    const rows = (await sql`
      update notifications
      set read_at = now()
      where user_id = ${session.appUser.id}::uuid and read_at is null
      returning id
    `) as { id: string }[];
    const updated = rows.length;

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "notification.read_all",
      entityType: "notification",
      entityId: session.appUser.id,
      afterData: { updated },
      ...requestMeta(request),
    });
    return ok({ updated });
  } catch (error) {
    return failUnexpected(error);
  }
}
