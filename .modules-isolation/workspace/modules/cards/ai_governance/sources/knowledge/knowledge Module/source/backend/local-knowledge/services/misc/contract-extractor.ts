// ============================================
// Shahin-Ai — Contract Extractor
// R3.3B Phase C: Deterministic extraction for contracts
// ============================================

import { BaseExtractor, ExtractionResult } from './base-extractor';
import { safeQuery } from "@dos/db";

export class ContractExtractor extends BaseExtractor {
  async extract(content: Buffer | string, _contentType: string): Promise<ExtractionResult> {
    const text = this.parseText(content);
    const rulesUsed: string[] = [];
    const data: Record<string, unknown> = {
      documentType: 'contract',
      contractTitle: null,
      contractNumber: null,
      parties: [],
      effectiveDate: null,
      expiryDate: null,
      value: null,
      currency: null,
      rawText: text.substring(0, 10000),
    };

    // Rule 1: Extract contract title
    const titleMatch = text.match(/^(?:Contract|Agreement|Title)[:\s]+(.+)$/im) ||
                      text.match(/^(.{1,200})$/m);
    if (titleMatch) {
      data.contractTitle = titleMatch[1]?.trim() || null;
      rulesUsed.push('title_pattern');
    }

    // Rule 2: Extract contract number
    const contractNumMatch = text.match(/(?:Contract\s*(?:Number|No|#)?[:\s]*)?([A-Z]{2,6}[-/]?\d{4}[-/]?\d{2,4})/i);
    if (contractNumMatch) {
      data.contractNumber = contractNumMatch[1];
      rulesUsed.push('contract_number_pattern');
    }

    // Rule 3: Extract parties (Between, Parties, etc.)
    const partiesMatch = text.match(/(?:Between|Parties|Party)[:\s]+([^\n]+(?:\n[^\n]+){0,5})/i);
    if (partiesMatch) {
      const partyLines = partiesMatch[1].split('\n').filter(l => l.trim().length > 0);
      data.parties = partyLines.slice(0, 10).map(l => l.trim());
      rulesUsed.push('parties_extraction');
    }

    // Rule 4: Extract dates
    const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g;
    const dates = text.match(datePattern) || [];
    if (dates.length > 0) {
      data.effectiveDate = dates[0];
      if (dates.length > 1) {
        data.expiryDate = dates[1];
      }
      rulesUsed.push('date_extraction');
    }

    // Rule 5: Extract value and currency
    const valueMatch = text.match(/(?:Value|Amount|Total)[:\s]+([\d,]+\.?\d*)\s*([A-Z]{3})?/i);
    if (valueMatch) {
      data.value = valueMatch[1];
      data.currency = valueMatch[2] || 'USD';
      rulesUsed.push('value_extraction');
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
