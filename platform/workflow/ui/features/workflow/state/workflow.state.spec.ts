// WorkflowState — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'workflow.state.ts'), 'utf-8');

describe('WorkflowState', () => {
  it('should be injectable with providedIn root', () => {
    expect(src).toContain("providedIn: 'root'");
  });

  it('should export WorkflowState class', () => {
    expect(src).toContain('export class WorkflowState');
  });

  it('should export WorkflowStateSnapshot interface', () => {
    expect(src).toContain('export interface WorkflowStateSnapshot');
  });

  // ── Signal Initialization ──
  it('should have a private _loading signal initialized to false', () => {
    expect(src).toContain('_loading = signal(false)');
  });

  it('should have a private _error signal initialized to null', () => {
    expect(src).toContain('_error = signal<string | null>(null)');
  });

  it('should have a private _selectedWorkflowId signal initialized to null', () => {
    expect(src).toContain('_selectedWorkflowId = signal<string | null>(null)');
  });

  it('should have a private _filterStatus signal initialized to null', () => {
    expect(src).toContain('_filterStatus = signal<string | null>(null)');
  });

  // ── Readonly Signals ──
  it('should expose loading as readonly signal', () => {
    expect(src).toContain('this._loading.asReadonly()');
  });

  it('should expose error as readonly signal', () => {
    expect(src).toContain('this._error.asReadonly()');
  });

  it('should expose selectedWorkflowId as readonly signal', () => {
    expect(src).toContain('this._selectedWorkflowId.asReadonly()');
  });

  it('should expose filterStatus as readonly signal', () => {
    expect(src).toContain('this._filterStatus.asReadonly()');
  });

  // ── Computed Signal ──
  it('should have a computed hasError derived from error signal', () => {
    expect(src).toContain('hasError = computed');
    expect(src).toContain('this._error() !== null');
  });

  // ── State Mutation Methods ──
  it('should have setLoading method', () => {
    expect(src).toContain('setLoading(v: boolean)');
    expect(src).toContain('this._loading.set(v)');
  });

  it('should have setError method', () => {
    expect(src).toContain('setError(v: string | null)');
    expect(src).toContain('this._error.set(v)');
  });

  it('should have selectWorkflow method', () => {
    expect(src).toContain('selectWorkflow(id: string | null)');
    expect(src).toContain('this._selectedWorkflowId.set(id)');
  });

  it('should have setFilterStatus method', () => {
    expect(src).toContain('setFilterStatus(status: string | null)');
    expect(src).toContain('this._filterStatus.set(status)');
  });

  // ── Reset ──
  it('should have reset method that clears all state', () => {
    expect(src).toContain('reset(): void');
    expect(src).toContain('this._loading.set(false)');
    expect(src).toContain('this._error.set(null)');
    expect(src).toContain('this._selectedWorkflowId.set(null)');
    expect(src).toContain('this._filterStatus.set(null)');
  });

  // ── Snapshot interface shape ──
  it('should define loading in WorkflowStateSnapshot', () => {
    expect(src).toMatch(/loading:\s*boolean/);
  });

  it('should define error in WorkflowStateSnapshot', () => {
    expect(src).toMatch(/error:\s*string \| null/);
  });

  it('should define selectedWorkflowId in WorkflowStateSnapshot', () => {
    expect(src).toMatch(/selectedWorkflowId:\s*string \| null/);
  });

  it('should define filterStatus in WorkflowStateSnapshot', () => {
    expect(src).toMatch(/filterStatus:\s*string \| null/);
  });
});
