// ============================================
// Shahin-Ai — Local Knowledge OS Linkage Service
// R3.3B Phase E: Wires imported knowledge into Governance OS
// ============================================

import { eventBus } from '../../action/ports/events.port';
import { upsertContext, type ContextDimension as _ContextDimension } from '../../governance-os/services/governance/governance-context-engine.service.js';
import { getDocument } from './local-knowledge-documents.service';
import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

/**
 * Links ingested knowledge into the Governance OS
 * Called after successful ingestion + extraction + document creation
 */
export async function linkKnowledgeToOS(
  tenantId: string,
  ingestionId: string,
  documentId?: string,
): Promise<void> {
  try {
    // Get document and extraction data
    let document = null;
    if (documentId) {
      document = await getDocument(tenantId, documentId);
    }

    // Query extraction data from ingestion metadata
    const _schema = tenantSchema(tenantId);
    const ingestionRes = await LocalKnowledgeAutoRepo.query124(tenantSchema(tenantId), [ingestionId]);
    const ingestionRow = ingestionRes.rows[0];
    if (!ingestionRow) {
      logger.warn('[LocalKnowledgeOSLinkage] No ingestion record found', { tenantId, ingestionId });
      return;
    }

    const metadata = typeof ingestionRow.metadata === 'string'
      ? JSON.parse(ingestionRow.metadata)
      : (ingestionRow.metadata || {});
    const extractedData = metadata.normalizedContent || metadata.extractedData || {};
    const knowledgeLane = metadata.knowledgeLane || document?.knowledgeLane || 'semi_structured_document';

    // Emit appropriate event based on knowledge lane and document type
    await emitKnowledgeEvent(tenantId, ingestionId, documentId, knowledgeLane, extractedData, document);

    // Update context dimensions where applicable
    await updateContextFromKnowledge(tenantId, knowledgeLane, extractedData);

    logger.info('[LocalKnowledgeOSLinkage] Knowledge linked to OS', {
      tenantId,
      ingestionId,
      documentId,
      knowledgeLane,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeOSLinkage] Linkage failed', {
      tenantId,
      ingestionId,
      error: (err as Error).message,
    });
  }
}

/**
 * Emits events based on knowledge type
 */
async function emitKnowledgeEvent(
  tenantId: string,
  ingestionId: string,
  documentId: string | undefined,
  knowledgeLane: string,
  extractedData: unknown,
  document: unknown,
): Promise<void> {

  const documentType = document?.documentType || extractedData.documentType || 'any';

  // Map knowledge lane + document type to event
  let eventType: string | null = null;
  let entityType: string = 'knowledge';
  let entityId: string = documentId || ingestionId;

  if (knowledgeLane === 'authoritative_structured') {
    // Structured truth: org structure, users, assets, policy register, etc.

    if (extractedData.orgStructure || extractedData.departments || extractedData.teams) {
      eventType = 'foundation.org_structure.updated';
      entityType = 'org_structure';

    } else if (extractedData.policyRegister || extractedData.policies) {
      eventType = 'policy.register.updated';
      entityType = 'policy_register';

    } else if (extractedData.frameworkMappings || extractedData.controls) {
      eventType = 'compliance.framework_mapping.updated';
      entityType = 'framework_mapping';
    } else {
      eventType = 'knowledge.structured.imported';
    }
  } else if (knowledgeLane === 'semi_structured_document') {
    // Documents: policies, procedures, minutes, reports, contracts

    if (documentType === 'policy' || extractedData.policyNumber) {
      eventType = 'policy.imported';
      entityType = 'policy';

      entityId = extractedData.policyId || extractedData.policyNumber || entityId;

    } else if (documentType === 'committee-minutes' || extractedData.committeeName) {
      eventType = 'governance.committee_minutes.ingested';
      entityType = 'committee_minutes';

    } else if (documentType === 'audit-report' || extractedData.auditDate) {
      eventType = 'audit.report.imported';
      entityType = 'audit_report';

    } else if (documentType === 'contract' || extractedData.contractNumber) {
      eventType = 'vendor.contract.updated';
      entityType = 'contract';
    } else {
      eventType = 'knowledge.document.imported';
    }
  } else if (knowledgeLane === 'operational_event') {
    // Events: status changes, overdue evidence, control failures, findings

    if (extractedData.controlFailure || extractedData.controlId) {
      eventType = 'control.state_changed';
      entityType = 'control';

      entityId = extractedData.controlId || entityId;

    } else if (extractedData.finding || extractedData.findingId) {
      eventType = 'audit.finding_created';
      entityType = 'finding';

      entityId = extractedData.findingId || entityId;

    } else if (extractedData.evidenceOverdue || extractedData.evidenceId) {
      eventType = 'evidence.overdue';
      entityType = 'evidence';

      entityId = extractedData.evidenceId || entityId;
    } else {
      eventType = 'knowledge.event.recorded';
    }
  } else if (knowledgeLane === 'learned_internal') {
    // Learned knowledge: lessons, playbooks, patterns, guidance
    eventType = 'knowledge.learned.published';
  }

  if (eventType) {
    await eventBus.publish(({
          eventType: eventType as string,
          tenantId,
          sourceService: 'local-knowledge-hub',
          entityType,
          entityId,
          severity: 'info',
          payload: {
            ingestionId,
            documentId,
            knowledgeLane,
            documentType,
            extractedFields: Object.keys(extractedData),
          },
        } as any)).catch(err => {
      logger.warn('[LocalKnowledgeOSLinkage] Event publish failed', {
        eventType,
        error: (err as Error).message,
      });
    });
  }
}

