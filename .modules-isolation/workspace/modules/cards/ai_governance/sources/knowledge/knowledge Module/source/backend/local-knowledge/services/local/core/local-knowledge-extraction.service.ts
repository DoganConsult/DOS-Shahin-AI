// ============================================
// Shahin-Ai — Local Knowledge Extraction Service (Module Layer)
// R3.3B: Content extraction from documents based on MIME type,
// AI-powered entity extraction, and key phrase analysis
// for the GRC domain.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { claudeJSON, claudeComplete, CLAUDE_MODEL as _CLAUDE_MODEL } from '../../../ports/ai.port';
import { logger } from '../../../ports/logger.port';
import { getDocument } from './local-knowledge-documents.service';
async function getIngestion(tenantId: string, ingestionId: string): Promise<Record<string, unknown> | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".local_knowledge_ingestions WHERE id = $1`,
    [ingestionId],
  );
  return rows[0] || null;
}

const LOG_TAG = '[LocalKnowledgeExtraction:Module]';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface ContentExtractionResult {
  documentId: string;
  extractedText: string;
  mimeType: string;
  parserUsed: string;
  metadata: {
    charCount: number;
    wordCount: number;
    pageCount?: number;
    extractionTimeMs: number;
    truncated: boolean;
  };
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  position?: { start: number; end: number };
  context?: string;
}

export type EntityType =
  | 'regulatory_reference'
  | 'framework_code'
  | 'control_id'
  | 'organization'
  | 'department'
  | 'role'
  | 'person'
  | 'risk_type'
  | 'severity'
  | 'date'
  | 'deadline'
  | 'policy_reference'
  | 'compliance_term';

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  regulatoryReferences: ExtractedEntity[];
  organizationEntities: ExtractedEntity[];
  riskIndicators: ExtractedEntity[];
  complianceTerms: ExtractedEntity[];
  totalEntities: number;
  extractionTimeMs: number;
}

export interface KeyPhraseResult {
  phrases: Array<{
    phrase: string;
    relevance: number;
    domain: string;
  }>;
  topicSummary: string;
  grcRelevanceScore: number;
  extractionTimeMs: number;
}

/** Maximum text length sent to AI for extraction (characters) */
const AI_TEXT_LIMIT = 15_000;
/** Maximum text we attempt to extract from a single document */
const MAX_EXTRACTION_LENGTH = 500_000;

// ---------------------------------------------------------------
// Content extraction based on MIME type
// ---------------------------------------------------------------

/**
 * Extracts raw text content from a document based on its MIME type
 * and the stored content. Supports:
 * - PDF (via pdf-parse)
 * - DOCX (basic XML extraction)
 * - HTML (tag stripping with structure preservation)
 * - Plain text (passthrough)
 * - Fallback: Claude AI OCR/extraction from base64
 */
export async function extractContent(
  tenantId: string,
  documentId: string,
): Promise<ContentExtractionResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.local_knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ---------------------------------------------------------------
// Entity extraction using Claude AI
// ---------------------------------------------------------------

/**
 * Uses Claude AI to extract GRC-domain entities from document text:
 * - Regulatory references (framework codes, control IDs)
 * - Organization entities (departments, roles, people)
 * - Risk indicators (risk types, severity keywords)
 * - Compliance terms (policy references, dates, deadlines)
 */
