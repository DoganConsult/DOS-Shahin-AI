// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '../../../../modules/governance-os/platform/services/misc/logger.service';
import { emptyResult } from '@dos/db';
// ============================================
// Cross-Hub: PRIVACY HUB → other hubs
// Subscribers: privacy.dpia_required, privacy.impact_high
// Feature 20: DPIA auto-trigger on high-risk AI processing
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  enterpriseCreateTask, safePublish,
  daysFromNow as _daysFromNow,
} from '../helpers';
import { createDPIA } from '../../../../../modules/ksa-regulatory/source/backend/ksa-regulatory/services/ksa-hub.service.js';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export function registerPrivacyHub(sub: SubFn): void {

  // privacy.dpia_required → Privacy Hub: create DPIA assessment
  //                      → Governance Hub: notify DPO
  //                      → Compliance Hub: track DPIA completion
  sub('privacy.dpia_required', 'xhub-privacy→dpia-create', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      // Check if DPIA already exists for this entity/activity
      const schema = tenantSchema(tenantId);
      const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT dpia_id FROM "${schema}".dpia_assessments
         WHERE data->>'triggerEntityId' = $1 OR data->>'processingActivity' = $2
         ORDER BY created_at DESC LIMIT 1`,
        [entityId || '', payload?.processingActivity || ''],
      ), { operation: 'query dpia_assessments' });

      if (existing.rows.length > 0) {
        logger.info(`[PrivacyHub] DPIA already exists for ${entityId || payload?.processingActivity} in tenant ${tenantId}`);
        return;
      }

      // Create DPIA assessment
      const dpiaData = {
        triggerEntityId: entityId,
        triggerEntityType: payload?.entityType || 'ai_processing',
        processingActivity: payload?.processingActivity || `AI processing activity ${entityId}`,
        triggerReason: payload?.reason || 'high-risk AI processing detected',
        sensitivityLevel: payload?.sensitivityLevel || 'high',
        dataClassification: payload?.dataClassification || 'restricted',
        autoCreated: true,
        createdBy: 'agrc-os-privacy-hub',
        wizardData: {
          activity: {
            name: payload?.processingActivity || `AI Processing: ${entityId}`,
            department: payload?.department || 'AI Operations',
            description: payload?.description || `High-risk AI processing activity requiring DPIA assessment. Triggered automatically by AGRC-OS.`,
            controller: payload?.dataController || 'System',
            dpo: payload?.dpoContact || '',
          },
          dataCategories: payload?.dataCategories || [],
          lawfulBasis: payload?.lawfulBasis || '',
          risks: payload?.risks || [],
          mitigations: payload?.mitigations || [],
        },
      };

      const { dpiaId } = await createDPIA(tenantId, {
        title: `[Auto] DPIA: ${payload?.processingActivity || entityId || 'High-risk AI processing'}`,
        createdBy: 'agrc-os-privacy-hub',
        wizardData: dpiaData,
      });

      logger.info(`[PrivacyHub] Feature 20: Created DPIA ${dpiaId} for high-risk AI processing ${entityId} in tenant ${tenantId}`);

      // Create task for DPO to review and complete DPIA
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] Complete DPIA: ${payload?.processingActivity || entityId}`,
        description: `DPIA ${dpiaId} created automatically for high-risk AI processing. Review and complete the assessment.`,
        taskType: 'policy_creation', assigneeRole: 'dpo',
        entityType: 'dpia', entityId: dpiaId, dueInHours: 336, // 14 days
        triggerSource: 'xhub-privacy→dpia-review',
      });

      // Publish event for tracking
      await safePublish({
        eventType: 'privacy.dpia_created', tenantId,

        sourceService: 'cross-hub-privacy', severity: 'warning',
        entityType: 'dpia', entityId: dpiaId,
        payload: { triggerEntityId: entityId, triggerReason: payload?.reason, autoCreated: true },
      });
    } catch (err: unknown) {
      logger.warn(`[PrivacyHub] Feature 20: Failed to create DPIA for ${entityId} in tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // privacy.impact_high → Privacy Hub: assess impact and trigger DPIA if needed
  // (This subscriber may already exist in operational-hubs.ts, but we add it here for completeness)
  sub('privacy.impact_high', 'xhub-privacy→impact-assessment', async (e) => {
    const { tenantId, entityId, payload } = e;

    // Check sensitivity level and data classification
    const sensitivityLevel = payload?.sensitivityLevel || 'normal';
    const dataClassification = payload?.dataClassification || 'internal';

    // Trigger DPIA if high-risk conditions are met
    if (
      sensitivityLevel === 'high' || sensitivityLevel === 'restricted' ||
      dataClassification === 'restricted' || dataClassification === 'confidential'
    ) {
      await safePublish({
        eventType: 'privacy.dpia_required', tenantId,
        sourceService: 'cross-hub-privacy', severity: 'warning',

        entityType: payload?.entityType || 'ai_processing', entityId,
        payload: {
          processingActivity: payload?.processingActivity || `High-impact processing: ${entityId}`,
          sensitivityLevel,
          dataClassification,
          reason: `High sensitivity (${sensitivityLevel}) or restricted data classification (${dataClassification})`,
          entityType: payload?.entityType,
          department: payload?.department,
          description: payload?.description,
          dataController: payload?.dataController,
          dpoContact: payload?.dpoContact,
          dataCategories: payload?.dataCategories,
        },
      });
    }
  });
}
