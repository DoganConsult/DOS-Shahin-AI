import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Compliance Test Engine
// Test definition storage, execution engine, and history
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { testControl } from '../core/compliance.service';
import { getFirstRow } from '@dos/db';
import type { ComplianceTestDefinition, TestStep, TestExecutionResult } from '../automation/compliance-as-code.types';
import { evalCondition, compareResult } from '../automation/compliance-expression-parser';
import type { GenericRow as _GenericRow } from '@dos/types';

// ── Test Definition Storage ───────────────────────────────────────────────

/**
 * Store test definition
 */
export async function storeTestDefinition(
  tenantId: string,
  definition: ComplianceTestDefinition
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Create table if needed
  await safeQuery(
    `CREATE TABLE IF NOT EXISTS "${schema}".compliance_test_definitions (
      test_id VARCHAR(255) PRIMARY KEY,
      tenant_id UUID NOT NULL,
      name VARCHAR(500) NOT NULL,
      description TEXT,
      control_id UUID NOT NULL,
      test_type VARCHAR(50) NOT NULL,
      definition_json JSONB NOT NULL,
      schedule VARCHAR(255),
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, test_id)
    )`,
    []
  );

  // Upsert definition
  await safeQuery(
    `INSERT INTO "${schema}".compliance_test_definitions
       (test_id, tenant_id, name, description, control_id, test_type, definition_json, schedule, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, test_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       control_id = EXCLUDED.control_id,
       test_type = EXCLUDED.test_type,
       definition_json = EXCLUDED.definition_json,
       schedule = EXCLUDED.schedule,
       enabled = EXCLUDED.enabled,
       updated_at = NOW()`,
    [
      definition.testId,
      tenantId,
      definition.name,
      definition.description || null,
      definition.controlId,
      definition.type,
      JSON.stringify(definition),
      definition.schedule || null,
      definition.enabled !== false,
    ]
  );
}

/**
 * Get test definition
 */
export async function getTestDefinition(
  tenantId: string,
  testId: string
): Promise<ComplianceTestDefinition | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT definition_json FROM "${schema}".compliance_test_definitions
     WHERE tenant_id = $1 AND test_id = $2 AND enabled = true`,
    [tenantId, testId]
  );

  if (result.rows.length === 0) return null;
  return getFirstRow(result)?.definition_json as ComplianceTestDefinition;
}

/**
 * Get all test definitions for a control
 */
export async function getTestDefinitionsForControl(
  tenantId: string,
  controlId: string
): Promise<ComplianceTestDefinition[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT definition_json FROM "${schema}".compliance_test_definitions
     WHERE tenant_id = $1 AND control_id = $2 AND enabled = true
     ORDER BY created_at`,
    [tenantId, controlId]
  );

  return result.rows.map((row) => row.definition_json as ComplianceTestDefinition);
}

// ── Test Execution Engine ─────────────────────────────────────────────────

/**
 * Execute a compliance test
 */
export async function executeTest(
  tenantId: string,
  testId: string,
  options: {
    dryRun?: boolean;
    failOnFirstError?: boolean;
  } = {}
): Promise<TestExecutionResult> {
  const definition = await getTestDefinition(tenantId, testId);
  if (!definition) throw Object.assign(new Error(`Test definition ${testId} not found`), { statusCode: 404 });

  const executedAt = new Date().toISOString();
  const startMs = Date.now();
  const stepResults: TestExecutionResult['steps'] = [];
  let hasError = false;
  let hasFail = false;

  for (const step of (definition.steps || [])) {
    const stepStart = Date.now();
    try {
      const stepResult = await executeStep(tenantId, definition.controlId, step);
      const passed = (stepResult as Record<string, unknown>)?.passed !== false;
      stepResults.push({
        order: step.order,
        status: passed ? 'pass' : 'fail',
        result: stepResult,
        durationMs: Date.now() - stepStart,
      });
      if (!passed) hasFail = true;
      if (options.failOnFirstError && !passed) break;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      stepResults.push({
        order: step.order,
        status: 'error',
        result: null,
        error: errMsg,
        durationMs: Date.now() - stepStart,
      });
      hasError = true;
      if (options.failOnFirstError) break;
    }
  }

  const overallResult: 'pass' | 'fail' = (hasError || hasFail) ? 'fail' : 'pass';
  const status: TestExecutionResult['status'] = hasError ? 'error' : hasFail ? 'fail' : 'pass';
  const executionResult: TestExecutionResult = {
    testId,
    controlId: definition.controlId,
    executedAt,
    status,
    steps: stepResults,
    overallResult,
    durationMs: Date.now() - startMs,
  };

  if (!options.dryRun) {
    await recordTestResult(tenantId, executionResult);
  }

  return executionResult;
}

/**
 * Execute a single test step
 */
