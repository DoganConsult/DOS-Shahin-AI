import { safeQuery } from "@dos/db";

// ============================================
// Shahin-Ai — Base Extractor
// R3.3B Phase C: Base class for deterministic extractors
// ============================================

export interface ExtractionResult {
  data: Record<string, unknown>;
  confidence: number;
  rulesUsed: string[];
  metadata?: Record<string, unknown>;
}

export abstract class BaseExtractor {
  abstract extract(content: Buffer | string, contentType: string): Promise<ExtractionResult>;

  protected parseText(content: Buffer | string): string {
    if (Buffer.isBuffer(content)) {
      return content.toString('utf-8');
    }
    return content;
  }

  protected parseJSON(content: Buffer | string): unknown {
    const text = this.parseText(content);
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  protected extractMetadata(content: Buffer | string, contentType: string): Record<string, unknown> {
    const text = this.parseText(content);
    return {
      contentType,
      size: Buffer.isBuffer(content) ? content.length : text.length,
      hasContent: text.trim().length > 0,
    };
  }
}
