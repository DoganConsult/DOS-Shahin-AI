// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
import { safeQuery } from '@dos/db';
import { tenantSchema } from '@dos/db';
import Fuse from 'fuse.js';
import { getFirstRow } from '@dos/db';
import { eventBus } from '@dos/platform-core/events';
import { fgaClient } from './fga-client';

export interface TrainingCertificationRequirement {
  requirement_id: string;
  action_token: string;
  required_catalog_id: string | null;
  certification_code: string;
  description: string | null;
  mandatory: boolean;
  grace_period_days: number;
  enabled: boolean;
}

export interface CertificationCheckResult {
  authorized: boolean;
  reason: string;
  missingCertifications: string[];
  expiringSoon: string[];
  gracePeriodActive: boolean;
}

export interface TrainingRecommendation {
  campaignId: string;
  title: string;
  matchScore: number;
  tags: string[];
}

export interface TrainingComplianceMetrics {
  totalUsers: number;
  certifiedUsers: number;
  expiredCertifications: number;
  expiringSoon: number;
  complianceRate: number;
  topMissingCertifications: Array<{ certification_code: string; missing_count: number }>;
  recentCompletions: Array<{ user_id: string; certification_code: string; completed_at: string }>;
}

export async function syncCertificationAuthZState(
  tenantId: string,
  userId: string,
  certificationCode: string,
  isActive: boolean,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  logger.info(`[Training-Gate] Syncing AuthZ state for ${userId} cert ${certificationCode}`);

  try {
    if (isActive) {
      await fgaClient.write({
        writes: [{
          user: `user:${userId}`,
          relation: 'certified_for',
          object: `action:${certificationCode}`,
        }],
      });
      logger.info(`[Training-Gate] FGA tuple granted: ${userId} certified for ${certificationCode}.`);
    } else {
      await fgaClient.write({
        deletes: [{
          user: `user:${userId}`,
          relation: 'certified_for',
          object: `action:${certificationCode}`,
        }],
      });
      logger.warn(`[Training-Gate] FGA tuple revoked: ${userId} lost ${certificationCode}.`);
    }
  } catch (error) {
    logger.error(`[Training-Gate] Failed to sync FGA state for ${userId}.`, error);
  }

  try {
    await safeQuery(
      `INSERT INTO "${schema}".training_certification_audit
         (user_id, certification_code, action, synced_to_fga, metadata)
       VALUES ($1, $2, $3, true, $4::jsonb)`,
      [userId, certificationCode, isActive ? 'granted' : 'revoked',
       JSON.stringify({ timestamp: new Date().toISOString() })],
    );
  } catch {
    // table may not exist yet
  }

  await eventBus.publish({
    eventType: isActive ? 'training.certification_granted' : 'training.certification_revoked',
    tenantId,
    severity: isActive ? 'info' : 'warning',
    entityType: 'user',
    entityId: userId,
    payload: { certificationCode, isActive },
  }).catch(() => {});
}

export async function checkCertificationForAction(
  tenantId: string,
  userId: string,
  actionToken: string,
): Promise<CertificationCheckResult> {
  const schema = tenantSchema(tenantId);

  const reqResult = await safeQuery(
    `SELECT * FROM "${schema}".training_certification_requirements
     WHERE action_token = $1 AND enabled = true`,
    [actionToken],
  );

  if (reqResult.rows.length === 0) {
    return { authorized: true, reason: 'No certification requirements for this action.', missingCertifications: [], expiringSoon: [], gracePeriodActive: false };
  }

  const requirements: TrainingCertificationRequirement[] = reqResult.rows;
  const missingCertifications: string[] = [];
  const expiringSoon: string[] = [];
  let gracePeriodActive = false;

  const fgaChecks = await Promise.allSettled(
    requirements.map(req =>
      fgaClient.check({
        user: `user:${userId}`,
        relation: 'certified_for',
        object: `action:${req.certification_code}`,
      }),
    ),
  );

  for (let i = 0; i < requirements.length; i++) {
    const req = requirements[i];
    const fgaResult = fgaChecks[i];
    const hasCert = fgaResult.status === 'fulfilled' && (fgaResult.value.allowed ?? false);

    if (!hasCert) {
      const certResult = await safeQuery(
        `SELECT completed_at, expires_at
         FROM "${schema}".user_certifications
         WHERE user_id = $1 AND certification_code = $2
         ORDER BY completed_at DESC LIMIT 1`,
        [userId, req.certification_code],
      );
      const cert = getFirstRow(certResult)!;

      if (cert?.expires_at) {
        const expiresAt = new Date(cert.expires_at);
        const now = new Date();
        if (expiresAt > now) {
          const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
          if (daysUntilExpiry <= 30) expiringSoon.push(req.certification_code);
          continue;
        }
        if (req.grace_period_days > 0) {
          const graceEnd = new Date(expiresAt.getTime() + req.grace_period_days * 86400000);
          if (graceEnd > now) {
            gracePeriodActive = true;
            continue;
          }
        }
      }

      if (req.mandatory) {
        missingCertifications.push(req.certification_code);
      }
    } else {
      const certResult = await safeQuery(
        `SELECT expires_at FROM "${schema}".user_certifications
         WHERE user_id = $1 AND certification_code = $2 AND expires_at IS NOT NULL
         ORDER BY completed_at DESC LIMIT 1`,
        [userId, req.certification_code],
      );
      const cert = getFirstRow(certResult)!;
      if (cert?.expires_at) {
        const daysUntilExpiry = Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / 86400000);
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
          expiringSoon.push(req.certification_code);
        }
      }
    }
  }

  if (missingCertifications.length > 0) {
    return {
      authorized: false,
      reason: `Missing required certification(s): ${missingCertifications.join(', ')}`,
      missingCertifications,
      expiringSoon,
      gracePeriodActive,
    };
  }

  return {
    authorized: true,
    reason: gracePeriodActive ? 'Authorized (grace period active for expired certification)' : 'All certifications verified.',
    missingCertifications: [],
    expiringSoon,
    gracePeriodActive,
  };
}