async function executeStep(
  tenantId: string,
  controlId: string,
  step: TestStep
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  switch (step.type) {
    case 'check_evidence': {
      const config = step.config;
      const evidenceType = config.evidenceType;
      const required = config.evidenceRequired !== false;
      const freshnessDays = config.evidenceFreshnessDays || 90;
      const qualityTier = config.evidenceQualityTier;

      // Query evidence for this control
      const evidenceResult = await safeQuery(
        `SELECT e.evidence_id, e.artifact_type, e.collected_at, e.quality_tier, e.valid_until
         FROM "${schema}".evidence e
         INNER JOIN "${schema}".control_evidence_mappings cem ON e.evidence_id = cem.evidence_id
         WHERE cem.control_id = $1
           ${evidenceType ? `AND e.artifact_type = $2` : ''}
         ORDER BY e.collected_at DESC
         LIMIT 1`,
        evidenceType ? [controlId, evidenceType] : [controlId]
      );

      if (evidenceResult.rows.length === 0) {
        return {
          found: false,
          required,
          passed: !required,
        };
      }

      const evidence = getFirstRow(evidenceResult)!;
      const collectedAt = new Date(evidence.collected_at);
      const ageDays = (Date.now() - collectedAt.getTime()) / (1000 * 60 * 60 * 24);
      const isFresh = ageDays <= freshnessDays;
      const qualityMatch = !qualityTier || evidence.quality_tier === qualityTier;

      return {
        found: true,
        evidenceId: evidence.evidence_id,
        artifactType: evidence.artifact_type,
        ageDays: Math.round(ageDays),
        isFresh,
        qualityTier: evidence.quality_tier,
        qualityMatch,
        passed: isFresh && qualityMatch,
      };
    }

    case 'query_data': {
      const config = step.config;
      if (!config.query) {
        throw new Error('Query not specified for query_data step');
      }

      // Safety: only allow SELECT/WITH queries to prevent DML/DDL injection
      const queryText = config.query.replace(/\$\{controlId\}/g, controlId);
      const trimmedUpper = queryText.trim().toUpperCase();
      if (!trimmedUpper.startsWith('SELECT') && !trimmedUpper.startsWith('WITH')) {
        throw new Error('query_data step only allows SELECT or WITH queries');
      }

      const params = config.queryParams ? Object.values(config.queryParams) : [];

      // Execute within a READ-ONLY transaction to enforce no side effects
      await safeQuery('BEGIN', []);
      await safeQuery('SET TRANSACTION READ ONLY', []);
      try {
        const result = await safeQuery(queryText, params);
        await safeQuery('COMMIT', []);

        return {
          rowCount: result.rows.length,
          expectedRows: config.expectedRows,
          rowsMatch: config.expectedRows ? result.rows.length === config.expectedRows : true,
          columns: result.rows.length > 0 ? Object.keys(getFirstRow(result)) : [],
          expectedColumns: config.expectedColumns,
          columnsMatch: config.expectedColumns
            ? config.expectedColumns.every((col) => result.rows.length > 0 && col in getFirstRow(result))
            : true,
          data: result.rows,
        };
      } catch (err) {
        await safeQuery('ROLLBACK', []).catch(catchHandler(EC.EVENT_BUS, {}));
        throw err;
      }
    }

    case 'assert_condition': {
      const config = step.config;
      if (!config.condition) {
        throw new Error('Condition not specified for assert_condition step');
      }

      // Evaluate condition (simple JavaScript expression)
      // In production, use a safe expression evaluator
      const variables = { ...config.variables, controlId };
      try {
        // Simple evaluation (for production, use a proper expression evaluator)
        const result = evalCondition(config.condition, variables);
        return {
          condition: config.condition,
          result,
          passed: result === true,
        };
      } catch (err: unknown) {
        throw new Error(`Condition evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    case 'call_api': {
      const config = step.config;
      if (!config.apiEndpoint) {
        throw new Error('API endpoint not specified for call_api step');
      }
      const url = config.apiEndpoint.startsWith('/')
        ? `http://127.0.0.1:${process.env.PORT || 3000}${config.apiEndpoint}`
        : config.apiEndpoint;
      const allowedHosts = (process.env.COMPLIANCE_API_ALLOWED_HOSTS || '127.0.0.1,localhost').split(',').map(h => h.trim());
      const parsedUrl = new URL(url);
      if (!allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith(`.${h}`))) {
        throw new Error(`API host ${parsedUrl.hostname} is not in allowed hosts list`);
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      try {
        const fetchResponse = await fetch(url, {
          method: (config.method || 'GET') as string,
          headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
          body: config.method && config.method !== 'GET' && config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const status = fetchResponse.status;
        let responseBody: any;
        try { responseBody = await fetchResponse.json(); } catch { responseBody = await fetchResponse.text(); }
        const statusMatch = config.expectedStatus ? status === config.expectedStatus : status >= 200 && status < 300;
        const responseMatch = config.expectedResponse ? JSON.stringify(responseBody) === JSON.stringify(config.expectedResponse) : true;
        return {
          endpoint: config.apiEndpoint,
          method: config.method || 'GET',
          executed: true,
          status,
          statusMatch,
          responseMatch,
          responseBody,
          passed: statusMatch && responseMatch,
        };
      } catch (err: unknown) {
        clearTimeout(timeout);
        throw new Error(`API call failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    case 'run_script': {
      const config = step.config;
      if (!config.script) {
        throw new Error('Script not specified for run_script step');
      }
      const scriptType = config.scriptType || 'javascript';

      if (scriptType === 'sql') {
        // Safety: only allow SELECT/WITH queries in SQL scripts
        const sqlText = config.script.replace(/\$\{controlId\}/g, controlId);
        const trimmedUpper = sqlText.trim().toUpperCase();
        if (!trimmedUpper.startsWith('SELECT') && !trimmedUpper.startsWith('WITH')) {
          throw new Error('run_script SQL step only allows SELECT or WITH queries');
        }

        // Execute within a READ-ONLY transaction to enforce no side effects
        await safeQuery('BEGIN', []);
        await safeQuery('SET TRANSACTION READ ONLY', []);
        try {
          const sqlResult = await safeQuery(sqlText, []);
          await safeQuery('COMMIT', []);
          return { scriptType, executed: true, result: sqlResult.rows, rowCount: sqlResult.rows.length, passed: sqlResult.rows.length > 0 };
        } catch (err) {
          await safeQuery('ROLLBACK', []).catch(catchHandler(EC.EVENT_BUS, {}));
          throw err;
        }
      }

      if (scriptType === 'javascript') {
        // Security: use the safe expression parser instead of vm.runInContext.
        // The expression parser supports comparisons, arithmetic, logical ops,
        // and string methods -- sufficient for compliance condition scripts.
        // Scripts that are too complex for the parser will be rejected.
        const variables: Record<string, unknown> = { controlId, tenantId };
        try {
          const result = evalCondition(config.script, variables);
          return { scriptType, executed: true, result, passed: result === true };
        } catch (err: unknown) {
          throw new Error(`Script execution failed (only safe expressions are supported): ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      throw new Error(`Unsupported script type: ${scriptType}. Supported: javascript, sql`);
    }

    default:
      throw new Error(`Unknown step type: ${(step as any).type}`);
  }
}

// ── Test Result Recording ─────────────────────────────────────────────────

/**
 * Record test execution result
 */
async function recordTestResult(
  tenantId: string,
  result: TestExecutionResult
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Create table if needed
  await safeQuery(
    `CREATE TABLE IF NOT EXISTS "${schema}".compliance_test_executions (
      execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      test_id VARCHAR(255) NOT NULL,
      control_id UUID NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL,
      status VARCHAR(20) NOT NULL,
      overall_result VARCHAR(20) NOT NULL,
      result_json JSONB NOT NULL,
      duration_ms INT NOT NULL,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    []
  );

  // Insert execution record
  await safeQuery(
    `INSERT INTO "${schema}".compliance_test_executions
       (tenant_id, test_id, control_id, executed_at, status, overall_result, result_json, duration_ms, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      tenantId,
      result.testId,
      result.controlId,
      result.executedAt,
      result.status,
      result.overallResult,
      JSON.stringify(result),
      result.durationMs,
      result.error || null,
    ]
  );

  // Update control test status via compliance.service
  await testControl(tenantId, result.controlId, {
    testResult: result.overallResult,
    notes: `Automated test: ${result.testId}. ${result.error || 'Completed'}`,
    testedBy: 'compliance-as-code',
  });
}

// ── Batch & History ───────────────────────────────────────────────────────

/**
 * Execute all tests for a control
 */
export async function executeTestsForControl(
  tenantId: string,
  controlId: string,
  options: { dryRun?: boolean } = {}
): Promise<TestExecutionResult[]> {
  const definitions = await getTestDefinitionsForControl(tenantId, controlId);
  const results: TestExecutionResult[] = [];

  for (const definition of definitions) {
    if (definition.enabled) {
      const result = await executeTest(tenantId, definition.testId, options);
      results.push(result);
    }
  }

  return results;
}

/**
 * Get test execution history
 */
export async function getTestExecutionHistory(
  tenantId: string,
  testId?: string,
  controlId?: string,
  limit: number = 50
): Promise<Array<TestExecutionResult>> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT result_json FROM "${schema}".compliance_test_executions WHERE tenant_id = $1`;
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (testId) {
    query += ` AND test_id = $${paramIndex}`;
    params.push(testId);
    paramIndex++;
  }

  if (controlId) {
    query += ` AND control_id = $${paramIndex}`;
    params.push(controlId);
    paramIndex++;
  }

  query += ` ORDER BY executed_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await safeQuery(query, params);
  return result.rows.map((row) => row.result_json as TestExecutionResult);
}
