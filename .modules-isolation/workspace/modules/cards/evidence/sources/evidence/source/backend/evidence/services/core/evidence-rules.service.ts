import { registerRule } from '../../ports/platform.port';
import { logger } from '../../ports/logger.port';
import { safeQuery } from "@dos/db";

export function registerEvidenceRules() {
  registerRule({
    id: 'evidence.expired',
    name: 'Evidence Expired',
    description: 'Evidence with expiry_date in the past requires immediate renewal action',
    condition: { '==': [{ var: 'status' }, 'expired'] },
    action: 'request_evidence_renewal',
    confidence: 1.0,
  });

  logger.info('[EvidenceModule] Deterministic rules registered');
}