/**
 * Updates context dimensions from imported knowledge
 */
async function updateContextFromKnowledge(
  tenantId: string,
  knowledgeLane: string,
  extractedData: unknown,
): Promise<void> {
  try {
    // Update regulatory_profile if framework/regulator info is present

    if (extractedData.frameworks || extractedData.regulators || extractedData.frameworkMappings) {
      const regulatoryFacts: Record<string, unknown> = {};

      if (extractedData.frameworks) {

        regulatoryFacts.frameworks = Array.isArray(extractedData.frameworks) ? extractedData.frameworks : [extractedData.frameworks];
      }

      if (extractedData.regulators) {

        regulatoryFacts.regulators = Array.isArray(extractedData.regulators) ? extractedData.regulators : [extractedData.regulators];
      }

      if (extractedData.frameworkMappings) {

        regulatoryFacts.frameworkMappings = extractedData.frameworkMappings;
      }

      if (Object.keys(regulatoryFacts).length > 0) {
        await (upsertContext as any)(
          tenantId,
          'regulatory_profile',
          {
            ...regulatoryFacts,
            source: 'local_knowledge_import',
            importedAt: new Date().toISOString(),
          },
        );
      }
    }

    if (extractedData.departments || extractedData.teams || extractedData.orgStructure) {
      const orgFacts: Record<string, unknown> = {};

      if (extractedData.departments) {

        orgFacts.departments = Array.isArray(extractedData.departments) ? extractedData.departments : [extractedData.departments];
      }

      if (extractedData.teams) {

        orgFacts.teams = Array.isArray(extractedData.teams) ? extractedData.teams : [extractedData.teams];
      }

      if (extractedData.orgStructure) {

        orgFacts.structure = extractedData.orgStructure;
      }

      if (Object.keys(orgFacts).length > 0) {
        await (upsertContext as any)(
          tenantId,
          'org_structure',
          {
            ...orgFacts,
            source: 'local_knowledge_import',
            importedAt: new Date().toISOString(),
          },
        );
      }
    }

    if (extractedData.controls || extractedData.controlMappings) {
      const frameworkFacts: Record<string, unknown> = {};

      if (extractedData.controls) {

        frameworkFacts.controls = Array.isArray(extractedData.controls) ? extractedData.controls : [extractedData.controls];
      }

      if (extractedData.controlMappings) {

        frameworkFacts.controlMappings = extractedData.controlMappings;
      }

      if (Object.keys(frameworkFacts).length > 0) {
        await (upsertContext as any)(
          tenantId,
          'framework_profile',
          {
            ...frameworkFacts,
            source: 'local_knowledge_import',
            importedAt: new Date().toISOString(),
          },
        );
      }
    }
  } catch (err) {
    logger.warn('[LocalKnowledgeOSLinkage] Context update failed', {
      tenantId,
      knowledgeLane,
      error: (err as Error).message,
    });
  }
}
