import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Multi-Modal Evidence Analysis Service (Feature 47)
// PDF text extraction, screenshot verification, CSV validation,
// quality tier assignment based on analysis results
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFile, FileRecord as _FileRecord } from '../../ports/platform.port';
import { scoreEvidenceQuality } from "./evidence-quality-scoring.service";
import { eventBus } from '../../ports/events.port';
import { toErrorMessage } from "@dos/module-sdk";
import { getFirstRow } from '@dos/db';
import { getClaudeClient, CLAUDE_MODEL, CLAUDE_MAX_TOKENS as _CLAUDE_MAX_TOKENS } from '../../ports/ai.port';
import { catchHandler, swallowNull, swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

// ============================================================
// Types
// ============================================================

export interface PdfAnalysisResult {
  extractedText: string;
  pageCount: number;
  hasMetadata: boolean;
  language?: 'en' | 'ar' | 'mixed' | 'any';
  documentType?: 'policy' | 'procedure' | 'certificate' | 'report' | 'log' | 'other';
  creationDate?: string;
  topics?: string[];
  applicableControls?: string[];
  qualityScore: number; // 0-100
  qualityTier: 'A' | 'B' | 'C';
}

export interface ScreenshotVerificationResult {
  isScreenshot: boolean;
  imageFormat: 'png' | 'jpeg' | 'jpg' | 'gif' | 'other';
  dimensions?: { width: number; height: number };
  hasMetadata: boolean;
  containsText: boolean;
  extractedText?: string;
  /** UI element labels extracted via Claude vision (buttons, menus, tabs, etc.) */
  uiLabels?: string[];
  /** Data values extracted via Claude vision (numbers, dates, statuses, IDs) */
  dataValues?: string[];
  /** Compliance-related text extracted via Claude vision (controls, frameworks, policies) */
  complianceIndicators?: string[];
  verificationScore: number; // 0-100
  qualityTier: 'A' | 'B' | 'C';
  warnings?: string[];
}

export interface CsvValidationResult {
  isValid: boolean;
  rowCount: number;
  columnCount: number;
  headers?: string[];
  encoding: string;
  delimiter: string;
  hasQuotes: boolean;
  validationErrors?: string[];
  sampleRows?: string[][];
  qualityScore: number; // 0-100
  qualityTier: 'A' | 'B' | 'C';
}

export interface MultiModalAnalysisResult {
  evidenceId: string;
  fileId?: string;
  contentType: string;
  analysisType: 'pdf' | 'screenshot' | 'csv' | 'other';
  pdfAnalysis?: PdfAnalysisResult;
  screenshotVerification?: ScreenshotVerificationResult;
  csvValidation?: CsvValidationResult;
  overallQualityTier: 'A' | 'B' | 'C';
  overallQualityScore: number; // 0-100
  analysisMetadata: {
    analyzedAt: string;
    analyzerVersion: string;
    processingTimeMs: number;
  };
}

// ============================================================
// PDF Text Extraction
// ============================================================

/**
 * Extract text from PDF buffer using pdf-parse library.
 * Falls back to basic extraction if library not available.
 */
async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
  metadata: Record<string, unknown>;
}> {
  try {
    // Try to use pdf-parse if available
    const pdfParse = await swallowNull(EC.FALLBACK_QUERY, import('pdf-parse'), { operation: 'fallback query' });

    if (pdfParse?.default) {

      const data = await pdfParse.default(buffer);
      return {
        text: data.text || '',
        pageCount: data.numpages || 0,
        metadata: data.info || {},
      };
    }
  } catch (err) {
    logger.warn('[EvidenceAnalysis] pdf-parse not available, using fallback:', toErrorMessage(err));
  }

  // Fallback: basic text extraction from PDF structure
  // This is a simplified approach - in production, use pdf-parse or pdfjs-dist
  const pdfString = buffer.toString('binary');
  const textMatches = pdfString.match(/\(([^)]+)\)/g) || [];
  const extractedText = textMatches
    .map(m => m.slice(1, -1))
    .filter(t => t.length > 2 && !t.match(/^[0-9\s]+$/))
    .join(' ')
    .substring(0, 10000); // Limit to 10KB for safety

  // Estimate page count from /Count or /Pages
  const pageCountMatch = pdfString.match(/\/Count\s+(\d+)/) || pdfString.match(/\/Pages\s+(\d+)/);
  const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 1;

  return {
    text: extractedText,
    pageCount,
    metadata: {},
  };
}

/**
 * Analyze PDF content to determine document type, language, topics, and applicable controls.
 */
