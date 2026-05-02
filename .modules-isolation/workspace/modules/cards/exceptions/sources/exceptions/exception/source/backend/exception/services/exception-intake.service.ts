import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitEvent } from '../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import type { ExceptionRecord as _ExceptionRecord, ValidationResult } from '@dos/types';

export interface ExceptionIntakeData {
  title: string;
  description?: string;
  controlId?: string;
  policyId?: string;
  justification: string;
  compensatingControls?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  exceptionType: 'policy' | 'control' | 'compliance' | 'risk_acceptance' | 'process';
  requestedBy: string;
  requestedDuration: number;
  expiryDate?: string;
  linkedRiskId?: string;
  linkedObligationId?: string;
}

export function validateIntake(data: Partial<ExceptionIntakeData>): ValidationResult {
  const errors: string[] = [];
  if (!data.title?.trim()) errors.push('title is required');
  if (data.title && data.title.length > 500) errors.push('title must not exceed 500 characters');
  if (!data.justification?.trim()) errors.push('justification is required');
  if (data.justification && data.justification.length > 5000) errors.push('justification must not exceed 5000 characters');
  if (data.description && data.description.length > 5000) errors.push('description must not exceed 5000 characters');
  if (data.compensatingControls && data.compensatingControls.length > 5000) errors.push('compensatingControls must not exceed 5000 characters');
  if (!data.riskLevel || !['low', 'medium', 'high', 'critical'].includes(data.riskLevel)) errors.push('riskLevel must be low, medium, high, or critical');
  if (!data.exceptionType) errors.push('exceptionType is required');
  if (!data.requestedBy?.trim()) errors.push('requestedBy is required');
  if (!data.requestedDuration || data.requestedDuration <= 0) errors.push('requestedDuration must be positive');
  if (data.requestedDuration && data.requestedDuration > 3650) errors.push('requestedDuration must not exceed 3650 days');
  return { valid: errors.length === 0, errors };
}

export async function intakeException(
  tenantId: string,
  data: ExceptionIntakeData,
): Promise<{ exceptionId: string; status: string }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.exception_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}
