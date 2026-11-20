import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { requireRequestSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, unauthorized } from "@/lib/errors";
import { failUnexpected, ok } from "@/lib/http";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    revokeOtherSessions: z.boolean().optional().default(true),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const session = await requireRequestSession(request);
    if (session.source !== "cookie") {
      throw unauthorized("Password change requires a browser session.");
    }

    const input = await parseJson(request, changePasswordSchema);
    const { error } = await auth.changePassword({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: input.revokeOtherSessions,
    });
    if (error) {
      throw badRequest(error.message ?? "Failed to change password.");
    }

    await writeAuditLog(getSql(), {
      actorId: session.appUser.id,
      action: "auth.password_change",
      entityType: "app_user",
      entityId: session.appUser.id,
      afterData: { revokeOtherSessions: input.revokeOtherSessions },
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return ok({ changed: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