export async function extractEntities(
  tenantId: string,
  text: string,
): Promise<ExtractedEntity[]> {
  if (!text || text.trim().length === 0) return [];

  const startTime = Date.now();
  const textPreview = text.substring(0, AI_TEXT_LIMIT);

  try {
    const result = await claudeJSON<{
      entities: Array<{
        type: string;
        value: string;
        confidence: number;
        context?: string;
      }>;
    }>({
      tenantId,
      agentId: 'local-knowledge-entity-extractor',
      decisionType: 'entity_extraction',
      systemPrompt: `You are a GRC entity extraction specialist. Extract entities from the document text.

For each entity, provide:
- "type": One of: regulatory_reference, framework_code, control_id, organization, department, role, person, risk_type, severity, date, deadline, policy_reference, compliance_term
- "value": The extracted entity value
- "confidence": 0.0 to 1.0 confidence score
- "context": Brief surrounding context (10-20 words)

Entity extraction guidelines for GRC domain:
- regulatory_reference: Laws, regulations, standards (e.g., "SAMA CSF", "NCA ECC", "ISO 27001", "PDPL Art. 10")
- framework_code: Framework identifiers (e.g., "ECC-2:7", "CSF-3.3", "ISO27001:A.8")
- control_id: Control identifiers (e.g., "AC-1", "CM-6", "IA-2")
- organization: Company names, regulatory bodies (e.g., "SAMA", "NCA", "SDAIA")
- department: Organizational units (e.g., "IT Department", "Internal Audit", "Risk Management")
- role: Job roles (e.g., "CISO", "DPO", "Compliance Officer", "Board Member")
- person: Named individuals
- risk_type: Categories of risk (e.g., "cyber risk", "operational risk", "compliance risk")
- severity: Risk/finding severity (e.g., "critical", "high", "medium", "low")
- date: Specific dates found in text
- deadline: Due dates, review dates, compliance deadlines
- policy_reference: Internal policy references (e.g., "POL-2024-001")
- compliance_term: Compliance-specific terminology

Return JSON: { "entities": [...] }`,
      userMessage: textPreview,
      maxTokens: 4096,
      temperature: 0.1,
    });

    const entities: ExtractedEntity[] = (result.entities || []).map((e: any) => ({
      type: validateEntityType(e.type),
      value: e.value,
      confidence: Math.min(1, Math.max(0, e.confidence || 0.5)),
      context: e.context,
    }));

    logger.info(`${LOG_TAG} Entities extracted`, {
      tenantId,
      entityCount: entities.length,
      extractionTimeMs: Date.now() - startTime,
    });

    return entities;
  } catch (err) {
    logger.warn(`${LOG_TAG} AI entity extraction failed, falling back to regex`, {
      tenantId,
      error: (err as Error).message,
    });
    // Fallback to regex-based extraction
    return extractEntitiesRegex(text);
  }
}

// ---------------------------------------------------------------
// Key phrase extraction using Claude AI
// ---------------------------------------------------------------

/**
 * Uses Claude AI to extract key phrases relevant to the GRC domain.
 * Returns phrases with relevance scores, domain classification,
 * and an overall GRC relevance score.
 */
export async function extractKeyPhrases(
  tenantId: string,
  text: string,
): Promise<KeyPhraseResult> {
  const startTime = Date.now();

  if (!text || text.trim().length === 0) {
    return {
      phrases: [],
      topicSummary: '',
      grcRelevanceScore: 0,
      extractionTimeMs: 0,
    };
  }

  const textPreview = text.substring(0, AI_TEXT_LIMIT);

  try {
    const result = await claudeJSON<{
      phrases: Array<{
        phrase: string;
        relevance: number;
        domain: string;
      }>;
      topicSummary: string;
      grcRelevanceScore: number;
    }>({
      tenantId,
      agentId: 'local-knowledge-keyphrase-extractor',
      decisionType: 'keyphrase_extraction',
      systemPrompt: `You are a GRC key phrase extraction specialist. Extract the most important phrases from the document.

For each phrase:
- "phrase": The key phrase (2-5 words)
- "relevance": 0.0-1.0 relevance score for GRC context
- "domain": One of: governance, risk, compliance, audit, policy, security, privacy, regulatory, operational, general

Also provide:
- "topicSummary": One sentence describing the main GRC-relevant topic
- "grcRelevanceScore": 0.0-1.0 overall relevance to GRC

Return 10-20 key phrases sorted by relevance.

Return JSON: { "phrases": [...], "topicSummary": "...", "grcRelevanceScore": 0.0 }`,
      userMessage: textPreview,
      maxTokens: 2048,
      temperature: 0.1,
    });

    const keyPhraseResult: KeyPhraseResult = {
      phrases: (result.phrases || []).map((p: any) => ({
        phrase: p.phrase,
        relevance: Math.min(1, Math.max(0, p.relevance || 0.5)),
        domain: p.domain || 'general',
      })),
      topicSummary: result.topicSummary || '',
      grcRelevanceScore: Math.min(1, Math.max(0, result.grcRelevanceScore || 0)),
      extractionTimeMs: Date.now() - startTime,
    };

    logger.info(`${LOG_TAG} Key phrases extracted`, {
      tenantId,
      phraseCount: keyPhraseResult.phrases.length,
      grcRelevance: keyPhraseResult.grcRelevanceScore,
    });

    return keyPhraseResult;
  } catch (err) {
    logger.warn(`${LOG_TAG} AI key phrase extraction failed`, {
      tenantId,
      error: (err as Error).message,
    });
    return {
      phrases: [],
      topicSummary: '',
      grcRelevanceScore: 0,
      extractionTimeMs: Date.now() - startTime,
    };
  }
}

// ---------------------------------------------------------------
// Content parsers
// ---------------------------------------------------------------