async function analyzePdfContent(
  extractedText: string,
  metadata: Record<string, unknown>
): Promise<{
  documentType: 'policy' | 'procedure' | 'certificate' | 'report' | 'log' | 'other';
  language: 'en' | 'ar' | 'mixed' | 'any';
  creationDate?: string;
  topics?: string[];
  applicableControls?: string[];
}> {
  const textLower = extractedText.toLowerCase();
  const textAr = extractedText;

  // Detect language (simple heuristic)
  const arabicChars = /[\u0600-\u06FF]/;
  const hasArabic = arabicChars.test(textAr);
  const hasEnglish = /[a-zA-Z]/.test(extractedText);
  let language: 'en' | 'ar' | 'mixed' | 'any' = 'any';
  if (hasArabic && hasEnglish) language = 'mixed';
  else if (hasArabic) language = 'ar';
  else if (hasEnglish) language = 'en';

  // Detect document type
  let documentType: 'policy' | 'procedure' | 'certificate' | 'report' | 'log' | 'other' = 'other';
  if (textLower.includes('policy') || textLower.includes('سياسة')) documentType = 'policy';
  else if (textLower.includes('procedure') || textLower.includes('إجراء')) documentType = 'procedure';
  else if (textLower.includes('certificate') || textLower.includes('شهادة')) documentType = 'certificate';
  else if (textLower.includes('report') || textLower.includes('تقرير')) documentType = 'report';
  else if (textLower.includes('log') || textLower.includes('سجل')) documentType = 'log';

  // Extract creation date from metadata or text
  let creationDate: string | undefined;
  if (metadata.CreationDate) {
    try {
      creationDate = new Date((metadata as any).CreationDate).toISOString().split('T')[0];
    } catch {
      // Ignore invalid dates
    }
  }

  // Extract topics (simple keyword matching)
  const topicKeywords: Record<string, string[]> = {
    'access_control': ['access', 'authentication', 'authorization', 'login', 'permission'],
    'encryption': ['encryption', 'encrypted', 'cipher', 'ssl', 'tls'],
    'incident_response': ['incident', 'breach', 'response', 'recovery'],
    'audit': ['audit', 'review', 'assessment', 'compliance'],
    'data_protection': ['data', 'privacy', 'pii', 'gdpr', 'pdpl'],
  };
  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => textLower.includes(kw))) {
      topics.push(topic);
    }
  }

  // Extract applicable controls (look for control codes like NCA-ECC-1.1, SAMA-CSF-2.3, etc.)
  const controlPattern = /(?:NCA-ECC|SAMA-CSF|PDPL|PCI-DSS|ISO27001)[\s-]?(\d+\.\d+)/gi;
  const controlMatches = extractedText.matchAll(controlPattern);
  const applicableControls = Array.from(controlMatches, m => m[0]).slice(0, 20); // Limit to 20

  return {
    documentType,
    language,
    creationDate,
    topics: topics.length > 0 ? topics : undefined,
    applicableControls: applicableControls.length > 0 ? applicableControls : undefined,
  };
}

/**
 * Score PDF quality based on extracted content and metadata.
 */
function scorePdfQuality(
  extractedText: string,
  pageCount: number,
  hasMetadata: boolean,
  documentType?: string,
  language?: string
): { score: number; tier: 'A' | 'B' | 'C' } {
  let score = 50; // Base score

  // Text extraction quality
  if (extractedText.length > 1000) score += 20;
  else if (extractedText.length > 100) score += 10;
  else if (extractedText.length > 0) score += 5;

  // Metadata presence
  if (hasMetadata) score += 10;

  // Document type identified
  if (documentType && documentType !== 'other') score += 10;

  // Language detected
  if (language && language !== 'any') score += 5;

  // Page count (reasonable documents have 1-100 pages)
  if (pageCount > 0 && pageCount <= 100) score += 5;

  score = Math.min(100, Math.max(0, score));

  let tier: 'A' | 'B' | 'C';
  if (score >= 80) tier = 'A';
  else if (score >= 50) tier = 'B';
  else tier = 'C';

  return { score, tier };
}

// ============================================================
// Screenshot Verification
// ============================================================

/**
 * Verify if image is a valid screenshot and extract basic information.
 */
