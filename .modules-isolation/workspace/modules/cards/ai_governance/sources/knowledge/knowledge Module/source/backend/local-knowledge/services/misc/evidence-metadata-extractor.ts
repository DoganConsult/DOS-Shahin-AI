// ============================================
// Shahin-Ai — Evidence Metadata Extractor
// R3.3B Phase C: Deterministic extraction for evidence metadata
// ============================================

import { BaseExtractor, ExtractionResult } from './base-extractor';
import { safeQuery } from "@dos/db";

export class EvidenceMetadataExtractor extends BaseExtractor {
  async extract(content: Buffer | string, _contentType: string): Promise<ExtractionResult> {
    const text = this.parseText(content);
    const rulesUsed: string[] = [];
    const data: Record<string, unknown> = {
      documentType: 'evidence_metadata',
      evidenceId: null,
      controlId: null,
      evidenceType: null,
      collectedDate: null,
      owner: null,
      systemReference: null,
      ticketId: null,
      rawText: text.substring(0, 5000),
    };

    // Rule 1: Extract evidence ID
    const evidenceIdMatch = text.match(/(?:Evidence\s*(?:ID|Id|#)?[:\s]*)?([A-Z]{2,6}[-/]?\d{4}[-/]?\d{2,4})/i);
    if (evidenceIdMatch) {
      data.evidenceId = evidenceIdMatch[1];
      rulesUsed.push('evidence_id_pattern');
    }

    // Rule 2: Extract control ID
    const controlIdMatch = text.match(/(?:Control\s*(?:ID|Id|#)?[:\s]*)?([A-Z]{2,6}[-/]?\d{2,6})/i);
    if (controlIdMatch) {
      data.controlId = controlIdMatch[1];
      rulesUsed.push('control_id_pattern');
    }

    // Rule 3: Extract evidence type
    const typeMatch = text.match(/(?:Type|Evidence Type)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (typeMatch) {
      data.evidenceType = typeMatch[1];
      rulesUsed.push('type_extraction');
    }

    // Rule 4: Extract collected date
    const dateMatch = text.match(/(?:Collected|Date|Created)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    if (dateMatch) {
      data.collectedDate = dateMatch[1];
      rulesUsed.push('date_extraction');
    }

    // Rule 5: Extract owner
    const ownerMatch = text.match(/(?:Owner|Responsible)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (ownerMatch) {
      data.owner = ownerMatch[1];
      rulesUsed.push('owner_extraction');
    }

    // Rule 6: Extract system reference
    const sysRefMatch = text.match(/(?:System|System Reference)[:\s]+([A-Z0-9_-]+)/i);
    if (sysRefMatch) {
      data.systemReference = sysRefMatch[1];
      rulesUsed.push('system_reference_extraction');
    }

    // Rule 7: Extract ticket ID
    const ticketMatch = text.match(/(?:Ticket|Ticket ID|Incident)[:\s]+([A-Z0-9-]+)/i);
    if (ticketMatch) {
      data.ticketId = ticketMatch[1];
      rulesUsed.push('ticket_id_extraction');
    }

    const confidence = rulesUsed.length > 0 ? Math.min(0.9, 0.5 + (rulesUsed.length * 0.1)) : 0.3;

    return {
      data,
      confidence,
      rulesUsed,
      metadata: {
        extractionMethod: 'pattern_matching',
        textLength: text.length,
      },
    };
  }
}