export async function recommendTrainingForGap(
  tenantId: string,
  gapDescription: string,
  limit: number = 5,
): Promise<TrainingRecommendation[]> {
  const schema = tenantSchema(tenantId);

  const coursesRes = await safeQuery(
    `SELECT campaign_id, title, description, tags
     FROM "${schema}".training_campaigns
     WHERE status = 'active'`,
    [],
  );

  const courses = coursesRes.rows.map((c: Record<string, unknown>) => ({
    id: c.campaign_id,
    title: c.title || '',
    tags: Array.isArray(c.tags) ? c.tags : [],
    searchableText: `${c.title || ''} ${c.description || ''} ${(Array.isArray(c.tags) ? c.tags : []).join(' ')}`,
  }));

  if (courses.length === 0) return [];

  const fuse = new Fuse(courses, {
    keys: ['searchableText'],
    threshold: 0.4,
    includeScore: true,
  });

  const results = fuse.search(gapDescription, { limit });

  return results.map(r => ({
    campaignId: r.item.id,
    title: r.item.title,
    matchScore: Math.round((1 - (r.score ?? 1)) * 100),
    tags: r.item.tags,
  }));
}

export async function batchSyncCertifications(tenantId: string): Promise<{
  synced: number;
  revoked: number;
  errors: number;
}> {
  const schema = tenantSchema(tenantId);
  let synced = 0;
  let revoked = 0;
  let errors = 0;

  const activeResult = await safeQuery(
    `SELECT DISTINCT user_id, certification_code
     FROM "${schema}".user_certifications
     WHERE (expires_at IS NULL OR expires_at > NOW())
       AND status = 'completed'`,
  );

  for (const row of activeResult.rows) {
    try {
      await fgaClient.write({
        writes: [{
          user: `user:${row.user_id}`,
          relation: 'certified_for',
          object: `action:${row.certification_code}`,
        }],
      });
      synced++;
    } catch {
      errors++;
    }
  }

  const expiredResult = await safeQuery(
    `SELECT DISTINCT user_id, certification_code
     FROM "${schema}".user_certifications
     WHERE expires_at IS NOT NULL AND expires_at <= NOW()
       AND status = 'completed'`,
  );

  for (const row of expiredResult.rows) {
    try {
      await fgaClient.write({
        deletes: [{
          user: `user:${row.user_id}`,
          relation: 'certified_for',
          object: `action:${row.certification_code}`,
        }],
      });
      revoked++;
    } catch {
      errors++;
    }
  }

  logger.info(`[Training-Gate] Batch sync: ${synced} granted, ${revoked} revoked, ${errors} errors`, { tenantId });

  await eventBus.publish({
    eventType: 'training.batch_sync_completed',
    tenantId,
    severity: 'info',
    payload: { synced, revoked, errors },
  }).catch(() => {});

  return { synced, revoked, errors };
}

