// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: KNOWLEDGE HUB → other hubs
// Subscribers: knowledge.content_pack_installed, knowledge.content_pack_removed,
//   knowledge.sop_updated, knowledge.training_completed, knowledge.gap_detected
// ============================================

import {
  type SubFn,
  safeCreateTask, safeNotifyAdmins, safePublish,
  daysFromNow,
  recordAudit,
} from './helpers';

export function registerKnowledgeHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. KNOWLEDGE HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // knowledge.content_pack_installed → Framework Hub: seed new framework controls
  //                                  → Compliance Hub: reassess compliance with new content
  //                                  → Workspace Hub: update workspace with new data
  //                                  → Audit Hub: log content pack installation
  sub('knowledge.content_pack_installed', 'xhub-knowledge→framework-seed', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Map content pack to frameworks: ${payload.packName || entityId}`,
      description: `Content pack "${payload.packName}" installed (version: ${payload.version || 'latest'}). Map new controls and frameworks to workspace.`,
      dueDate: daysFromNow(7), entityType: 'content_pack', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'content_pack_installed', packId: entityId, packName: payload.packName },
    });

    await safePublish({
      eventType: 'framework.updated', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      entityType: 'content_pack', entityId,
      payload: { frameworkName: payload.packName, reason: 'content_pack_install' },
    });

    await recordAudit({
      tenantId, userId: payload.installedBy || 'agrc-os', module: 'cross_hub', action: 'create',
      entityType: 'content_pack_install', entityId: entityId || '',
      afterState: { trigger: 'knowledge.content_pack_installed', packName: payload.packName, version: payload.version },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // knowledge.content_pack_removed → Compliance Hub: gap check — controls may be missing
  //                                → Framework Hub: verify framework integrity
  //                                → Risk Hub: flag potential coverage gap
  sub('knowledge.content_pack_removed', 'xhub-knowledge→compliance-gap', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'content_pack', entityId,
      payload: { reason: 'content_pack_removed', packName: payload.packName },
    });

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Coverage gap: content pack "${payload.packName || entityId}" removed`,
        description: `Content pack removed. Controls and frameworks from this pack may no longer be tracked. Verify compliance coverage.`,
        category: 'compliance', likelihood: 3, impact: 4,
      });
    } catch { /* best effort */ }

    await recordAudit({
      tenantId, userId: payload.removedBy || 'agrc-os', module: 'cross_hub', action: 'delete',
      entityType: 'content_pack_removal', entityId: entityId || '',
      afterState: { trigger: 'knowledge.content_pack_removed', packName: payload.packName },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // knowledge.sop_updated → Workflow Hub: update linked workflows
  //                       → Team Hub: notify affected teams
  //                       → Compliance Hub: verify SOP-to-control alignment
  //                       → Governance Hub: policy alignment check
  sub('knowledge.sop_updated', 'xhub-knowledge→workflow-update', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Update workflows for SOP change: ${payload.sopTitle || entityId}`,
      description: `SOP "${payload.sopTitle}" updated. Review and update linked workflows, procedures, and training materials.`,
      dueDate: daysFromNow(7), entityType: 'sop', entityId: entityId || '',
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Verify control alignment: SOP ${payload.sopTitle || entityId}`,
      description: `Ensure updated SOP aligns with mapped controls and compliance requirements.`,
      dueDate: daysFromNow(14), entityType: 'sop', entityId: entityId || '',
    });

    await safeNotifyAdmins(tenantId, {
      type: 'sop_updated',
      title: '[AGRC-OS] SOP Updated',
      body: `SOP "${payload.sopTitle || entityId}" has been updated. Workflow and compliance alignment tasks created.`,
      link: '/knowledge-hub',
    });
  });

  // knowledge.training_completed → Team Hub: update member competency
  //                              → Compliance Hub: training evidence for controls
  //                              → Evidence Hub: log training completion as evidence
  //                              → Audit Hub: training compliance record
  sub('knowledge.training_completed', 'xhub-knowledge→compliance-evidence', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Record training evidence: ${payload.trainingTitle || entityId}`,
      description: `Training "${payload.trainingTitle}" completed by ${payload.completedBy || 'user'}. Attach completion certificate as evidence for related controls.`,
      dueDate: daysFromNow(3), entityType: 'training', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'evidence.uploaded', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      entityType: 'training', entityId,
      payload: { reason: 'training_completed', trainingTitle: payload.trainingTitle, completedBy: payload.completedBy },
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'training_completed', controlId: payload.linkedControlId },
    });

    await recordAudit({
      tenantId, userId: payload.completedBy || 'agrc-os', module: 'cross_hub', action: 'create',
      entityType: 'training_completion', entityId: entityId || '',
      afterState: { trigger: 'knowledge.training_completed', title: payload.trainingTitle, completedBy: payload.completedBy },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // knowledge.gap_detected → Risk Hub: create knowledge gap risk
  //                        → Compliance Hub: flag training gap
  //                        → Team Hub: assign training
  //                        → Reports Hub: include in gap report
  sub('knowledge.gap_detected', 'xhub-knowledge→risk-gap', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Knowledge gap risk: ${payload.gapArea || entityId}`,
        description: `Knowledge gap detected in "${payload.gapArea}". Team competency may be insufficient for ${payload.affectedDomain || 'GRC operations'}.`,
        category: 'operational', likelihood: 3, impact: 3,
      });
    } catch { /* best effort */ }

    await safeCreateTask(tenantId, {
      title: `[Auto] Address knowledge gap: ${payload.gapArea || entityId}`,
      description: `Knowledge gap in "${payload.gapArea}". Assign training, update SOPs, or install relevant content pack.`,
      dueDate: daysFromNow(14), entityType: 'knowledge_gap', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'knowledge', entityId,
      payload: { reason: 'knowledge_gap', area: payload.gapArea },
    });
  });
}
