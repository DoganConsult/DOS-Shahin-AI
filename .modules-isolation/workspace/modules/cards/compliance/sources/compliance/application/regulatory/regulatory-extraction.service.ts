import { logger } from '../../ports/logger.port';
// ============================================
// Shahin-Ai — Regulatory Clause & Obligation Extraction
// Functions 3-4: Extract clauses from parsed
// regulatory text using LLM classification with
// pattern-matching fallback. Maps obligation-type
// clauses to the Obligation model.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { createObligation, ObligationInput } from "../../../governance/services/misc/obligation.service";
import { getDocumentElements, ParsedElement } from '../../ports/platform.port';

// ============================================================================
// Types
// ============================================================================

export type ClauseType =
  | "obligation"
  | "prohibition"
  | "permission"
  | "exception"
  | "definition"
  | "scope"
  | "penalty"
  | "reporting"
  | "timeline";

export type ClauseSeverity = "mandatory" | "recommended" | "optional";

export interface RegulatoryClause {
  clauseId: string;
  documentId: string;
  /** Reference section number (e.g. "3.2.1") */
  clauseRef: string;
  /** Extracted clause text */
  text: string;
  /** Classified clause type */
  clauseType: ClauseType;
  /** Enforcement severity */
  severity: ClauseSeverity;
  /** Entities responsible for compliance */
  responsibleEntities: string[];
  /** Page number where clause appears */
  pageNumber: number | null;
  /** Sort order within the document */
  sortOrder: number;
  createdAt: string;
}

