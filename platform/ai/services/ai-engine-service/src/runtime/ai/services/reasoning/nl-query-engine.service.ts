// ============================================
// NL Query Engine — Semantic Natural Language
// Query Engine for AGRC-OS
//
// Users ask questions in plain English/Arabic
// and get tenant-scoped GRC data back.
//
// Resolution chain:
//  1. Template matching (fast, safe, no LLM cost)
//  2. LLM-generated SQL (strict guardrails)
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { NL_QUERY_TEMPLATES, QueryTemplate } from './nl-query-templates';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '../../ports/platform.port';

/** Result envelope returned to the caller / API layer */
export interface QueryResult {
  type: 'template' | 'generated' | 'error';
  templateId?: string;
  description?: string;
  visualization?: string;
  rows?: unknown[];
  rowCount?: number;
  sql?: string;
  message?: string;
  /** Confidence score: 95 for template matches, 70 for LLM-generated */
  confidence?: number;
}

// ── Pattern matching ─────────────────────────────────────────

/**
 * Simple word-overlap matcher. Each template pattern is split
 * into words, and the query is checked for how many of those
 * words appear. A 60% threshold ensures partial matches work
 * (e.g. "show me the top risks" matches "top risks").
 */
function matchTemplate(query: string): QueryTemplate | null {
  const normalized = query.toLowerCase().trim();
  let bestMatch: QueryTemplate | null = null;
  let bestScore = 0;

  for (const template of NL_QUERY_TEMPLATES) {
    for (const pattern of template.patterns) {
      const patternWords = pattern.toLowerCase().split(' ');
      const matchedWords = patternWords.filter((w) => normalized.includes(w));
      const score = matchedWords.length / patternWords.length;
      if (score > bestScore && score >= 0.6) {
        bestScore = score;
        bestMatch = template;
      }
    }
  }

  return bestMatch;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Execute a natural language query against the tenant's schema.
 * First tries safe template matching, then falls back to
 * LLM-generated SQL with strict guardrails.
 */
export async function executeNLQuery(tenantId: string, query: string): Promise<QueryResult> {
  const schema = tenantSchema(tenantId);

  // 1. Try template matching (fast, safe, no LLM cost)
  const template = matchTemplate(query);
  if (template) {
    try {
      const sql = template.sql(schema);
      const { rows } = await safeQuery(sql);
      return {
        type: 'template',
        templateId: template.id,
        description: template.description,
        visualization: template.visualization,
        rows,
        rowCount: rows.length,
        confidence: 95,
      };
    } catch (err) {
      return { type: 'error', message: `Query failed: ${toErrorMessage(err)}` };
    }
  }

  // 2. Try LLM-generated SQL (with strict guardrails)
  try {
    const generatedSql = await generateSafeSql(tenantId, query, schema);
    if (!generatedSql) {
      return {
        type: 'error',
        message:
          'I could not generate a safe query for that question. Try asking about risks, controls, evidence, policies, findings, vendors, or compliance posture.',
      };
    }

    const { rows } = await safeQuery(generatedSql);
    return {
      type: 'generated',
      rows,
      rowCount: rows.length,
      sql: generatedSql,
      visualization: 'table',
      confidence: 70,
    };
  } catch (err) {
    return {
      type: 'error',
      message: `Generated query failed: ${toErrorMessage(err)}. Try a simpler question.`,
    };
  }
}

// ── LLM-based SQL generation ─────────────────────────────────

/** Dangerous SQL keywords that must never appear in generated queries */
const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i;

/**
 * Uses the AI gateway to generate a SELECT-only SQL statement
 * from the user's natural language question. Applies strict
 * validation before returning the SQL.
 */
async function generateSafeSql(
  tenantId: string,
  query: string,
  schema: string,
): Promise<string | null> {
  try {
    // Fetch available table names to give the LLM context
    const { rows: tables } = await safeQuery(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`,
      [schema],
    );
    // Limit table list to keep the prompt within token budget
    const tableNames = tables.map((t: GenericRow) => t.table_name).slice(0, 50);

    const { gatewayJSON } = await import('../gateway/ai-gateway.service');

    const systemPrompt = `You are a PostgreSQL query generator for a GRC (Governance, Risk, Compliance) platform. Generate safe, read-only SELECT queries.`;
    const userMessage = `Generate a PostgreSQL SELECT query for schema "${schema}".

Available tables: ${tableNames.join(', ')}

User question: ${query}

Rules:
- SELECT only. No INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE.
- No subqueries to schemas other than "${schema}".
- Always add LIMIT 100 unless user asked for a specific count.
- Use double-quoted schema: "${schema}".table_name
- Return ONLY the raw SQL, no markdown, no explanation, no backticks.`;

    const result = await gatewayJSON({
      tenantId,
      systemPrompt,
      userMessage,
      maxTokens: 500,
      temperature: 0,
    });

    const sql = typeof result === 'string' ? result.trim() : String(result).trim();

    // Strict validation: must start with SELECT
    if (!sql.toUpperCase().startsWith('SELECT')) return null;
    // Must not contain forbidden mutation keywords
    if (FORBIDDEN_KEYWORDS.test(sql)) return null;
    // Must reference the tenant schema (prevents cross-schema reads)
    if (!sql.includes(schema)) return null;

    return sql;
  } catch {
    return null;
  }
}

// ── Query type listing (for UI autocomplete) ─────────────────

/**
 * Returns a summary of all available template queries so the
 * frontend can offer suggestions / autocomplete to users.
 */
export function getAvailableQueryTypes(): Array<{
  id: string;
  description: string;
  patterns: string[];
}> {
  return NL_QUERY_TEMPLATES.map((t) => ({
    id: t.id,
    description: t.description,
    patterns: t.patterns,
  }));
}
