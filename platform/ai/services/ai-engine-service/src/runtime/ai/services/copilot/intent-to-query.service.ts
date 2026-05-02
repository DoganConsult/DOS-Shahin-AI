// ============================================
// AI Intent-to-Query Dynamic Parser
// Translates natural language into structured list-data filters
// ============================================

import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
import { toErrorMessage } from '@dos/module-sdk';

export interface IntentToQueryResult {
  intent: string;
  filterPayload: {
    filters?: Array<{ field: string; operator: string; value: any }>;
    sortField?: string;
    sortOrder?: 1 | -1;
    keyword?: string;
  };
}

export async function parseIntentToQuery(
  tenantId: string,
  userId: string,
  moduleCode: string,
  userQuery: string,
  language: string = 'en'
): Promise<IntentToQueryResult> {
  // 1. Fetch available columns for the module (grounds the AI)
  const schema = tenantSchema(tenantId);
  const safeTableName = moduleCode.replace(/[^a-z0-9_]/gi, ''); // Sanitize table name somewhat
  
  const columnsRes = await swallowDefault(
    EC.FALLBACK_QUERY,
    emptyResult(),
    safeQuery(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = $1 AND table_name = $2`,
      [schema, safeTableName]
    ),
    { tenantId, operation: `query_columns:${moduleCode}` }
  );

  let schemaContext = '';

  if (columnsRes && columnsRes.rows && columnsRes.rows.length > 0) {
    schemaContext = `\nKnown columns for ${moduleCode} dataset:\n`;

    schemaContext += columnsRes.rows.map(r => `- ${r.column_name} (${r.data_type})`).join('\n');
  } else {
    schemaContext = `\n(No explicit column list provided. Assume standard Enterprise field names like status, risk_level, assigned_to, created_at, due_date, etc for module '${moduleCode}')`;
  }

  // 2. Call the LLM to structure the JSON
  const systemPrompt = `You are the DOS-AIO Natural Language to SQL/Query Engine.
Your job is to translate a user's natural language request into a strictly typed query payload for the generic 'list-data' engine.
Module target: ${moduleCode}
${schemaContext}

Requirements:
- Extract "intent" as a short summary of what the user wants.
- Map search criteria into the "filterPayload.filters" array.
- "field" must be a snake_case column name.
- "operator" must be one of: "eq", "neq", "in", "nin", "gt", "gte", "lt", "lte", "contains", "icontains".
- "value" should be the target match. Example: "high risk" -> field: "risk_level", value: "high"
- If there is a sorting preference (e.g. "newest", "highest"), set sortField and sortOrder (1 for asc, -1 for desc).
- If there is a generic search term, put it in "keyword".

Output exactly as JSON:
{
  "intent": "string",
  "filterPayload": {
    "filters": [
      { "field": "string", "operator": "string", "value": "any" }
    ],
    "sortField": "string",
    "sortOrder": -1,
    "keyword": "string"
  }
}
`;

  try {
    const { claudeJSON } = await import('../../../../config/claude-client');
    const result = await claudeJSON({
      systemPrompt,
      userMessage: userQuery,
      maxTokens: 512,
      temperature: 0.1,
      tenantId,
      agentId: 'intent-parser',
      decisionType: 'nlp_to_query',
    });

    const typedResult = result as unknown as IntentToQueryResult;
    
    // Ensure shape format fallback if AI misses array structure

    if (!typedResult.filterPayload) {

      typedResult.filterPayload = { filters: [] };
    }

    if (!typedResult.filterPayload.filters) {

      typedResult.filterPayload.filters = [];
    }

    return typedResult;
  } catch (err: unknown) {
    return {
      intent: `Failed to parse query: ${toErrorMessage(err)}`,
      filterPayload: {
        keyword: userQuery,
        filters: [],
      }
    };
  }
}