/**
 * Extracts text from a PDF document using the pdf-parse library.
 * Falls back to raw string extraction if the library is not available.
 */
async function extractFromPDF(
  content: string | Buffer | null,
): Promise<{ text: string; parser: string }> {
  if (!content) return { text: '', parser: 'pdf-empty' };

  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');

  try {
    // Dynamic import of pdf-parse — available per package.json
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buf);
    return {
      text: data.text || '',
      parser: 'pdf-parse',
    };
  } catch (err) {
    logger.warn(`${LOG_TAG} pdf-parse failed, extracting raw text`, {
      error: (err as Error).message,
    });
    // Fallback: extract visible strings from PDF binary
    const rawStr = buf.toString('utf-8');
    const visibleText = rawStr
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim();
    return { text: visibleText, parser: 'pdf-raw-fallback' };
  }
}

/**
 * Extracts text from DOCX content by stripping XML tags.
 * Preserves paragraph structure.
 */
function extractFromDOCX(content: string): string {
  if (!content) return '';

  // DOCX is XML-based: strip tags and preserve paragraph breaks
  return content
    .replace(/<w:p[^>]*>/gi, '\n')  // paragraph breaks
    .replace(/<w:br[^>]*>/gi, '\n') // line breaks
    .replace(/<w:tab[^>]*>/gi, '\t') // tabs
    .replace(/<[^>]+>/g, '')        // strip all remaining XML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')     // normalize whitespace
    .trim();
}

/**
 * Extracts text from HTML by stripping tags while preserving structure.
 * Block-level elements are converted to line breaks.
 */
function extractFromHTML(content: string): string {
  if (!content) return '';

  return content
    // Preserve block-level element boundaries as line breaks
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article|header|footer)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    // Convert list items
    .replace(/<li[^>]*>/gi, '- ')
    // Strip all remaining HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Normalize whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts text from structured formats (JSON, CSV).
 * Converts structured data into a readable text representation.
 */
function extractFromStructured(content: string): string {
  if (!content) return '';

  // Try JSON first
  try {
    const parsed = JSON.parse(content);
    return flattenJSON(parsed, '', 0);
  } catch {
    // Not JSON — treat as CSV or plain text
  }

  // CSV: return as-is (already text)
  return content;
}

/**
 * Recursively flattens a JSON object into readable text.
 */
