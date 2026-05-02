// ============================================
// Shahin-Ai — Policy Extractor
// R3.3B Phase C: Deterministic extraction for policy documents
// ============================================

import { BaseExtractor, ExtractionResult } from './base-extractor';
import { safeQuery } from "@dos/db";

export class PolicyExtractor extends BaseExtractor {
  async extract(content: Buffer | string, _contentType: string): Promise<ExtractionResult> {
    const text = this.parseText(content);
    const rulesUsed: string[] = [];
    const data: Record<string, unknown> = {
      documentType: 'policy',
      title: null,
      policyNumber: null,
      effectiveDate: null,
      reviewDate: null,
      owner: null,
      category: null,
      status: null,
      version: null,
      sections: [],
      rawText: text.substring(0, 10000), // first 10k chars
    };

    // Rule 1: Extract title (first line or "Title:" pattern)
    const titleMatch = text.match(/^(?:Title|Policy Title|Document Title)[:\s]+(.+)$/im) ||
                      text.match(/^(.{1,200})$/m);
    if (titleMatch) {
      data.title = titleMatch[1]?.trim() || null;
      rulesUsed.push('title_pattern');
    }

    // Rule 2: Extract policy number (POL-YYYY-XXX or similar)
    const policyNumMatch = text.match(/(?:Policy\s*(?:Number|No|#)?[:\s]*)?([A-Z]{2,6}[-/]?\d{4}[-/]?\d{2,4})/i);
    if (policyNumMatch) {
      data.policyNumber = policyNumMatch[1];
      rulesUsed.push('policy_number_pattern');
    }

    // Rule 3: Extract dates (effective, review)
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g;
    const dates = text.match(datePattern) || [];
    if (dates.length > 0) {
      data.effectiveDate = dates[0];
      if (dates.length > 1) {
        data.reviewDate = dates[1];
      }
      rulesUsed.push('date_extraction');
    }

    // Rule 4: Extract owner (Owner:, Responsible:, etc.)
    const ownerMatch = text.match(/(?:Owner|Responsible|Policy Owner)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (ownerMatch) {
      data.owner = ownerMatch[1];
      rulesUsed.push('owner_extraction');
    }

    // Rule 5: Extract category (Category:, Type:, etc.)
    const categoryMatch = text.match(/(?:Category|Type|Policy Type)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (categoryMatch) {
      data.category = categoryMatch[1];
      rulesUsed.push('category_extraction');
    }

    // Rule 6: Extract status (Draft, Approved, Active, etc.)
    const statusMatch = text.match(/(?:Status)[:\s]+(Draft|Approved|Active|Retired|Superseded)/i);
    if (statusMatch) {
      data.status = statusMatch[1];
      rulesUsed.push('status_extraction');
    }

    // Rule 7: Extract version (Version:, v., etc.)
    const versionMatch = text.match(/(?:Version|v\.|Ver\.)[:\s]+(\d+\.?\d*)/i);
    if (versionMatch) {
      data.version = versionMatch[1];
      rulesUsed.push('version_extraction');
    }

    // Rule 8: Extract sections (numbered or titled)
    const sectionMatches = text.match(/^(?:\d+\.?\s+)?([A-Z][^\n]{10,200})$/gm);
    if (sectionMatches) {
      data.sections = sectionMatches.slice(0, 20).map(s => s.trim());
      rulesUsed.push('section_extraction');
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
