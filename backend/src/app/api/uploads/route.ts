import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireRequestSession } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { failUnexpected, ok, requestMeta } from "@/lib/http";
import { assertPermission, type PermissionKey } from "@/lib/permissions";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  assertImage,
  createUploadUrl,
  makeObjectKey,
} from "@/lib/storage";
import { parseJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

const uploadSchema = z
  .object({
    scope: z.enum(["avatar", "logo", "product"]),
    contentType: z.enum(ALLOWED_IMAGE_TYPES),
    size: z.number().int().positive().max(MAX_IMAGE_BYTES),
  })
  .strict();

const permissionForScope: Record<z.infer<typeof uploadSchema>["scope"], PermissionKey | null> = {
  avatar: null,
  logo: "settings",
  product: "products",
};

export async function POST(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const input = await parseJson(request, uploadSchema);
    const permission = permissionForScope[input.scope];
    if (permission) {
      assertPermission(
        session.appUser.role,
        session.appUser.permissions,
        permission,
      );
    }

    assertImage(input.contentType, input.size);
    const key = makeObjectKey(input.scope, input.contentType);
    const uploadUrl = await createUploadUrl(key, input.contentType, 900);

    await writeAuditLog(getSql(), {
      actorId: session.appUser.id,
      action: "upload.presign",
      entityType: "object",
      entityId: key,
      afterData: {
        scope: input.scope,
        contentType: input.contentType,
        size: input.size,
      },
      ...requestMeta(request),
    });

    return ok({
      key,
      uploadUrl,
      contentType: input.contentType,
      size: input.size,
      expiresIn: 900,
    });
  } catch (error) {
    return failUnexpected(error);
  }
}