export interface ExtractionStatus {
  documentId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  totalElements: number;
  processedElements: number;
  clausesExtracted: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

// ============================================================================
// Keyword-Based Clause Classification (Pattern-Matching Fallback)
// ============================================================================

/**
 * Classify a text element into a clause type using keyword pattern matching.
 * This serves as the primary classifier when LLM (Claude SDK) is unavailable.
 *
 * The pattern-matching approach uses both English and Arabic regulatory keywords.
 */
function classifyClauseByKeywords(text: string): {
  clauseType: ClauseType;
  severity: ClauseSeverity;
  responsibleEntities: string[];
} {
  const lower = text.toLowerCase();

  // Check for prohibition first (more specific than obligation)
  if (
    /\bshall\s+not\b/.test(lower) ||
    /\bprohibited\b/.test(lower) ||
    /\bmust\s+not\b/.test(lower) ||
    /\bforbidden\b/.test(lower) ||
    /يُحظر/.test(text) ||
    /لا\s+يجوز/.test(text) ||
    /يمنع/.test(text)
  ) {
    return {
      clauseType: "prohibition",
      severity: "mandatory",
      responsibleEntities: extractEntities(text),
    };
  }

  // Obligation keywords
  if (
    /\bshall\b/.test(lower) ||
    /\bmust\b/.test(lower) ||
    /\brequired\s+to\b/.test(lower) ||
    /\bobligat(ed|ion)\b/.test(lower) ||
    /يجب/.test(text) ||
    /ينبغي/.test(text) ||
    /يلتزم/.test(text)
  ) {
    return {
      clauseType: "obligation",
      severity: "mandatory",
      responsibleEntities: extractEntities(text),
    };
  }

  // Permission keywords
  if (
    /\bmay\b/.test(lower) ||
    /\bpermitted\b/.test(lower) ||
    /\ballowed\b/.test(lower) ||
    /يجوز/.test(text) ||
    /يحق/.test(text)
  ) {
    return {
      clauseType: "permission",
      severity: "optional",
      responsibleEntities: extractEntities(text),
    };
  }

  // Exception keywords
  if (
    /\bexcept\b/.test(lower) ||
    /\bunless\b/.test(lower) ||
    /\bexempt(ed|ion)?\b/.test(lower) ||
    /\bexclud(ed|ing|es)\b/.test(lower) ||
    /باستثناء/.test(text) ||
    /ما\s+لم/.test(text)
  ) {
    return {
      clauseType: "exception",
      severity: "optional",
      responsibleEntities: extractEntities(text),
    };
  }

  // Penalty keywords
  if (
    /\bpenalt(y|ies)\b/.test(lower) ||
    /\bfine(s|d)?\b/.test(lower) ||
    /\bsanction(s|ed)?\b/.test(lower) ||
    /\bpunish(ment|ed)?\b/.test(lower) ||
    /عقوبة/.test(text) ||
    /غرامة/.test(text) ||
    /جزاء/.test(text)
  ) {
    return {
      clauseType: "penalty",
      severity: "mandatory",
      responsibleEntities: extractEntities(text),
    };
  }

  // Reporting keywords
  if (
    /\breport(ing|s)?\b/.test(lower) ||
    /\bsubmi(t|ssion)\b/.test(lower) ||
    /\bnotif(y|ication)\b/.test(lower) ||
    /\bdisclos(e|ure)\b/.test(lower) ||
    /إبلاغ/.test(text) ||
    /تقرير/.test(text) ||
    /إفصاح/.test(text)
  ) {
    return {
      clauseType: "reporting",
      severity: "mandatory",
      responsibleEntities: extractEntities(text),
    };
  }

  // Timeline keywords
  if (
    /\bwithin\s+\d+\s*(days?|months?|years?|hours?)\b/.test(lower) ||
    /\bdeadline\b/.test(lower) ||
    /\bby\s+(the\s+end\s+of|date)\b/.test(lower) ||
    /\bno\s+later\s+than\b/.test(lower) ||
    /خلال/.test(text) ||
    /مهلة/.test(text) ||
    /موعد/.test(text)
  ) {
    return {
      clauseType: "timeline",
      severity: "mandatory",
      responsibleEntities: extractEntities(text),
    };
  }

  // Definition keywords
  if (
    /\bdefin(ed|ition|es)\b/.test(lower) ||
    /\bmeans?\b/.test(lower) ||
    /\brefers?\s+to\b/.test(lower) ||
    /تعريف/.test(text) ||
    /يُقصد\s+ب/.test(text)
  ) {
    return {
      clauseType: "definition",
      severity: "optional",
      responsibleEntities: [],
    };
  }

  // Scope keywords
  if (
    /\bscope\b/.test(lower) ||
    /\bappl(y|ies|icable)\b/.test(lower) ||
    /\bcovers?\b/.test(lower) ||
    /نطاق/.test(text) ||
    /يسري/.test(text)
  ) {
    return {
      clauseType: "scope",
      severity: "optional",
      responsibleEntities: extractEntities(text),
    };
  }

  // Determine severity for the default "obligation" classification
  let severity: ClauseSeverity = "recommended";
  if (/\bshould\b/.test(lower) || /ينبغي/.test(text)) {
    severity = "recommended";
  }

  // Default to obligation with recommended severity
  return {
    clauseType: "obligation",
    severity,
    responsibleEntities: extractEntities(text),
  };
}

/**
 * Extract responsible entity names from clause text using common patterns.
 */
function extractEntities(text: string): string[] {
  const entities: string[] = [];
  const _lower = text.toLowerCase();

  // English entity patterns
  const entityPatterns = [
    /\b(the\s+)?organization\b/gi,
    /\b(the\s+)?board(\s+of\s+directors)?\b/gi,
    /\b(the\s+)?management\b/gi,
    /\b(the\s+)?compliance\s+officer\b/gi,
    /\b(the\s+)?risk\s+manager\b/gi,
    /\b(the\s+)?data\s+protection\s+officer\b/gi,
    /\b(the\s+)?internal\s+audit(or)?\b/gi,
    /\b(the\s+)?ciso\b/gi,
    /\b(the\s+)?ceo\b/gi,
    /\b(the\s+)?cfo\b/gi,
    /\bsamA\b/gi,
    /\bncA\b/gi,
    /\bsdaia\b/gi,
    /\bcma\b/gi,
  ];

  // Arabic entity patterns
  const arabicPatterns = [
    /المنظمة/g,
    /مجلس\s+الإدارة/g,
    /الإدارة\s+التنفيذية/g,
    /مسؤول\s+الالتزام/g,
    /مدير\s+المخاطر/g,
    /مسؤول\s+حماية\s+البيانات/g,
    /المراجع\s+الداخلي/g,
  ];

  for (const pattern of [...entityPatterns, ...arabicPatterns]) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        const entity = m.trim().replace(/^the\s+/i, "");
        if (!entities.includes(entity)) {
          entities.push(entity);
        }
      }
    }
  }

  return entities;
}

/**
 * Derive a clause reference (section number) from element text or position.
 * Attempts to extract section numbers like "3.2.1" or "Article 5" from the text.
 */
function deriveClauseRef(element: ParsedElement, index: number): string {
  // Try to extract section numbering patterns
  const sectionMatch = element.text.match(
    /^(?:article|section|clause|annex)?\s*(\d+(?:\.\d+)*)/i,
  );
  if (sectionMatch) {
    return sectionMatch[1];
  }

  // Arabic section patterns: المادة ٥ or البند ٣.٢
  const arabicMatch = element.text.match(
    /(?:المادة|البند|الفقرة)\s*([٠-٩\d]+(?:\.[٠-٩\d]+)*)/,
  );
  if (arabicMatch) {
    return arabicMatch[1]
      .replace(/[٠-٩]/g, (d) =>
        String("٠١٢٣٤٥٦٧٨٩".indexOf(d)),
      );
  }

  // Fallback: use element index
  return `E${index + 1}`;
}

