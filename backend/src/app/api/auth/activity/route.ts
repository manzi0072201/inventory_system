import { requireRequestSession, touchActivity } from "@/lib/auth/session";
import { failUnexpected, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireRequestSession(request, {
      skipActivityCheck: true,
    });
    await touchActivity(session.appUser.id);
    return ok({ active: true });
  } catch (error) {
    return failUnexpected(error);
  }
}
