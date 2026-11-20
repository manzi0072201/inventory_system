export type QueryTag = (
  strings: TemplateStringsArray,
  ...values: any[]
) => any;

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export function auditQuery(sql: QueryTag, input: AuditInput) {
  return sql`
    insert into audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      ip_address,
      user_agent
    )
    values (
      ${input.actorId ?? null},
      ${input.action},
      ${input.entityType},
      ${input.entityId},
      ${JSON.stringify(input.beforeData ?? null)}::jsonb,
      ${JSON.stringify(input.afterData ?? null)}::jsonb,
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null}
    )
  `;
}

export async function writeAuditLog(
  sql: QueryTag,
  input: AuditInput,
): Promise<void> {
  await auditQuery(sql, input);
}