// ============================================================================
// Table Initialization
// ============================================================================

let tablesInitialized = false;

async function ensureTables(tenantId: string): Promise<void> {
  if (tablesInitialized) return;
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".regulatory_clauses (
      clause_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID NOT NULL,
      clause_ref VARCHAR(100),
      text TEXT NOT NULL,
      clause_type VARCHAR(30) NOT NULL,
      severity VARCHAR(20) NOT NULL DEFAULT 'mandatory',
      responsible_entities TEXT[] DEFAULT '{}',
      page_number INTEGER,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reg_clauses_doc_id
      ON "${schema}".regulatory_clauses (document_id);
    CREATE INDEX IF NOT EXISTS idx_reg_clauses_type
      ON "${schema}".regulatory_clauses (clause_type);

    CREATE TABLE IF NOT EXISTS "${schema}".extraction_status (
      document_id UUID PRIMARY KEY,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      total_elements INTEGER DEFAULT 0,
      processed_elements INTEGER DEFAULT 0,
      clauses_extracted INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      error_message TEXT
    );
  `);

  tablesInitialized = true;
}

// ============================================================================
// Core Extraction Pipeline
// ============================================================================

/**
 * Extract and classify regulatory clauses from a parsed document.
 *
 * For each structured element in the document, the function:
 * 1. Classifies the element into a clause type using keyword-based pattern matching
 *    (with LLM classification as a future enhancement)
 * 2. Determines enforcement severity (mandatory/recommended/optional)
 * 3. Identifies responsible entities mentioned in the text
 * 4. Persists the classified clause to the regulatory_clauses table
 *
 * @param tenantId   - Tenant identifier for schema scoping
 * @param documentId - UUID of the previously parsed document
 * @returns Array of extracted and classified regulatory clauses
 */
export async function extractClauses(
  tenantId: string,
  documentId: string,
): Promise<RegulatoryClause[]> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  // Initialize extraction status
  const elements = await getDocumentElements(tenantId, documentId);

  await safeQuery(
    `INSERT INTO "${schema}".extraction_status
     (document_id, status, total_elements, processed_elements, clauses_extracted, started_at)
     VALUES ($1, 'in_progress', $2, 0, 0, NOW())
     ON CONFLICT (document_id) DO UPDATE SET
       status = 'in_progress',
       total_elements = $2,
       processed_elements = 0,
       clauses_extracted = 0,
       started_at = NOW(),
       completed_at = NULL,
       error_message = NULL`,
    [documentId, elements.length],
  );

  const clauses: RegulatoryClause[] = [];
  let processedCount = 0;

  try {
    for (const element of elements) {
      // Skip very short elements (headers, page breaks, etc.)
      if (element.text.trim().length < 10) {
        processedCount++;
        continue;
      }

      // Classify the clause using keyword-based pattern matching
      const classification = classifyClauseByKeywords(element.text);
      const clauseRef = deriveClauseRef(element, element.sortOrder);
      const clauseId = uuid();

      const clause: RegulatoryClause = {
        clauseId,
        documentId,
        clauseRef,
        text: element.text,
        clauseType: classification.clauseType,
        severity: classification.severity,
        responsibleEntities: classification.responsibleEntities,
        pageNumber: element.pageNumber,
        sortOrder: element.sortOrder,
        createdAt: new Date().toISOString(),
      };

      // Persist clause
      await safeQuery(
        `INSERT INTO "${schema}".regulatory_clauses
         (clause_id, document_id, clause_ref, text, clause_type, severity,
          responsible_entities, page_number, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          clauseId,
          documentId,
          clauseRef,
          element.text,
          classification.clauseType,
          classification.severity,
          classification.responsibleEntities,
          element.pageNumber,
          element.sortOrder,
        ],
      );

      clauses.push(clause);
      processedCount++;

      // Update progress periodically (every 10 elements)
      if (processedCount % 10 === 0) {
        await safeQuery(
          `UPDATE "${schema}".extraction_status
           SET processed_elements = $1, clauses_extracted = $2
           WHERE document_id = $3`,
          [processedCount, clauses.length, documentId],
        );
      }
    }

    // Mark extraction as complete
    await safeQuery(
      `UPDATE "${schema}".extraction_status
       SET status = 'completed', processed_elements = $1, clauses_extracted = $2, completed_at = NOW()
       WHERE document_id = $3`,
      [processedCount, clauses.length, documentId],
    );

    // Emit completion event
    await eventBus.publish({
      eventType: "regulatory.content_updated" as any,
      tenantId,

      sourceService: "RegulatoryExtractionService",
      entityType: "regulatory_document",
      entityId: documentId,
      severity: "info",
      payload: {
        action: "clauses_extracted",
        totalClauses: clauses.length,
        clauseTypes: Object.fromEntries(
          (["obligation", "prohibition", "permission", "exception", "definition", "scope", "penalty", "reporting", "timeline"] as ClauseType[]).map(
            (t) => [t, clauses.filter((c: any) => c.clauseType === t).length],
          ),
        ),
      },
    });

    return clauses;
  } catch (err: unknown) {
    // Mark extraction as failed
    await safeQuery(
      `UPDATE "${schema}".extraction_status
       SET status = 'failed', error_message = $1, completed_at = NOW()
       WHERE document_id = $2`,
      [(err as Error).message, documentId],
    );
    throw err;
  }
}

