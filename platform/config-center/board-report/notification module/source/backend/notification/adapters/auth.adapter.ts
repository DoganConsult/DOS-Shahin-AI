import { query } from '@dos/db';

export async function validateSession(token: string): Promise<{ userId: string; tenantId: string } | null> {
  try {
    const result = await query(
      `SELECT user_id, tenant_id FROM user_sessions WHERE session_token = $1 AND expires_at > NOW() LIMIT 1`,
      [token],
    );
    const row = (result as any).rows[0];
    if (!row) return null;
    return { userId: row.user_id, tenantId: row.tenant_id };
  } catch {
    return null;
  }
}
