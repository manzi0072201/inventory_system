import { auth } from "@/lib/auth/server";
import { requireRequestSession, touchLastLogin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { failUnexpected, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireRequestSession(request);
    await touchLastLogin(session.appUser.id);
    return ok({
      authenticated: true,
      source: session.source,
      user: session.authUser,
      profile: session.appUser,
    });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRequestSession(request);
    if (session.source === "cookie") {
      await auth.signOut();
    }
    await writeAuditLog(getSql(), {
      actorId: session.appUser.id,
      action: "auth.sign_out",
      entityType: "app_user",
      entityId: session.appUser.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
    return ok({ signedOut: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