/**
 * Map obligation-type clauses to the Obligation model.
 *
 * For each clause classified as "obligation" or "reporting", creates
 * a corresponding obligation record using the obligation.service.
 *
 * @param tenantId   - Tenant identifier for schema scoping
 * @param documentId - UUID of the document whose clauses to map
 * @returns Array of created obligation IDs
 */
export async function extractObligationsFromClauses(
  tenantId: string,
  documentId: string,
): Promise<string[]> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  // Fetch obligation-type clauses for this document
  const clauseResult = await safeQuery(
    `SELECT clause_id, clause_ref, text, clause_type, severity, responsible_entities
     FROM "${schema}".regulatory_clauses
     WHERE document_id = $1
       AND clause_type IN ('obligation', 'reporting', 'prohibition')
     ORDER BY sort_order ASC`,
    [documentId],
  );

  // Get document info for framework linkage
  const docResult = await safeQuery(
    `SELECT file_name, metadata FROM "${schema}".regulatory_documents
     WHERE document_id = $1`,
    [documentId],
  );

  const docMeta =
    docResult.rows.length > 0
      ? typeof docResult.rows[0].metadata === "string"
        ? JSON.parse(docResult.rows[0].metadata)
        : docResult.rows[0].metadata || {}
      : {};
  const frameworkId = docMeta.framework_id || "extracted";

  const obligationIds: string[] = [];

  for (const row of clauseResult.rows) {
    // Map severity to priority
    const priorityMap: Record<string, "critical" | "high" | "medium" | "low"> = {
      mandatory: "high",
      recommended: "medium",
      optional: "low",
    };

    const obligationInput: ObligationInput = {
      frameworkId,
      requirementRef: row.clause_ref || "N/A",
      titleEn: truncateText(row.text, 200),
      descriptionEn: row.text,
      status: "draft",
      priority: priorityMap[row.severity] || "medium",
    };

    try {
      const obligation = await createObligation(
        tenantId,
        obligationInput,
        "system",
      );
      obligationIds.push(obligation.obligationId);
    } catch (err: unknown) {
      logger.warn(
        `[RegulatoryExtraction] Failed to create obligation from clause ${row.clause_id}: ${(err as Error).message}`,
      );
    }
  }

  // Emit event
  await eventBus.publish({
    eventType: "regulatory.content_updated" as any,
    tenantId,

    sourceService: "RegulatoryExtractionService",
    entityType: "regulatory_document",
    entityId: documentId,
    severity: "info",
    payload: {
      action: "obligations_extracted",
      obligationCount: obligationIds.length,
    },
  });

  return obligationIds;
}

/**
 * Retrieve the current extraction status for a document.
 *
 * @param tenantId   - Tenant identifier for schema scoping
 * @param documentId - UUID of the document to check
 * @returns Current extraction status including progress metrics
 */
export async function getExtractionStatus(
  tenantId: string,
  documentId: string,
): Promise<ExtractionStatus> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT document_id, status, total_elements, processed_elements,
            clauses_extracted, started_at, completed_at, error_message
     FROM "${schema}".extraction_status
     WHERE document_id = $1`,
    [documentId],
  );

  if (result.rows.length === 0) {
    return {
      documentId,
      status: "pending",
      totalElements: 0,
      processedElements: 0,
      clausesExtracted: 0,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };
  }

  const row = result.rows[0];
  return {
    documentId: row.document_id,
    status: row.status,
    totalElements: row.total_elements,
    processedElements: row.processed_elements,
    clausesExtracted: row.clauses_extracted,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Truncate text to a maximum length, appending ellipsis if truncated.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
