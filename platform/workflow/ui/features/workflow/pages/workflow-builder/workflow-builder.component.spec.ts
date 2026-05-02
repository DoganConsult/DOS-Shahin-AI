// WorkflowBuilderComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'workflow-builder.component.ts'), 'utf-8');

describe('WorkflowBuilderComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-workflow-builder', () => {
    expect(src).toMatch(/selector:\s*['"]app-workflow-builder['"]/);
  });

  it('should export WorkflowBuilderComponent class', () => {
    expect(src).toContain('export class WorkflowBuilderComponent');
  });

  it('should implement OnInit and OnDestroy', () => {
    expect(src).toContain('implements OnInit, OnDestroy');
  });

  it('should inject I18nService for bilingual support', () => {
    expect(src).toContain('I18nService');
  });

  it('should inject GrcOperationsService for workflow data', () => {
    expect(src).toContain('GrcOperationsService');
  });

  it('should inject ChangeDetectorRef for manual change detection', () => {
    expect(src).toContain('ChangeDetectorRef');
  });

  // ── Canvas rendering ──
  it('should have canvasMode flag for toggling canvas view', () => {
    expect(src).toContain('canvasMode = false');
  });

  it('should have canvasNodes and canvasEdges arrays', () => {
    expect(src).toContain('canvasNodes: WorkflowNode[]');
    expect(src).toContain('canvasEdges: WorkflowEdge[]');
  });

  it('should render WorkflowCanvasComponent when in canvas mode', () => {
    expect(src).toContain('app-workflow-canvas');
    expect(src).toContain('*ngIf="canvasMode');
  });

  it('should have canvas width and height defaults', () => {
    expect(src).toContain('canvasWidth = 1200');
    expect(src).toContain('canvasHeight = 600');
  });

  it('should run validation on canvas nodes', () => {
    expect(src).toContain('runValidation');
    expect(src).toContain('validateWorkflowGraph');
  });

  // ── Node selection ──
  it('should have selectedNodeId for tracking selected node', () => {
    expect(src).toContain('selectedNodeId');
  });

  it('should have onConfigureNode for node configuration', () => {
    expect(src).toContain('onConfigureNode');
    expect(src).toContain('showNodeConfig');
  });

  it('should have deleteNode that filters nodes and edges', () => {
    expect(src).toContain('deleteNode');
    expect(src).toContain('filter(n => n.nodeId !== nodeId)');
    expect(src).toContain('filter(e => e.sourceNodeId !== nodeId');
  });

  // ── Workflow list + CRUD ──
  it('should load workflows on init', () => {
    expect(src).toContain('ngOnInit(): void { this.loadWorkflows()');
  });

  it('should have loadWorkflows calling operationsSvc.getWorkflows()', () => {
    expect(src).toContain('this.operationsSvc.getWorkflows()');
  });

  it('should have create and edit dialog support', () => {
    expect(src).toContain('openCreateDialog');
    expect(src).toContain('openEditDialog');
    expect(src).toContain('showDialog');
  });

  it('should have saveWorkflow handling both create and update', () => {
    expect(src).toContain('saveWorkflow');
    expect(src).toContain('this.operationsSvc.createWorkflow');
  });

  it('should support simulation via simulate method', () => {
    expect(src).toContain('simulate(wf:');
    expect(src).toContain('/simulate');
  });

  // ── Template support ──
  it('should have loadTemplates for creating from template', () => {
    expect(src).toContain('loadTemplates');
    expect(src).toContain('getWorkflowTemplates');
  });

  // ── Canvas save ──
  it('should have saveCanvas that persists canvas to backend', () => {
    expect(src).toContain('saveCanvas');
    expect(src).toContain('serializeCanvas');
  });

  // ── Child components ──
  it('should use PageShellComponent for layout', () => {
    expect(src).toContain('PageShellComponent');
  });

  it('should use PageHeaderComponent with computed actions', () => {
    expect(src).toContain('PageHeaderComponent');
    expect(src).toContain('headerActions');
  });

  it('should import BpmnModelerComponent for BPMN preview', () => {
    expect(src).toContain('BpmnModelerComponent');
  });

  it('should use WorkflowNodeInspectorComponent for node config', () => {
    expect(src).toContain('WorkflowNodeInspectorComponent');
  });

  it('should build node types from WORKFLOW_NODE_TYPES_EXECUTED', () => {
    expect(src).toContain('WORKFLOW_NODE_TYPES_EXECUTED');
    expect(src).toContain('buildNodeTypesFromPackage');
  });
});
