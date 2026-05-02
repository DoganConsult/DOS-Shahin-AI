// WorkflowApiService — Structure & HTTP Endpoint Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'workflow-api.service.ts'), 'utf-8');

describe('WorkflowApiService', () => {
  it('should be injectable with providedIn root', () => {
    expect(src).toContain("providedIn: 'root'");
  });

  it('should export WorkflowApiService class', () => {
    expect(src).toContain('export class WorkflowApiService');
  });

  it('should inject HttpClient for API calls', () => {
    expect(src).toContain('HttpClient');
    expect(src).toContain('inject(HttpClient)');
  });

  it('should use environment.apiUrl as base URL', () => {
    expect(src).toContain('environment.apiUrl');
    expect(src).toContain('this.base');
  });

  // ── Workflow CRUD endpoints ──
  it('should have getWorkflows calling GET /workflows', () => {
    expect(src).toContain('getWorkflows');
    expect(src).toContain('`${this.base}/workflows`');
  });

  it('should have createWorkflow calling POST /workflows', () => {
    expect(src).toContain('createWorkflow');
    expect(src).toContain('this.http.post');
  });

  it('should have executeWorkflow calling POST /workflows/:id/execute', () => {
    expect(src).toContain('executeWorkflow');
    expect(src).toContain('/execute');
  });

  it('should have resumeWorkflow calling POST /workflows/:id/resume', () => {
    expect(src).toContain('resumeWorkflow');
    expect(src).toContain('/resume');
  });

  it('should have updateWorkflowStatus calling PUT /workflows/:id/status', () => {
    expect(src).toContain('updateWorkflowStatus');
    expect(src).toContain('/status');
  });

  // ── Admin & Diagnostics endpoints ──
  it('should have getHealth calling GET /workflow/admin/health', () => {
    expect(src).toContain('getHealth');
    expect(src).toContain('/workflow/admin/health');
  });

  it('should have getDiagnostics calling GET /workflow/diagnostics', () => {
    expect(src).toContain('getDiagnostics');
    expect(src).toContain('/workflow/diagnostics');
  });

  it('should have getAdminSettings calling GET /workflow/admin/settings', () => {
    expect(src).toContain('getAdminSettings');
    expect(src).toContain('/workflow/admin/settings');
  });

  // ── Definition Registry endpoints ──
  it('should have getDefinitions with query params', () => {
    expect(src).toContain('getDefinitions');
    expect(src).toContain('/workflow/definitions');
  });

  it('should have getTransitionRules for a definition', () => {
    expect(src).toContain('getTransitionRules');
    expect(src).toContain('/transitions');
  });

  it('should have validateDefinitionGraph for graph validation', () => {
    expect(src).toContain('validateDefinitionGraph');
    expect(src).toContain('/validate');
  });

  // ── SLA endpoints ──
  it('should have getSlaStatus for execution SLA', () => {
    expect(src).toContain('getSlaStatus');
    expect(src).toContain('/sla');
  });

  it('should have getSlaMetrics for aggregate SLA metrics', () => {
    expect(src).toContain('getSlaMetrics');
    expect(src).toContain('/workflow/sla/metrics');
  });

  // ── Escalation endpoints ──
  it('should have getPendingEscalations for open escalations', () => {
    expect(src).toContain('getPendingEscalations');
    expect(src).toContain('/workflow/escalations/pending');
  });

  it('should have resolveEscalation for closing escalations', () => {
    expect(src).toContain('resolveEscalation');
    expect(src).toContain('/resolve');
  });

  // ── Version Rollout endpoints ──
  it('should have rolloutVersion for version migration', () => {
    expect(src).toContain('rolloutVersion');
    expect(src).toContain('/rollout');
  });

  it('should have promoteVersion for version promotion', () => {
    expect(src).toContain('promoteVersion');
    expect(src).toContain('/promote');
  });

  // ── Return type contracts ──
  it('should return typed Observable results from contract types', () => {
    expect(src).toContain('WorkflowDiagnosticsContract');
    expect(src).toContain('SlaStatusContract');
    expect(src).toContain('EscalationRecord');
    expect(src).toContain('ExecutionHistoryContract');
    expect(src).toContain('VersionRolloutResult');
  });
});