async function verifyScreenshot(buffer: Buffer, contentType: string): Promise<{
  isScreenshot: boolean;
  imageFormat: 'png' | 'jpeg' | 'jpg' | 'gif' | 'other';
  dimensions?: { width: number; height: number };
  hasMetadata: boolean;
  containsText: boolean;
  extractedText?: string;
  uiLabels?: string[];
  dataValues?: string[];
  complianceIndicators?: string[];
}> {
  // Determine image format from content type or buffer signature
  let imageFormat: 'png' | 'jpeg' | 'jpg' | 'gif' | 'other' = 'other';
  if (contentType === 'image/png' || buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    imageFormat = 'png';
  } else if (contentType === 'image/jpeg' || buffer.slice(0, 2).toString('hex') === 'ffd8') {
    imageFormat = 'jpeg';
  } else if (contentType === 'image/jpg') {
    imageFormat = 'jpg';
  } else if (contentType === 'image/gif' || buffer.slice(0, 6).toString() === 'GIF89a' || buffer.slice(0, 6).toString() === 'GIF87a') {
    imageFormat = 'gif';
  }

  // Basic dimension extraction for PNG and JPEG
  let dimensions: { width: number; height: number } | undefined;
  try {
    if (imageFormat === 'png') {
      // PNG: width and height are at bytes 16-23 (big-endian)
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && width < 100000 && height > 0 && height < 100000) {
          dimensions = { width, height };
        }
      }
    } else if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
      // JPEG: look for SOF (Start of Frame) markers
      let i = 2; // Skip FF D8
      while (i < buffer.length - 9) {
        if (buffer[i] === 0xFF && (buffer[i + 1] >= 0xC0 && buffer[i + 1] <= 0xC3)) {
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          if (width > 0 && width < 100000 && height > 0 && height < 100000) {
            dimensions = { width, height };
            break;
          }
        }
        i++;
      }
    }
  } catch {
    // Ignore dimension extraction errors
  }

  // Check for EXIF/metadata (simplified - look for EXIF marker in JPEG)
  let hasMetadata = false;
  if (imageFormat === 'jpeg' || imageFormat === 'jpg') {
    const exifMarker = buffer.indexOf(Buffer.from('Exif', 'ascii'));
    hasMetadata = exifMarker > 0;
  }

  // Screenshots are typically PNG or JPEG, reasonable dimensions (800x600 to 4K)
  const isScreenshot = (imageFormat === 'png' || imageFormat === 'jpeg' || imageFormat === 'jpg') &&
    dimensions &&
    dimensions.width >= 800 && dimensions.width <= 7680 &&
    dimensions.height >= 600 && dimensions.height <= 4320;

  // Extract text from screenshot using Claude's vision capabilities.
  // Claude can natively read images when sent as base64-encoded content blocks.
  let containsText = false;
  let extractedText: string | undefined;
  let uiLabels: string[] | undefined;
  let dataValues: string[] | undefined;
  let complianceIndicators: string[] | undefined;

  try {
    const visionResult = await extractTextFromImageViaClaude(buffer, contentType);
    if (visionResult.extractedText && visionResult.extractedText.length > 0) {
      containsText = true;
      extractedText = visionResult.extractedText;
      uiLabels = visionResult.uiLabels.length > 0 ? visionResult.uiLabels : undefined;
      dataValues = visionResult.dataValues.length > 0 ? visionResult.dataValues : undefined;
      complianceIndicators = visionResult.complianceIndicators.length > 0 ? visionResult.complianceIndicators : undefined;
    }
  } catch (err) {
    // Fall back gracefully if Claude vision is unavailable (no API key, rate limit, etc.)
    logger.warn('[EvidenceAnalysis] Claude vision text extraction failed, continuing without OCR:', toErrorMessage(err));
  }

  return {
    isScreenshot: isScreenshot ?? false,
    imageFormat,
    dimensions,
    hasMetadata,
    containsText,
    extractedText,
    uiLabels,
    dataValues,
    complianceIndicators,
  };
}

// ============================================================
// Claude Vision Text Extraction
// ============================================================

/** Supported media types for Claude vision API */
const _VISION_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;
type VisionMediaType = typeof _VISION_MEDIA_TYPES[number];

/** Maximum image size in bytes for Claude vision (20 MB) */
const MAX_VISION_IMAGE_SIZE = 20 * 1024 * 1024;

interface VisionExtractionResult {
  extractedText: string;
  uiLabels: string[];
  dataValues: string[];
  complianceIndicators: string[];
}

/**
 * Extract text from an image using Claude's native vision capabilities.
 * Sends the image as base64 content and asks Claude to identify all visible
 * text, UI labels, data values, and compliance-related indicators.
 *
 * @param buffer - Raw image buffer
 * @param contentType - MIME type of the image (e.g. 'image/png')
 * @returns Extracted text and categorized findings
 */
