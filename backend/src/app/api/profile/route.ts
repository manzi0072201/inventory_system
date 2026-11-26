import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { requireRequestSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getSql } from "@/lib/db";
import { badRequest, conflict, isUniqueViolation } from "@/lib/errors";
import { failUnexpected, ok, requestMeta } from "@/lib/http";
import {
  deleteManagedObject,
  isValidStoredFileForScope,
  resolveStoredFile,
} from "@/lib/storage";
import { parseJson, storedFileValue } from "@/lib/validation";

export const dynamic = "force-dynamic";

const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    email: z.string().trim().email().max(255).optional(),
    phone: z.string().max(50).optional(),
    shopZone: z.string().max(120).optional(),
    avatarUrl: storedFileValue
      .nullish()
      .refine(
        (value) => value == null || isValidStoredFileForScope(value, "avatar"),
        "Must be a URL or an avatars/ object key.",
      ),
  })
  .strict();

export async function GET(request: Request) {
  try {
    const session = await requireRequestSession(request);
    return ok(session.appUser);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRequestSession(request);
    const input = await parseJson(request, updateProfileSchema);
    const sql = getSql();
    const currentRows = (await sql`
      select avatar_url from app_users where id = ${session.appUser.id}::uuid
    `) as { avatar_url: string | null }[];
    const previousAvatar = currentRows[0]?.avatar_url ?? null;
    const avatarValue = input.avatarUrl === undefined ? undefined : input.avatarUrl;
    const authImage = avatarValue ? await resolveStoredFile(avatarValue) : null;

    if (input.email) {
      const duplicate = await sql`
        select 1 from app_users
        where lower(email) = lower(${input.email})
          and id <> ${session.appUser.id}::uuid
        union all
        select 1 from neon_auth."user"
        where lower(email) = lower(${input.email})
          and id::text <> ${session.appUser.authUserId}
        limit 1
      `;
      if (duplicate.length > 0) {
        throw conflict("A user with that email already exists.");
      }
    }

    if (session.source === "cookie" && (input.name || avatarValue !== undefined)) {
      const { error } = await auth.updateUser({
        ...(input.name ? { name: input.name } : {}),
        ...(avatarValue !== undefined ? { image: authImage } : {}),
      });
      if (error) {
        throw badRequest(error.message ?? "Failed to update auth profile.");
      }
    }

    try {
      await sql`
        update app_users
        set
          name = coalesce(${input.name ?? null}, name),
          email = coalesce(${input.email ?? null}, email),
          phone = coalesce(${input.phone ?? null}, phone),
          shop_zone = coalesce(${input.shopZone ?? null}, shop_zone),
          avatar_url = case
            when ${avatarValue !== undefined} then ${avatarValue ?? null}
            else avatar_url
          end,
          updated_at = now()
        where id = ${session.appUser.id}::uuid
      `;

      if (input.email) {
        await sql`
          update neon_auth."user"
          set
            email = ${input.email},
            "emailVerified" = false,
            "updatedAt" = now()
          where id::text = ${session.appUser.authUserId}
        `;
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw conflict("A user with that email already exists.");
      }
      throw error;
    }

    if (
      avatarValue !== undefined &&
      previousAvatar &&
      previousAvatar !== avatarValue
    ) {
      await deleteManagedObject(previousAvatar);
    }

    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "profile.update",
      entityType: "app_user",
      entityId: session.appUser.id,
      beforeData: session.appUser,
      afterData: input,
      ...requestMeta(request),
    });

    const updated = await requireRequestSession(request);
    return ok(updated.appUser);
  } catch (error) {
    return failUnexpected(error);
  }
}
