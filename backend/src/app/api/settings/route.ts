import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { getSql, type SqlExecutor } from "@/lib/db";
import { toIsoString } from "@/lib/date-range";
import { failUnexpected, ok, requestMeta, requirePermission } from "@/lib/http";
import {
  deleteManagedObject,
  isValidStoredFileForScope,
  resolveStoredFile,
} from "@/lib/storage";
import { parseJson, storedFileValue } from "@/lib/validation";

export const dynamic = "force-dynamic";

const groupSchema = z.record(z.string(), z.unknown());

const updateSettingsSchema = z
  .object({
    company: groupSchema.optional(),
    localization: groupSchema.optional(),
    inventory: groupSchema.optional(),
    salesPos: groupSchema.optional(),
    purchasing: groupSchema.optional(),
    finance: groupSchema.optional(),
    notifications: groupSchema.optional(),
    security: groupSchema.optional(),
    appearance: groupSchema.optional(),
    documents: groupSchema.optional(),
    integrations: groupSchema.optional(),
    system: groupSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const logoUrl = value.company?.logoUrl;
    if (logoUrl === undefined || logoUrl === null) return;
    if (
      typeof logoUrl !== "string" ||
      !storedFileValue.safeParse(logoUrl).success ||
      !isValidStoredFileForScope(logoUrl, "logo")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company", "logoUrl"],
        message: "Must be a URL or a settings/ object key.",
      });
    }
  });

type SettingsRow = {
  company: Record<string, unknown>;
  localization: Record<string, unknown>;
  inventory: Record<string, unknown>;
  sales_pos: Record<string, unknown>;
  purchasing: Record<string, unknown>;
  finance: Record<string, unknown>;
  notifications: Record<string, unknown>;
  security: Record<string, unknown>;
  appearance: Record<string, unknown>;
  documents: Record<string, unknown>;
  integrations: Record<string, unknown>;
  system: Record<string, unknown>;
  updated_at: unknown;
  updated_by: string | null;
};

async function fetchSettings(sql: SqlExecutor): Promise<SettingsRow> {
  const rows = (await sql`select * from app_settings where id`) as SettingsRow[];
  return rows[0];
}

function toJson(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value ?? {});
}

async function mapSettings(row: SettingsRow) {
  const company = { ...(row.company ?? {}) };
  if (typeof company.logoUrl === "string") {
    company.logoUrl = await resolveStoredFile(company.logoUrl);
  }
  return {
    company,
    localization: row.localization ?? {},
    inventory: row.inventory ?? {},
    salesPos: row.sales_pos ?? {},
    purchasing: row.purchasing ?? {},
    finance: row.finance ?? {},
    notifications: row.notifications ?? {},
    security: row.security ?? {},
    appearance: row.appearance ?? {},
    documents: row.documents ?? {},
    integrations: row.integrations ?? {},
    system: row.system ?? {},
    updatedAt: toIsoString(row.updated_at),
    updatedBy: row.updated_by,
  };
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "settings");
    const settings = await fetchSettings(getSql());
    return ok(await mapSettings(settings));
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePermission(request, "settings");
    const input = await parseJson(request, updateSettingsSchema);
    const sql = getSql();
    const before = await fetchSettings(sql);

    await sql`insert into app_settings (id) values (true) on conflict (id) do nothing`;
    await sql`
      update app_settings
      set
        company = company || ${toJson(input.company)}::jsonb,
        localization = localization || ${toJson(input.localization)}::jsonb,
        inventory = inventory || ${toJson(input.inventory)}::jsonb,
        sales_pos = sales_pos || ${toJson(input.salesPos)}::jsonb,
        purchasing = purchasing || ${toJson(input.purchasing)}::jsonb,
        finance = finance || ${toJson(input.finance)}::jsonb,
        notifications = notifications || ${toJson(input.notifications)}::jsonb,
        security = security || ${toJson(input.security)}::jsonb,
        appearance = appearance || ${toJson(input.appearance)}::jsonb,
        documents = documents || ${toJson(input.documents)}::jsonb,
        integrations = integrations || ${toJson(input.integrations)}::jsonb,
        system = system || ${toJson(input.system)}::jsonb,
        updated_by = ${session.appUser.id}::uuid,
        updated_at = now()
      where id
    `;

    const previousLogoValue = before?.company?.logoUrl;
    const previousLogo =
      typeof previousLogoValue === "string" ? previousLogoValue : null;
    const nextLogo = input.company?.logoUrl;
    if (previousLogo && nextLogo !== undefined && previousLogo !== nextLogo) {
      await deleteManagedObject(previousLogo);
    }

    const after = await fetchSettings(sql);
    const mapped = await mapSettings(after);
    await writeAuditLog(sql, {
      actorId: session.appUser.id,
      action: "settings.update",
      entityType: "app_settings",
      entityId: "singleton",
      beforeData: before ? await mapSettings(before) : null,
      afterData: mapped,
      ...requestMeta(request),
    });
    return ok(mapped);
  } catch (error) {
    return failUnexpected(error);
  }
}
