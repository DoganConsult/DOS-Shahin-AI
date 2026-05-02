// WorkflowAdminComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'workflow-admin.component.ts'), 'utf-8');

describe('WorkflowAdminComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should have selector app-workflow-admin', () => {
    expect(src).toMatch(/selector:\s*['"]app-workflow-admin['"]/);
  });

  it('should export WorkflowAdminComponent class', () => {
    expect(src).toContain('export class WorkflowAdminComponent');
  });

  it('should implement OnInit to load data on creation', () => {
    expect(src).toContain('implements OnInit');
    expect(src).toContain('ngOnInit');
  });

  it('should inject WorkflowApiService for backend calls', () => {
    expect(src).toContain('WorkflowApiService');
    expect(src).toContain('inject(WorkflowApiService)');
  });

  it('should have a loading signal for initial fetch', () => {
    expect(src).toMatch(/loading\s*=\s*signal\(false\)/);
  });

  it('should have a healthStatus signal for engine health', () => {
    expect(src).toContain('healthStatus');
    expect(src).toContain('loadHealth');
  });

  it('should load health status calling api.getHealth()', () => {
    expect(src).toContain('this.api.getHealth()');
  });

  it('should have stuckExecutions signal for stuck items', () => {
    expect(src).toContain('stuckExecutions');
    expect(src).toContain('loadStuckExecutions');
  });

  it('should filter executions for stuck/stalled status', () => {
    expect(src).toContain("e.status === 'stuck'");
    expect(src).toContain("e.status === 'stalled'");
  });

  it('should support retrying a stuck execution', () => {
    expect(src).toContain('onRetryExecution');
    expect(src).toContain('retryingId');
    expect(src).toContain('resumeWorkflow');
  });

  it('should support killing a stuck execution', () => {
    expect(src).toContain('onKillExecution');
    expect(src).toContain('updateWorkflowStatus');
  });

  it('should have killSwitches signal and toggle method', () => {
    expect(src).toContain('killSwitches');
    expect(src).toContain('onToggleKillSwitch');
  });

  it('should toggle kill switch active state on click', () => {
    expect(src).toContain('active: !ks.active');
  });

  it('should have slaThresholds signal for SLA editing', () => {
    expect(src).toContain('slaThresholds');
    expect(src).toContain('loadSlaThresholds');
  });

  it('should provide onSaveSlaThreshold for saving SLA config', () => {
    expect(src).toContain('onSaveSlaThreshold');
  });

  it('should have version rollout controls', () => {
    expect(src).toContain('versionOptions');
    expect(src).toContain('rolloutPct');
    expect(src).toContain('onApplyRollout');
  });

  it('should display error state via error signal', () => {
    expect(src).toMatch(/error\s*=\s*signal<string \| null>\(null\)/);
    expect(src).toContain('role="alert"');
  });

  it('should import PrimeNG modules for UI controls', () => {
    expect(src).toContain('ButtonModule');
    expect(src).toContain('TagModule');
    expect(src).toContain('InputSwitchModule');
  });
});
