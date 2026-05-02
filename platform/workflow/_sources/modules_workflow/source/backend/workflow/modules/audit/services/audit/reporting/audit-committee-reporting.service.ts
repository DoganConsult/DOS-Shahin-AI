import { safeQuery } from '@dos/db';

export async function generateExecutiveSummary(tenantId: string): Promise<{ reportId?: string }> {
  try {
    const res = await safeQuery(
      `INSERT INTO public.audit_committee_reports (tenant_id, generated_at, payload_json)
       VALUES ($1, NOW(), '{}'::jsonb)
       RETURNING id`,
      [tenantId],
    );
    const id = (res.rows[0] as any)?.id as string | undefined;
    return { reportId: id };
  } catch {
    return {};
  }
}