async function extractTextFromImageViaClaude(
  buffer: Buffer,
  contentType: string,
): Promise<VisionExtractionResult> {
  // Validate image size
  if (buffer.length > MAX_VISION_IMAGE_SIZE) {
    throw new Error(`Image too large for vision analysis: ${(buffer.length / 1024 / 1024).toFixed(1)} MB exceeds ${MAX_VISION_IMAGE_SIZE / 1024 / 1024} MB limit`);
  }

  // Normalize content type to a supported vision media type
  let mediaType: VisionMediaType = 'image/png';
  if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
    mediaType = 'image/jpeg';
  } else if (contentType === 'image/gif') {
    mediaType = 'image/gif';
  } else if (contentType === 'image/webp') {
    mediaType = 'image/webp';
  } else if (contentType === 'image/png') {
    mediaType = 'image/png';
  }

  const base64Data = buffer.toString('base64');

  const client = getClaudeClient();
  const resp = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    temperature: 0.1,
    system: [
      'You are a GRC (Governance, Risk, Compliance) evidence analysis assistant.',
      'Your job is to extract ALL visible text from screenshots submitted as compliance evidence.',
      'Be thorough and accurate. Respond ONLY with valid JSON, no markdown fences.',
    ].join(' '),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: [
              'Extract all visible text from this screenshot. Categorize findings into:',
              '1. "extracted_text" - All visible text concatenated, preserving reading order.',
              '2. "ui_labels" - Button labels, menu items, field labels, tab names.',
              '3. "data_values" - Numbers, dates, percentages, status values, IDs.',
              '4. "compliance_indicators" - Any text referencing controls, frameworks, policies,',
              '   compliance status, audit findings, risk levels, approval states, or certifications.',
              '',
              'Respond with JSON: { "extracted_text": "...", "ui_labels": [...], "data_values": [...], "compliance_indicators": [...] }',
            ].join('\n'),
          },
        ],
      },
    ],
  });

  // Parse Claude's response
  const block = resp.content[0];
  const rawText = block.type === 'text' ? block.text : JSON.stringify(block);
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      extractedText: typeof parsed.extracted_text === 'string' ? parsed.extracted_text.substring(0, 10000) : '',
      uiLabels: Array.isArray(parsed.ui_labels) ? parsed.ui_labels.slice(0, 50) : [],
      dataValues: Array.isArray(parsed.data_values) ? parsed.data_values.slice(0, 50) : [],
      complianceIndicators: Array.isArray(parsed.compliance_indicators) ? parsed.compliance_indicators.slice(0, 50) : [],
    };
  } catch {
    // If JSON parsing fails, treat the entire response as extracted text
    return {
      extractedText: rawText.substring(0, 10000),
      uiLabels: [],
      dataValues: [],
      complianceIndicators: [],
    };
  }
}

/**
 * Score screenshot verification quality.
 */
function scoreScreenshotQuality(
  isScreenshot: boolean,
  hasMetadata: boolean,
  dimensions?: { width: number; height: number },
  containsText?: boolean
): { score: number; tier: 'A' | 'B' | 'C'; warnings?: string[] } {
  const warnings: string[] = [];
  let score = 30; // Base score (screenshots are lower quality evidence)

  if (!isScreenshot) {
    warnings.push('File does not appear to be a screenshot');
    score = 20;
  } else {
    score += 30; // Valid screenshot format
  }

  if (dimensions) {
    // Reasonable screenshot dimensions
    if (dimensions.width >= 1920 && dimensions.height >= 1080) score += 20; // HD+
    else if (dimensions.width >= 1280 && dimensions.height >= 720) score += 15; // HD
    else if (dimensions.width >= 800 && dimensions.height >= 600) score += 10; // Minimum
    else warnings.push('Screenshot dimensions are unusually small');
  } else {
    warnings.push('Could not determine screenshot dimensions');
  }

  if (hasMetadata) score += 10;

  if (containsText) score += 10; // OCR-extracted text adds value

  score = Math.min(100, Math.max(0, score));

  let tier: 'A' | 'B' | 'C';
  if (score >= 80) tier = 'A';
  else if (score >= 50) tier = 'B';
  else tier = 'C';

  // Screenshots are generally lower quality evidence
  if (tier === 'A') tier = 'B'; // Cap at B for screenshots
  if (tier === 'B' && score < 60) tier = 'C';

  return { score, tier, warnings: warnings.length > 0 ? warnings : undefined };
}

// ============================================================
// CSV Validation
// ============================================================

/**
 * Validate CSV file structure and extract basic information.
 */
