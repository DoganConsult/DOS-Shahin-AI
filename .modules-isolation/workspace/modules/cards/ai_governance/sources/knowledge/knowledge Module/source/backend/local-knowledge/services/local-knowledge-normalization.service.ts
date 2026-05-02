// ============================================
// Shahin-Ai — Local Knowledge Normalization Service
// R3.3B Phase C: Normalizes extracted data into canonical structures
// ============================================

import { logger } from '../../action/ports/logger.port';
import { safeQuery } from "@dos/db";

export interface NormalizedKnowledge {
  knowledgeLane: 'authoritative_structured' | 'semi_structured_document' | 'operational_event' | 'learned_internal';
  canonicalType: string;
  canonicalData: Record<string, unknown>;
  links: {
    modules?: string[];
    frameworks?: string[];
    controls?: string[];
    orgUnits?: string[];
    owners?: string[];
  };
  metadata: Record<string, unknown>;
}

/**
 * Normalizes extracted data into canonical knowledge structures
 */
export async function normalizeToCanonical(
  tenantId: string,
  extractionResult: Record<string, unknown>,
  extractorKey: string,
): Promise<NormalizedKnowledge> {
  const data = (extractionResult.data ?? {}) as Record<string, unknown>;

  // Determine knowledge lane
  let knowledgeLane: NormalizedKnowledge['knowledgeLane'] = 'semi_structured_document';
  if (extractorKey === 'structured-export') {
    knowledgeLane = 'authoritative_structured';
  } else if (extractorKey === 'policy' || extractorKey === 'committee-minutes' || extractorKey === 'audit-report' || extractorKey === 'contract') {
    knowledgeLane = 'semi_structured_document';
  }

  // Build canonical structure based on document type
  let canonicalType = 'document';
  const canonicalData: Record<string, unknown> = {};
  const links: NormalizedKnowledge['links'] = {};

  if (extractorKey === 'policy') {
    canonicalType = 'policy';
    canonicalData.title = data.title;
    canonicalData.policyNumber = data.policyNumber;
    canonicalData.effectiveDate = data.effectiveDate;
    canonicalData.reviewDate = data.reviewDate;
    canonicalData.owner = data.owner;
    canonicalData.category = data.category;
    canonicalData.status = data.status;
    canonicalData.version = data.version;
    canonicalData.sections = data.sections || [];
    links.modules = ['governance'];
    if (data.owner) links.owners = [data.owner];
  } else if (extractorKey === 'committee-minutes') {
    canonicalType = 'committee_minutes';
    canonicalData.committeeName = data.committeeName;
    canonicalData.meetingDate = data.meetingDate;
    canonicalData.attendees = data.attendees || [];
    canonicalData.agendaItems = data.agendaItems || [];
    canonicalData.decisions = data.decisions || [];
    canonicalData.actionItems = data.actionItems || [];
    links.modules = ['governance'];
  } else if (extractorKey === 'audit-report') {
    canonicalType = 'audit_report';
    canonicalData.reportTitle = data.reportTitle;
    canonicalData.auditDate = data.auditDate;
    canonicalData.auditor = data.auditor;
    canonicalData.scope = data.scope;
    canonicalData.findings = data.findings || [];
    canonicalData.recommendations = data.recommendations || [];
    canonicalData.severity = data.severity;
    links.modules = ['audit', 'compliance'];
  } else if (extractorKey === 'contract') {
    canonicalType = 'contract';
    canonicalData.contractTitle = data.contractTitle;
    canonicalData.contractNumber = data.contractNumber;
    canonicalData.parties = data.parties || [];
    canonicalData.effectiveDate = data.effectiveDate;
    canonicalData.expiryDate = data.expiryDate;
    canonicalData.value = data.value;
    canonicalData.currency = data.currency;
    links.modules = ['governance'];
  } else if (extractorKey === 'evidence-metadata') {
    canonicalType = 'evidence_metadata';
    canonicalData.evidenceId = data.evidenceId;
    canonicalData.controlId = data.controlId;
    canonicalData.evidenceType = data.evidenceType;
    canonicalData.collectedDate = data.collectedDate;
    canonicalData.owner = data.owner;
    canonicalData.systemReference = data.systemReference;
    canonicalData.ticketId = data.ticketId;
    links.modules = ['evidence', 'compliance'];
    if (data.controlId) links.controls = [data.controlId];
    if (data.owner) links.owners = [data.owner];
  } else if (extractorKey === 'structured-export') {
    canonicalType = 'structured_data';
    canonicalData.records = data.records || [];
    canonicalData.recordCount = data.recordCount || 0;
    canonicalData.fields = data.fields || [];
    // Try to infer module links from field names
    if (data.fields?.some((f: string) => f.toLowerCase().includes('control'))) {
      links.modules = ['compliance'];
    }
    if (data.fields?.some((f: string) => f.toLowerCase().includes('risk'))) {
      links.modules = (links.modules || []).concat('risk');
    }
  } else {
    canonicalType = 'document';
    canonicalData.rawData = data;
  }

  const normalized: NormalizedKnowledge = {
    knowledgeLane,
    canonicalType,
    canonicalData,
    links,
    metadata: {
      extractor: extractorKey,
      confidence: extractionResult.confidence || 0.5,
      rulesUsed: extractionResult.rulesUsed || [],
      normalizedAt: new Date().toISOString(),
    },
  };

  logger.info('[LocalKnowledgeNormalization] Normalized knowledge', {
    tenantId,
    canonicalType,
    knowledgeLane,
    hasLinks: Object.keys(links).length > 0,
  });

  return normalized;
}