function flattenJSON(obj: any, prefix: string, depth: number): string {
  if (depth > 10) return `${prefix}: [nested object]`;
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return `${prefix ? prefix + ': ' : ''}${obj}`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return `${prefix ? prefix + ': ' : ''}${String(obj)}`;

  if (Array.isArray(obj)) {
    return obj
      .map((item, i) => flattenJSON(item, `${prefix}[${i}]`, depth + 1))
      .filter(Boolean)
      .join('\n');
  }

  if (typeof obj === 'object') {
    return Object.entries(obj)
      .map(([key, val]) => flattenJSON(val, prefix ? `${prefix}.${key}` : key, depth + 1))
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

/**
 * Falls back to Claude AI for content extraction when no parser is available.
 * Sends the content (possibly base64-encoded) to Claude for OCR/extraction.
 */
async function extractWithAI(
  tenantId: string,
  content: string,
  mimeType: string,
  title: string,
): Promise<string> {
  const contentPreview = content.substring(0, 10_000);

  try {
    const extracted = await claudeComplete({
      tenantId,
      agentId: 'local-knowledge-ai-extractor',
      decisionType: 'content_extraction',
      systemPrompt: `You are a document text extractor. The user will provide content from a document that could not be parsed by standard parsers.
Extract all readable text content from the document. Preserve the document structure as much as possible.
If the content appears to be base64-encoded, decode and extract the text.
If the content is garbled or unreadable, extract whatever meaningful text you can identify.
Return ONLY the extracted text, no commentary.`,
      userMessage: `Document title: ${title}
MIME type: ${mimeType}
Content (first 10000 chars):
${contentPreview}`,
      maxTokens: 4096,
      temperature: 0.1,
    });

    return extracted || '';
  } catch (err) {
    logger.warn(`${LOG_TAG} AI content extraction failed`, {
      tenantId,
      mimeType,
      error: (err as Error).message,
    });
    return contentPreview;
  }
}

/**
 * Reads file content from the local storage path.
 */
async function readStoredContent(storagePath: string): Promise<Buffer | null> {
  try {
    const fs = await import('fs/promises');
    return await fs.readFile(storagePath);
  } catch (err) {
    logger.warn(`${LOG_TAG} Failed to read stored content`, {
      storagePath,
      error: (err as Error).message,
    });
    return null;
  }
}

// ---------------------------------------------------------------
// Regex-based fallback entity extraction
// ---------------------------------------------------------------

/**
 * Regex-based entity extraction used as a fallback when AI extraction
 * is unavailable or fails. Covers common GRC patterns.
 */
function extractEntitiesRegex(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  // Regulatory references: ISO, SAMA, NCA, PDPL, etc.
  const regRefPatterns = [
    /\b(ISO\s*\d{4,5}(?:[-:]\d{1,4})?(?:\s*:\s*\d{4})?)\b/gi,
    /\b(SAMA\s+CSF\s*[\d.-]+)\b/gi,
    /\b(NCA\s+ECC\s*[\d.-]+)\b/gi,
    /\b(PDPL\s+Art(?:icle)?\.?\s*\d+)\b/gi,
    /\b(NDMO\s+[\w.-]+)\b/gi,
    /\b(EU\s+AI\s+Act\s+Art(?:icle)?\.?\s*\d+)\b/gi,
    /\b(NIST\s+(?:SP\s*)?[\d.-]+)\b/gi,
    /\b(PCI\s+DSS\s*[\d.]+)\b/gi,
    /\b(SOC\s+[12]\s+Type\s+[12I]+)\b/gi,
  ];

  for (const pattern of regRefPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'regulatory_reference',
        value: match[1].trim(),
        confidence: 0.8,
        position: { start: match.index, end: match.index + match[0].length },
      });
    }
  }

  // Control IDs: AC-1, CM-6, IA-2, ECC-2:7, etc.
  const controlPattern = /\b([A-Z]{2,6}[-:](?:\d+[.-]?)+)\b/g;
  let ctrlMatch;
  while ((ctrlMatch = controlPattern.exec(text)) !== null) {
    entities.push({
      type: 'control_id',
      value: ctrlMatch[1],
      confidence: 0.6,
      position: { start: ctrlMatch.index, end: ctrlMatch.index + ctrlMatch[0].length },
    });
  }

  // Policy references: POL-YYYY-XXX or similar
  const policyPattern = /\b(POL[-/]\d{4}[-/]\d{2,4})\b/gi;
  let polMatch;
  while ((polMatch = policyPattern.exec(text)) !== null) {
    entities.push({
      type: 'policy_reference',
      value: polMatch[1],
      confidence: 0.85,
      position: { start: polMatch.index, end: polMatch.index + polMatch[0].length },
    });
  }

  // Dates: various formats
  const datePattern = /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g;
  let dateMatch;
  while ((dateMatch = datePattern.exec(text)) !== null) {
    entities.push({
      type: 'date',
      value: dateMatch[1],
      confidence: 0.7,
      position: { start: dateMatch.index, end: dateMatch.index + dateMatch[0].length },
    });
  }

  // Severity keywords
  const severityPattern = /\b(critical|high|medium|low|informational)\b/gi;
  let sevMatch;
  while ((sevMatch = severityPattern.exec(text)) !== null) {
    entities.push({
      type: 'severity',
      value: sevMatch[1].toLowerCase(),
      confidence: 0.6,
      position: { start: sevMatch.index, end: sevMatch.index + sevMatch[0].length },
    });
  }

  // Risk types
  const riskPatterns = /\b(cyber\s+risk|operational\s+risk|compliance\s+risk|financial\s+risk|reputational\s+risk|strategic\s+risk|regulatory\s+risk|data\s+(?:breach|leakage|loss))\b/gi;
  let riskMatch;
  while ((riskMatch = riskPatterns.exec(text)) !== null) {
    entities.push({
      type: 'risk_type',
      value: riskMatch[1].toLowerCase(),
      confidence: 0.75,
      position: { start: riskMatch.index, end: riskMatch.index + riskMatch[0].length },
    });
  }

  // Deduplicate entities by value
  const seen = new Set<string>();
  return entities.filter((e: any) => {
    const key = `${e.type}:${e.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Validates that an entity type string is one of the known types.
 * Returns the validated type or falls back to 'compliance_term'.
 */
function validateEntityType(type: string): EntityType {
  const validTypes: EntityType[] = [
    'regulatory_reference',
    'framework_code',
    'control_id',
    'organization',
    'department',
    'role',
    'person',
    'risk_type',
    'severity',
    'date',
    'deadline',
    'policy_reference',
    'compliance_term',
  ];
  return validTypes.includes(type as EntityType) ? (type as EntityType) : 'compliance_term';
}