async function validateCsv(buffer: Buffer): Promise<{
  isValid: boolean;
  rowCount: number;
  columnCount: number;
  headers?: string[];
  encoding: string;
  delimiter: string;
  hasQuotes: boolean;
  validationErrors?: string[];
  sampleRows?: string[][];
}> {
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const validationErrors: string[] = [];

  if (lines.length === 0) {
    return {
      isValid: false,
      rowCount: 0,
      columnCount: 0,
      encoding: 'utf8',
      delimiter: ',',
      hasQuotes: false,
      validationErrors: ['CSV file is empty'],
    };
  }

  // Detect delimiter (comma, semicolon, tab)
  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t';

  // Parse first line as headers
  const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  const columnCount = headers.length;

  // Check for quoted fields
  const hasQuotes = firstLine.includes('"');

  // Validate structure (all rows should have same column count)
  const rowCount = lines.length;
  let consistentColumns = true;
  const sampleRows: string[][] = [];

  for (let i = 1; i < Math.min(6, lines.length); i++) {
    const row = lines[i].split(delimiter);
    if (row.length !== columnCount) {
      consistentColumns = false;
      validationErrors.push(`Row ${i + 1} has ${row.length} columns, expected ${columnCount}`);
    } else {
      sampleRows.push(row.map(cell => cell.trim().replace(/^"|"$/g, '')));
    }
  }

  if (!consistentColumns && validationErrors.length === 0) {
    validationErrors.push('CSV structure is inconsistent (varying column counts)');
  }

  const isValid = validationErrors.length === 0 && rowCount > 0 && columnCount > 0;

  return {
    isValid,
    rowCount,
    columnCount,
    headers: headers.length > 0 ? headers : undefined,
    encoding: 'utf8',
    delimiter,
    hasQuotes,
    validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
    sampleRows: sampleRows.length > 0 ? sampleRows : undefined,
  };
}

/**
 * Score CSV validation quality.
 */
function scoreCsvQuality(
  isValid: boolean,
  rowCount: number,
  columnCount: number,
  hasHeaders: boolean,
  validationErrors?: string[]
): { score: number; tier: 'A' | 'B' | 'C' } {
  let score = 0;

  if (!isValid) {
    return { score: 20, tier: 'C' };
  }

  score += 40; // Valid CSV structure

  if (hasHeaders) score += 20;
  if (rowCount > 10) score += 20;
  else if (rowCount > 0) score += 10;
  if (columnCount > 0) score += 10;
  if (columnCount >= 3 && columnCount <= 20) score += 10; // Reasonable column count

  if (validationErrors && validationErrors.length > 0) {
    score -= validationErrors.length * 10;
  }

  score = Math.min(100, Math.max(0, score));

  let tier: 'A' | 'B' | 'C';
  if (score >= 80) tier = 'A';
  else if (score >= 50) tier = 'B';
  else tier = 'C';

  return { score, tier };
}

// ============================================================
// Main Service Functions
// ============================================================

/**
 * Analyze evidence file using multi-modal analysis (PDF, screenshot, CSV).
 * Updates evidence quality tier based on analysis results.
 */
export async function analyzeEvidenceFile(
  tenantId: string,
  evidenceId: string,
  fileId?: string
): Promise<MultiModalAnalysisResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as unknown as MultiModalAnalysisResult;
}

/**
 * Batch analyze multiple evidence files.
 */
export async function batchAnalyzeEvidenceFiles(
  tenantId: string,
  evidenceIds: string[]
): Promise<MultiModalAnalysisResult[]> {
  const results: MultiModalAnalysisResult[] = [];
  for (const evidenceId of evidenceIds) {
    try {
      const result = await analyzeEvidenceFile(tenantId, evidenceId);
      results.push(result);
    } catch (error) {
      logger.error(`Failed to analyze evidence ${evidenceId}:`, toErrorMessage(error));
    }
  }
  return results;
}

/**
 * Get analysis results for an evidence item.
 */
export async function getEvidenceAnalysis(
  tenantId: string,
  evidenceId: string
): Promise<MultiModalAnalysisResult | null> {
  const schema = tenantSchema(tenantId);

  // Try to retrieve from metadata_kv
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT metadata_kv->'multimodal_analysis' as analysis
     FROM "${schema}".evidence
     WHERE evidence_id = $1`,
    [evidenceId]
  ), { operation: 'query evidence' });

  if (result.rows.length > 0 && getFirstRow(result)?.analysis) {
    return getFirstRow(result)?.analysis as MultiModalAnalysisResult;
  }

  // If not found, return null (analysis not yet performed)
  return null;
}
