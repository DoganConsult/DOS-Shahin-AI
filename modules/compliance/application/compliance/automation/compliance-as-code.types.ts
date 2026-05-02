import { safeQuery } from "@dos/db";

// ============================================
// Shahin — Compliance-as-Code Types
// Type definitions for the compliance test DSL
// ============================================

/**
 * Test Definition DSL
 * YAML/JSON format for defining automated compliance tests
 */
export interface ComplianceTestDefinition {
  /** Test ID (unique identifier) */
  testId: string;
  /** Test name (human-readable) */
  name: string;
  /** Test description */
  description?: string;
  /** Control ID this test validates */
  controlId: string;
  /** Test type */
  type: 'evidence_check' | 'data_query' | 'condition' | 'api_call' | 'script';
  /** Test steps/assertions */
  steps: TestStep[];
  /** Expected result */
  expectedResult: 'pass' | 'fail';
  /** Test schedule (cron expression or 'on_demand') */
  schedule?: string;
  /** Enabled flag */
  enabled: boolean;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Test Step
 */
export interface TestStep {
  /** Step order */
  order: number;
  /** Step type */
  type: 'check_evidence' | 'query_data' | 'assert_condition' | 'call_api' | 'run_script';
  /** Step description */
  description: string;
  /** Step configuration */
  config: TestStepConfig;
  /** Expected outcome — varies by step type: boolean, number, string, or structured JSON */
  expected: string | number | boolean | Record<string, unknown> | null;
  /** Fail fast (stop on failure) */
  failFast?: boolean;
}

/**
 * Test Step Configuration (varies by step type)
 */
export interface TestStepConfig {
  // For check_evidence
  evidenceType?: string;
  evidenceRequired?: boolean;
  evidenceFreshnessDays?: number;
  evidenceQualityTier?: 'A' | 'B' | 'C';

  // For query_data
  query?: string;
  queryParams?: Record<string, unknown>;
  expectedRows?: number;
  expectedColumns?: string[];
  assertion?: string; // JSONPath or SQL-like condition

  // For assert_condition
  condition?: string; // JavaScript expression or JSONLogic
  variables?: Record<string, unknown>;

  // For call_api
  apiEndpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  expectedStatus?: number;
  expectedResponse?: Record<string, unknown> | string | number | boolean | null;

  // For run_script
  script?: string; // JavaScript code
  scriptType?: 'javascript' | 'python' | 'sql';
}

/**
 * Test Execution Result
 */
export interface TestExecutionResult {
  testId: string;
  controlId: string;
  executedAt: string;
  status: 'pass' | 'fail' | 'partial' | 'error';
  steps: Array<{
    order: number;
    status: 'pass' | 'fail' | 'error' | 'skipped';
    result: unknown;
    error?: string;
    durationMs: number;
  }>;
  overallResult: 'pass' | 'fail';
  error?: string;
  durationMs: number;
}

/** Token types for the expression lexer */
export type TokenType =
  | 'STRING' | 'NUMBER' | 'BOOLEAN' | 'IDENT' | 'DOT'
  | 'LPAREN' | 'RPAREN' | 'COMMA'
  | 'EQ' | 'NEQ' | 'GT' | 'LT' | 'GTE' | 'LTE'
  | 'AND' | 'OR' | 'NOT'
  | 'PLUS' | 'MINUS' | 'STAR' | 'SLASH'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string | number | boolean;
  pos: number;
}
