// ============================================================================
// Shahin — Governance Baseline Seeders: Exceptions
// Seeds sample control exceptions with compensating controls.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { getTenantAdmin } from './_shared';

export async function seedExceptions(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  const adminId = await getTenantAdmin(tenantId);

  // Check if control_exceptions table exists and has data
  const exists = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".control_exceptions WHERE deleted_at IS NULL`,
  );
  if (Number(getFirstRow(exists)?.cnt || 0) >= 3) return { seeded: 0 };

  const controls = await safeQuery(
    `SELECT control_id, title FROM "${schema}".controls WHERE deleted_at IS NULL LIMIT 3`,
  );

  const EXCEPTION_REASONS = [
    { reason: 'Legacy system cannot support required control implementation. Migration planned for Q3.', risk_level: 'high', status: 'approved', days: 90 },
    { reason: 'Vendor dependency — control requires third-party integration not yet available.', risk_level: 'medium', status: 'approved', days: 180 },
    { reason: 'Resource constraint — implementation deferred pending budget approval.', risk_level: 'medium', status: 'pending', days: 120 },
  ];

  for (let i = 0; i < Math.min(controls.rows.length, EXCEPTION_REASONS.length); i++) {
    const ctrl = controls.rows[i];
    const exc = EXCEPTION_REASONS[i];
    await safeQuery(
      `INSERT INTO "${schema}".control_exceptions
         (control_id, reason, risk_level, status, requested_by, approved_by,
          valid_from, valid_to, compensating_controls)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, CURRENT_DATE + ($7 || ' days')::INTERVAL, $8)`,
      [
        ctrl.control_id, exc.reason, exc.risk_level, exc.status, adminId,
        exc.status === 'approved' ? adminId : null,
        String(exc.days),
        `Monitoring controls in place. Manual review process established.`,
      ],
    );
    seeded++;
  }

  return { seeded };
}
