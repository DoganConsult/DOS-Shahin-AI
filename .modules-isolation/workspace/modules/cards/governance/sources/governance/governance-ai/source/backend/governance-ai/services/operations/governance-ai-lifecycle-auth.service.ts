import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const PROTECTED_ACTIONS = new Set([
  'pipeline.execute',
  'signal.scan',
  'signal.reinterpret',
  'interpretation.batch',
  'detector.configure',
  'compliance_score.compute',
  'score_explanation.generate',
  'escalation.evaluate',
  'escalation.manual',
  'escalation.deescalate',
  'recommendation.generate',
  'recommendation.accept',
]);

export async function checkLifecycleAuth(
  tenantId: string,
  userId: string,
  action: string,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_ai_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}
