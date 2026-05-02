// ============================================
// Shahin-Ai — Committee Minutes Extractor
// R3.3B Phase C: Deterministic extraction for committee minutes
// ============================================

import { BaseExtractor, ExtractionResult } from './base-extractor';
import { safeQuery } from "@dos/db";

export class CommitteeMinutesExtractor extends BaseExtractor {
  async extract(content: Buffer | string, _contentType: string): Promise<ExtractionResult> {
    const text = this.parseText(content);
    const rulesUsed: string[] = [];
    const data: Record<string, unknown> = {
      documentType: 'committee_minutes',
      committeeName: null,
      meetingDate: null,
      attendees: [],
      agendaItems: [],
      decisions: [],
      actionItems: [],
      rawText: text.substring(0, 10000),
    };

    // Rule 1: Extract committee name
    const committeeMatch = text.match(/(?:Committee|Board|Meeting of)[:\s]+([A-Z][^\n]{5,100})/i);
    if (committeeMatch) {
      data.committeeName = committeeMatch[1].trim();
      rulesUsed.push('committee_name_pattern');
    }

    // Rule 2: Extract meeting date
    const datePattern = /(?:Meeting Date|Date|Held on)[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      data.meetingDate = dateMatch[1];
      rulesUsed.push('meeting_date_pattern');
    }

    // Rule 3: Extract attendees (Attendees:, Present:, etc.)
    const attendeesSection = text.match(/(?:Attendees|Present|Members)[:\s]+([^\n]+(?:\n[^\n]+){0,20})/i);
    if (attendeesSection) {
      const attendeeLines = attendeesSection[1].split('\n').filter(l => l.trim().length > 0);
      data.attendees = attendeeLines.slice(0, 50).map(l => l.trim());
      rulesUsed.push('attendees_extraction');
    }

    // Rule 4: Extract agenda items
    const agendaMatches = text.match(/^(?:\d+\.?\s+)?(?:Agenda|Item)[:\s]+([^\n]{10,200})$/gim);
    if (agendaMatches) {
      data.agendaItems = agendaMatches.slice(0, 30).map(m => m.replace(/^(?:\d+\.?\s+)?(?:Agenda|Item)[:\s]+/i, '').trim());
      rulesUsed.push('agenda_extraction');
    }

    // Rule 5: Extract decisions (Decision:, Resolved:, etc.)
    const decisionMatches = text.match(/(?:Decision|Resolved|Approved|Agreed)[:\s]+([^\n]{10,300})/gi);
    if (decisionMatches) {
      data.decisions = decisionMatches.slice(0, 20).map(m => m.replace(/(?:Decision|Resolved|Approved|Agreed)[:\s]+/i, '').trim());
      rulesUsed.push('decision_extraction');
    }

    // Rule 6: Extract action items (Action:, TODO:, etc.)
    const actionMatches = text.match(/(?:Action|Action Item|TODO|Follow-up)[:\s]+([^\n]{10,200})/gi);
    if (actionMatches) {
      data.actionItems = actionMatches.slice(0, 30).map(m => m.replace(/(?:Action|Action Item|TODO|Follow-up)[:\s]+/i, '').trim());
      rulesUsed.push('action_item_extraction');
    }

    const confidence = rulesUsed.length > 0 ? Math.min(0.9, 0.4 + (rulesUsed.length * 0.1)) : 0.3;

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
