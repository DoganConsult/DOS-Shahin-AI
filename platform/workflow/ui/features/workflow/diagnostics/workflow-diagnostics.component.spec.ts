// WorkflowDiagnosticsComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'workflow-diagnostics.component.ts'), 'utf-8');

describe('WorkflowDiagnosticsComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should have selector app-workflow-diagnostics', () => {
    expect(src).toMatch(/selector:\s*['"]app-workflow-diagnostics['"]/);
  });

  it('should export WorkflowDiagnosticsComponent class', () => {
    expect(src).toContain('export class WorkflowDiagnosticsComponent');
  });

  it('should implement OnInit to run diagnostics on load', () => {
    expect(src).toContain('implements OnInit');
    expect(src).toContain('ngOnInit');
  });

  it('should inject WorkflowApiService', () => {
    expect(src).toContain('inject(WorkflowApiService)');
  });

  it('should call getDiagnostics on init', () => {
    expect(src).toContain('loadDiagnostics');
    expect(src).toContain('this.api.getDiagnostics()');
  });

  it('should store result in a signal typed as WorkflowDiagnosticsContract', () => {
    expect(src).toContain('result = signal<WorkflowDiagnosticsContract | null>(null)');
  });

  it('should display healthy/unhealthy status banner', () => {
    expect(src).toContain('diag-status-banner');
    expect(src).toContain('[class.healthy]');
    expect(src).toContain('[class.unhealthy]');
  });

  it('should load failed executions from the execution list', () => {
    expect(src).toContain('loadFailedExecutions');
    expect(src).toContain("e.status === 'failed'");
  });

  it('should have failedExecutions signal', () => {
    expect(src).toContain('failedExecutions = signal<FailedExecution[]>([])');
  });

  it('should support retrying a failed execution', () => {
    expect(src).toContain('onRetryFailed');
    expect(src).toContain('this.api.resumeWorkflow');
  });

  it('should have execution trace loading capability', () => {
    expect(src).toContain('traceExecutionId');
    expect(src).toContain('traceLoading');
    expect(src).toContain('traceEntries');
    expect(src).toContain('onLoadTrace');
  });

  it('should call getExecutionHistory for trace data', () => {
    expect(src).toContain('this.api.getExecutionHistory(id)');
  });

  it('should have a traceEventSeverity mapper for PrimeNG tags', () => {
    expect(src).toContain('traceEventSeverity');
    expect(src).toContain("'success'");
    expect(src).toContain("'danger'");
  });

  it('should have compensation/rollback records signal', () => {
    expect(src).toContain('compensations = signal<CompensationRecord[]>([])');
  });

  it('should have approval bottleneck analysis', () => {
    expect(src).toContain('bottlenecks');
    expect(src).toContain('loadPendingEscalationsAsBottlenecks');
  });

  it('should have dead letter queue signal', () => {
    expect(src).toContain('deadLetterQueue = signal<DeadLetterEntry[]>([])');
  });

  it('should display error state via error signal', () => {
    expect(src).toMatch(/error\s*=\s*signal<string \| null>\(null\)/);
    expect(src).toContain('role="alert"');
  });

  it('should import ExecutionHistoryEntry from contracts', () => {
    expect(src).toContain('ExecutionHistoryEntry');
  });
});