export async function getExpiringCertifications(
  tenantId: string,
  withinDays: number = 30,
): Promise<Array<{ user_id: string; certification_code: string; expires_at: string; days_remaining: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT user_id, certification_code, expires_at,
       CEIL(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400)::int AS days_remaining
     FROM "${schema}".user_certifications
     WHERE status = 'completed'
       AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '1 day' * $1
     ORDER BY expires_at ASC`,
    [withinDays],
  );
  return result.rows;
}

export async function autoRevokeExpiredCertifications(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  const expiredResult = await safeQuery(
    `SELECT user_id, certification_code
     FROM "${schema}".user_certifications
     WHERE status = 'completed'
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()`,
  );

  let revokedCount = 0;
  for (const row of expiredResult.rows) {
    try {
      await syncCertificationAuthZState(tenantId, row.user_id, row.certification_code, false);
      await safeQuery(
        `UPDATE "${schema}".user_certifications
         SET status = 'expired'
         WHERE user_id = $1 AND certification_code = $2
           AND status = 'completed' AND expires_at IS NOT NULL AND expires_at <= NOW()`,
        [row.user_id, row.certification_code],
      );
      revokedCount++;
    } catch {
      logger.warn(`[Training-Gate] Failed to revoke expired cert ${row.certification_code} for ${row.user_id}`);
    }
  }

  if (revokedCount > 0) {
    logger.info(`[Training-Gate] Auto-revoked ${revokedCount} expired certification(s)`, { tenantId });
  }

  return revokedCount;
}

export async function getMandatoryRequirements(
  tenantId: string,
  actionToken?: string,
): Promise<TrainingCertificationRequirement[]> {
  const schema = tenantSchema(tenantId);

  if (actionToken) {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".training_certification_requirements
       WHERE action_token = $1 AND enabled = true AND mandatory = true
       ORDER BY action_token`,
      [actionToken],
    );
    return result.rows;
  }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".training_certification_requirements
     WHERE enabled = true AND mandatory = true ORDER BY action_token, certification_code`,
  );
  return result.rows;
}

export async function getTrainingComplianceMetrics(
  tenantId: string,
): Promise<TrainingComplianceMetrics> {
  const schema = tenantSchema(tenantId);

  const [usersResult, certifiedResult, expiredResult, expiringResult, missingResult, recentResult] = await Promise.all([
    safeQuery(`SELECT COUNT(DISTINCT id)::int AS cnt FROM "${schema}".users WHERE status = 'active'`),
    safeQuery(
      `SELECT COUNT(DISTINCT user_id)::int AS cnt
       FROM "${schema}".user_certifications
       WHERE status = 'completed' AND (expires_at IS NULL OR expires_at > NOW())`,
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}".user_certifications
       WHERE status = 'completed' AND expires_at IS NOT NULL AND expires_at <= NOW()`,
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS cnt
       FROM "${schema}".user_certifications
       WHERE status = 'completed' AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'`,
    ),
    safeQuery(
      `SELECT tcr.certification_code, COUNT(*)::int AS missing_count
       FROM "${schema}".training_certification_requirements tcr
       LEFT JOIN "${schema}".user_certifications uc
         ON uc.certification_code = tcr.certification_code
         AND uc.status = 'completed'
         AND (uc.expires_at IS NULL OR uc.expires_at > NOW())
       WHERE tcr.enabled = true AND tcr.mandatory = true AND uc.user_id IS NULL
       GROUP BY tcr.certification_code
       ORDER BY missing_count DESC LIMIT 10`,
    ),
    safeQuery(
      `SELECT user_id, certification_code, completed_at
       FROM "${schema}".user_certifications
       WHERE status = 'completed'
       ORDER BY completed_at DESC LIMIT 10`,
    ),
  ]);

  const totalUsers = getFirstRow(usersResult)?.cnt ?? 0;
  const certifiedUsers = getFirstRow(certifiedResult)?.cnt ?? 0;

  return {
    totalUsers,
    certifiedUsers,
    expiredCertifications: getFirstRow(expiredResult)?.cnt ?? 0,
    expiringSoon: getFirstRow(expiringResult)?.cnt ?? 0,
    complianceRate: totalUsers > 0 ? Math.round((certifiedUsers / totalUsers) * 10000) / 100 : 0,
    topMissingCertifications: missingResult.rows,
    recentCompletions: recentResult.rows,
  };
}

export async function autoAssignTrainingForGap(
  tenantId: string,
  userId: string,
  gapDescription: string,
): Promise<{ assigned: boolean; campaignId: string | null; reason: string }> {
  const recommendations = await recommendTrainingForGap(tenantId, gapDescription, 1);
  if (recommendations.length === 0) {
    return { assigned: false, campaignId: null, reason: 'No matching training course found.' };
  }

  const bestMatch = recommendations[0];
  const schema = tenantSchema(tenantId);

  try {
    const insertResult = await safeQuery(
      `INSERT INTO "${schema}".training_enrollments
         (user_id, campaign_id, status, enrollment_source, metadata)
       VALUES ($1, $2, 'enrolled', 'auto_gap_assignment', $3::jsonb)
       ON CONFLICT DO NOTHING`,
      [userId, bestMatch.campaignId,
       JSON.stringify({ gapDescription, matchScore: bestMatch.matchScore })],
    );

    const wasInserted = (insertResult.rowCount ?? 0) > 0;
    if (!wasInserted) {
      return { assigned: false, campaignId: bestMatch.campaignId, reason: `Already enrolled in: ${bestMatch.title}` };
    }

    logger.info(`[Training-Gate] Auto-assigned training ${bestMatch.campaignId} to ${userId} for gap: ${gapDescription}`, { tenantId });

    await eventBus.publish({
      eventType: 'training.auto_assigned',
      tenantId,
      severity: 'info',
      entityType: 'user',
      entityId: userId,
      payload: { campaignId: bestMatch.campaignId, gapDescription, matchScore: bestMatch.matchScore },
    }).catch(() => {});

    return { assigned: true, campaignId: bestMatch.campaignId, reason: `Assigned: ${bestMatch.title} (${bestMatch.matchScore}% match)` };
  } catch (err) {
    return { assigned: false, campaignId: bestMatch.campaignId, reason: 'Failed to create enrollment.' };
  }
}
