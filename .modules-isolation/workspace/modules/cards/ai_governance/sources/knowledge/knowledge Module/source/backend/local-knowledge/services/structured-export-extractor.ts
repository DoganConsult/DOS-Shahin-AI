// ============================================
// Shahin-Ai — Structured Export Extractor
// R3.3B Phase C: Deterministic extraction for structured exports (JSON, CSV)
// ============================================

import { BaseExtractor, ExtractionResult } from './base-extractor';
import { safeQuery } from "@dos/db";

export class StructuredExportExtractor extends BaseExtractor {
  async extract(content: Buffer | string, contentType: string): Promise<ExtractionResult> {
    const rulesUsed: string[] = [];
    let data: Record<string, unknown> = {
      documentType: 'structured_export',
      records: [],
      recordCount: 0,
      fields: [],
    };

    // Rule 1: Try JSON parsing
    const jsonData = this.parseJSON(content);
    if (jsonData) {
      if (Array.isArray(jsonData)) {
        data.records = jsonData.slice(0, 1000); // limit to 1000 records
        data.recordCount = jsonData.length;
        data.fields = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
      } else {
        data.records = [jsonData];
        data.recordCount = 1;
        data.fields = Object.keys(jsonData);
      }
      rulesUsed.push('json_parsing');
    } else {
      // Rule 2: Try CSV parsing
      const text = this.parseText(content);
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const rows = lines.slice(1, 1001).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const record: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            record[h] = values[i] || null;
          });
          return record;
        });
        data.records = rows;
        data.recordCount = rows.length;
        data.fields = headers;
        rulesUsed.push('csv_parsing');
      }
    }

    const confidence = rulesUsed.length > 0 ? 0.95 : 0.3; // structured data is high confidence

    return {
      data,
      confidence,
      rulesUsed,
      metadata: {
        extractionMethod: 'structured_parsing',
        contentType,
      },
    };
  }
}
