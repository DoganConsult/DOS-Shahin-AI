import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
  ViewChild, ElementRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { WorkflowNode, WorkflowEdge } from '../models/workflow.models';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Presentational component: renders the SVG edge layer, HTML nodes,
 * grid, minimap, connection indicators, and validation overlay.
 * All interaction callbacks delegate to parent via @Output events.
 */
@Component({
    selector: 'app-workflow-designer-canvas',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ButtonModule, TooltipModule],
    template: `
    <!-- Canvas Toolbar -->
    <div class="canvas-toolbar">
      <button aria-label="Zoom In" class="canvas-tool" (click)="zoomIn.emit()" pTooltip="Zoom In"><i class="pi pi-search-plus"></i></button>
      <button aria-label="Zoom Out" class="canvas-tool" (click)="zoomOut.emit()" pTooltip="Zoom Out"><i class="pi pi-search-minus"></i></button>
      <span class="zoom-label">{{ zoomPercent }}%</span>
      <button aria-label="Fit to View" class="canvas-tool" (click)="fitToView.emit()" pTooltip="Fit to View"><i class="pi pi-arrows-alt"></i></button>
      <button aria-label="Auto Layout" class="canvas-tool" (click)="autoLayout.emit()" pTooltip="Auto Layout"><i class="pi pi-th-large"></i></button>
      <span class="toolbar-sep"></span>
      <button aria-label="Snap to Grid" class="canvas-tool" (click)="toggleSnap.emit()" [class.active]="snapToGrid" pTooltip="Snap to Grid"><i class="pi pi-hashtag"></i></button>
      <button aria-label="Minimap" class="canvas-tool" (click)="toggleMinimap.emit()" [class.active]="showMinimap" pTooltip="Minimap"><i class="pi pi-map"></i></button>
      <span class="toolbar-sep"></span>
      <button aria-label="Validate" class="canvas-tool" (click)="validate.emit()" pTooltip="Validate"><i class="pi pi-check-circle"></i></button>
    </div>

    <!-- Connection Mode Indicator -->
    <div class="connection-bar" *ngIf="connectingFrom">
      <i class="pi pi-link"></i>
      Connecting from <strong>{{ connectingFrom.label }}</strong> -- click a target node or
      <p-button [label]="i18n.translate('common.cancel')" [text]="true" size="small" severity="danger" (onClick)="cancelConnect.emit()" />
    </div>

    <!-- Canvas Wrapper -->
    <div class="canvas-wrapper" #canvasEl
      (mousedown)="canvasMouseDown.emit($event)"
      (mousemove)="canvasMouseMove.emit($event)"
      (mouseup)="canvasMouseUp.emit($event)"
      (wheel)="canvasWheel.emit($event)"
      (drop)="canvasDrop.emit($event)"
      (dragover)="canvasDragOver.emit($event)"
      (dragleave)="canvasDragLeave.emit()">

      <div class="canvas-dropzone" [class.drag-active]="isDragOver"></div>

      <div class="canvas-transform"
        [style.transform]="'scale(' + canvasZoom + ') translate(' + canvasPanX + 'px,' + canvasPanY + 'px)'"
        [style.transform-origin]="'0 0'">

        <!-- Grid background -->
        <svg class="canvas-grid" *ngIf="snapToGrid">
          <defs>
            <pattern id="gridPat" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="rgba(var(--color-slate-400-rgb), 0.25)" />
            </pattern>
          </defs>
          <rect width="4000" height="4000" fill="url(#gridPat)" />
        </svg>

        <!-- Nodes -->
        <div tabindex="0" role="button" (keyup.enter)="nodeClick.emit({ event: $event, node: node })"
          *ngFor="let node of nodes; let i = index"
          class="canvas-node" [ngClass]="'node-' + node.type"
          [class.selected]="selectedNodeId === node.id"
          [class.connecting-source]="connectingFrom?.id === node.id"
          [class.role-drop-target]="roleDragOverNodeId === node.id"
          [class.has-role]="!!node.config['assignedRole']"
          [class.has-sla]="!!node.config['slaHours']"
          [style.left.px]="node.x" [style.top.px]="node.y"
          (mousedown)="nodeMouseDown.emit({ event: $event, node: node })"
          (click)="nodeClick.emit({ event: $event, node: node })"
          (drop)="nodeDrop.emit({ event: $event, node: node })"
          (dragover)="nodeDragOver.emit({ event: $event, node: node })"
          (dragleave)="nodeDragLeave.emit()">
          <div class="node-gradient" [ngClass]="'grad-' + node.type"></div>
          <div class="node-content">
            <div class="node-header">
              <i [class]="getNodeIcon(node.type)"></i>
              <span class="node-title">{{ node.label }}</span>
            </div>
            <div class="node-type-label">{{ node.type.replace('_',' ') }}</div>
            <div class="node-role-badge" *ngIf="node.config?.['assignedRole']">
              <i class="pi pi-user"></i> {{ getRoleName(node.config['assignedRole']) }}
              <button aria-label="Close" class="role-remove" (click)="removeRole.emit({ node: node, event: $event })"><i class="pi pi-times"></i></button>
            </div>
            <div class="node-role-drop-hint" *ngIf="!node.config?.['assignedRole'] && dragPayloadType === 'role'">
              <i class="pi pi-user-plus"></i> Drop role here
            </div>
            <div class="node-sla-badge" *ngIf="node.config?.['slaHours']">
              <i class="pi pi-clock"></i> {{ node.config['slaHours'] }}h SLA
            </div>
          </div>
          <span class="node-status-dot" [ngClass]="getNodeStatusClass(node)" [attr.aria-label]="getNodeStatusClass(node) || 'pending'"></span>
          <div tabindex="0" role="button" (keyup.enter)="portClick.emit({ node: node, port: 'in', event: $event })" class="port port-in" (click)="portClick.emit({ node: node, port: 'in', event: $event })" pTooltip="Input"></div>
          <div tabindex="0" role="button" (keyup.enter)="startConnectNode.emit({ node: node, event: $event })" class="port port-out" (click)="startConnectNode.emit({ node: node, event: $event })" pTooltip="Connect"></div>
          <button aria-label="Close" class="node-delete" (click)="removeNode.emit(i); $event.stopPropagation()"><i class="pi pi-times"></i></button>
        </div>

        <!-- SVG Edge Layer -->
        <svg class="edge-layer">
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#0ea5e9" />
            </marker>
            <marker id="arrow-sel" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
            </marker>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.4"/>
              <stop offset="50%" stop-color="#0ea5e9" stop-opacity="1"/>
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.4"/>
            </linearGradient>
          </defs>
          <g *ngFor="let e of edges; let ei = index" class="edge-group">
            <path [attr.d]="getBezierPath(e)"
              fill="none" stroke="url(#edgeGrad)" stroke-width="2.5"
              [attr.marker-end]="selectedEdge === ei ? 'url(#arrow-sel)' : 'url(#arrow)'"
              [class.edge-selected]="selectedEdge === ei"
              class="edge-path" />
            <path [attr.d]="getBezierPath(e)"
              fill="none" stroke="#0ea5e9" stroke-width="2"
              stroke-dasharray="8,6" class="edge-flow-anim" />
            <text *ngIf="e.label"
              [attr.x]="getEdgeMidpoint(e).x"
              [attr.y]="getEdgeMidpoint(e).y - 10"
              class="edge-label-text" text-anchor="middle" fill="#64748b" font-size="11">{{ e.label }}</text>
            <g *ngIf="getEdgeSLA(e) as sla" class="edge-sla-group">
              <rect [attr.x]="getEdgeMidpoint(e).x - 24" [attr.y]="getEdgeMidpoint(e).y + 4"
                width="48" height="16" rx="4" fill="var(--status-warning-bg, #fcf4d6)" stroke="#f59e0b" stroke-width="0.5" />
              <text [attr.x]="getEdgeMidpoint(e).x" [attr.y]="getEdgeMidpoint(e).y + 15"
                text-anchor="middle" fill="#92400e" font-size="9" font-weight="600">{{ sla }}h SLA</text>
            </g>
            <path [attr.d]="getBezierPath(e)"
              fill="none" stroke="transparent" stroke-width="16"
              (click)="selectEdge.emit({ index: ei, event: $event })" style="cursor:pointer" />
          </g>
          <!-- Live connection line while dragging -->
          <line *ngIf="connectingFrom && connectMousePos"
            [attr.x1]="getNodePort(connectingFrom.id, 'out').x"
            [attr.y1]="getNodePort(connectingFrom.id, 'out').y"
            [attr.x2]="connectMousePos.x" [attr.y2]="connectMousePos.y"
            stroke="#22c55e" stroke-width="2" stroke-dasharray="5,4" opacity="0.8" />
        </svg>
      </div>

      <!-- Empty state -->
      <div *ngIf="nodes.length === 0" class="canvas-empty">
        <i class="pi pi-sitemap" style="font-size:48px;color:var(--primary);opacity:0.3"></i>
        <h3>{{ i18n.translate('workflows.canvasEmpty') }}</h3>
        <p>Drag nodes from the palette or click to add</p>
        <div class="shortcut-hints">
          <span><kbd>Ctrl+Z</kbd> Undo</span>
          <span><kbd>Del</kbd> Delete</span>
          <span><kbd>G</kbd> Grid</span>
          <span><kbd>M</kbd> Minimap</span>
          <span><kbd>+/-</kbd> Zoom</span>
          <span><kbd>Esc</kbd> Cancel</span>
        </div>
      </div>

      <!-- Minimap -->
      <div class="minimap" *ngIf="showMinimap && nodes.length > 0">
        <svg [attr.viewBox]="minimapViewBox" preserveAspectRatio="xMidYMid meet">
          <rect *ngFor="let n of nodes"
            [attr.x]="n.x" [attr.y]="n.y" width="40" height="20" rx="3"
            [attr.fill]="getNodeFillColor(n.type)" opacity="0.7" />
          <line *ngFor="let e of edges"
            [attr.x1]="getNodeCenter(e.from).x" [attr.y1]="getNodeCenter(e.from).y"
            [attr.x2]="getNodeCenter(e.to).x" [attr.y2]="getNodeCenter(e.to).y"
            stroke="#94a3b8" stroke-width="1" />
        </svg>
      </div>

      <!-- Validation overlay -->
      <div class="validation-overlay" *ngIf="validationErrors.length > 0">
        <div *ngFor="let err of validationErrors" class="validation-msg">
          <i class="pi pi-exclamation-triangle"></i> {{ err }}
        </div>
        <button aria-label="Close" class="validation-close" (click)="clearValidation.emit()"><i class="pi pi-times"></i></button>
      </div>
    </div>
  `,
    styles: [`
    .canvas-toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-bottom: 8px; flex-wrap: wrap; }
    .canvas-tool { background: none; border: 1px solid transparent; cursor: pointer; padding: 4px 6px; border-radius: var(--radius-xs); color: var(--text-muted); transition: all 0.15s; }
    .canvas-tool:hover { background: var(--surface-hover); color: var(--text-heading); }
    .canvas-tool.active { background: var(--primary-50, #eff6ff); color: var(--primary); border-color: var(--primary-200, #bfdbfe); }
    .zoom-label { font-size: var(--font-size-sm); color: var(--text-muted); min-width: 40px; text-align: center; }
    .toolbar-sep { width: 1px; height: 20px; background: var(--border-subtle); margin: 0 4px; }

    .connection-bar { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--status-info-bg, #edf5ff); border: 1px solid #bae6fd; border-radius: var(--radius-sm); margin-bottom: 8px; font-size: var(--font-size-sm); }

    .canvas-wrapper { position: relative; min-height: 480px; border: 1px solid var(--border-subtle); border-radius: var(--radius); overflow: hidden; background: var(--surface-ground); }
    .canvas-dropzone { position: absolute; inset: 0; pointer-events: none; border: 2px dashed transparent; transition: border-color 0.2s; }
    .canvas-dropzone.drag-active { border-color: var(--primary); background: rgba(var(--module-accent-blue-rgb), 0.05); }

    .canvas-transform { position: relative; min-width: 100%; min-height: 100%; }
    .canvas-grid { position: absolute; top: 0; left: 0; pointer-events: none; width: 4000px; height: 4000px; }

    .canvas-node { position: absolute; min-width: 120px; padding: 8px 12px; border: 2px solid var(--border-subtle); border-radius: var(--radius); background: var(--surface-card); cursor: move; user-select: none; z-index: var(--z-base); transition: box-shadow 0.15s; }
    .canvas-node.selected { box-shadow: 0 0 0 3px rgba(var(--module-accent-blue-rgb), 0.3); }
    .canvas-node.connecting-source { box-shadow: 0 0 0 3px rgba(var(--module-accent-green-rgb), 0.4); }

    .edge-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
    .edge-path { pointer-events: stroke; }
    .edge-group { pointer-events: all; }

    .canvas-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; pointer-events: none; }
    .shortcut-hints { display: flex; gap: 12px; flex-wrap: wrap; font-size: var(--font-size-xs); color: var(--text-muted); }
    .shortcut-hints kbd { background: var(--surface-card); padding: 1px 4px; border: 1px solid var(--border-subtle); border-radius: 3px; font-size: var(--font-size-xs); }

    .minimap { position: absolute; bottom: 12px; right: 12px; width: 160px; height: 100px; background: var(--surface-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; opacity: 0.85; }
    .minimap svg { width: 100%; height: 100%; }

    .validation-overlay { position: absolute; bottom: 12px; left: 12px; background: var(--status-danger-bg, #fff1f1); border: 1px solid #fca5a5; border-radius: var(--radius-sm); padding: 8px 12px; max-width: 360px; }
    .validation-msg { font-size: var(--font-size-sm); color: var(--error); display: flex; align-items: center; gap: 6px; }
    .validation-close { position: absolute; top: 4px; right: 4px; background: none; border: none; cursor: pointer; color: var(--error); }

    .port { position: absolute; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--primary); background: var(--surface-card); cursor: crosshair; z-index: 2; }
    .port-in { left: -6px; top: 50%; transform: translateY(-50%); }
    .port-out { right: -6px; top: 50%; transform: translateY(-50%); }
    .node-delete { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; border-radius: 50%; background: var(--surface-card); border: 1px solid var(--border-subtle); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; font-size: var(--font-size-nano); color: var(--error); }
    .canvas-node:hover .node-delete { opacity: 1; }

    .node-gradient { position: absolute; top: 0; left: 0; width: 4px; height: 100%; border-radius: var(--radius) 0 0 var(--radius); }
    .node-content { display: flex; flex-direction: column; gap: 2px; }
    .node-header { display: flex; align-items: center; gap: 6px; }
    .node-title { font-size: var(--font-size-sm); font-weight: 600; }
    .node-type-label { font-size: var(--font-size-xs); color: var(--text-muted); text-transform: capitalize; }
    .node-role-badge, .node-sla-badge { font-size: var(--font-size-xs); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
    .node-role-badge { color: var(--primary); }
    .node-sla-badge { color: var(--warning); }
    .role-remove { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: var(--font-size-nano); }
    .node-role-drop-hint { font-size: var(--font-size-xs); color: var(--primary); opacity: 0.7; }
    .node-status-dot { position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; }
    .status-complete { background: var(--success); }
    .status-partial { background: var(--warning); }
    .status-empty { background: var(--text-muted); }
    .status-trigger { background: var(--success); }
    .status-end { background: var(--error); }
    .role-drop-target { outline: 2px dashed var(--primary); outline-offset: 2px; }
  `]
})
export class WorkflowDesignerCanvasComponent {
  @Input() nodes: WorkflowNode[] = [];
  @Input() edges: WorkflowEdge[] = [];
  @Input() connectingFrom: WorkflowNode | null = null;
  @Input() connectMousePos: { x: number; y: number } | null = null;
  @Input() selectedNodeId: string | null = null;
  @Input() selectedEdge: number | null = null;
  @Input() canvasZoom = 1;
  @Input() canvasPanX = 0;
  @Input() canvasPanY = 0;
  @Input() snapToGrid = false;
  @Input() showMinimap = false;
  @Input() isDragOver = false;
  @Input() validationErrors: string[] = [];
  @Input() roleDragOverNodeId: string | null = null;
  @Input() dragPayloadType: 'node' | 'role' | null = null;
  @Input() roleOptions: { label: string; value: string }[] = [];
  @Input() nodeTypes: GrcRecord[] = [];
  @Input() minimapViewBox = '0 0 400 300';

  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() fitToView = new EventEmitter<void>();
  @Output() autoLayout = new EventEmitter<void>();
  @Output() toggleSnap = new EventEmitter<void>();
  @Output() toggleMinimap = new EventEmitter<void>();
  @Output() validate = new EventEmitter<void>();
  @Output() cancelConnect = new EventEmitter<void>();
  @Output() clearValidation = new EventEmitter<void>();

  @Output() canvasMouseDown = new EventEmitter<MouseEvent>();
  @Output() canvasMouseMove = new EventEmitter<MouseEvent>();
  @Output() canvasMouseUp = new EventEmitter<MouseEvent>();
  @Output() canvasWheel = new EventEmitter<WheelEvent>();
  @Output() canvasDrop = new EventEmitter<DragEvent>();
  @Output() canvasDragOver = new EventEmitter<DragEvent>();
  @Output() canvasDragLeave = new EventEmitter<void>();

  @Output() nodeMouseDown = new EventEmitter<{ event: MouseEvent; node: WorkflowNode }>();
  @Output() nodeClick = new EventEmitter<{ event: Event; node: WorkflowNode }>();
  @Output() nodeDrop = new EventEmitter<{ event: DragEvent; node: WorkflowNode }>();
  @Output() nodeDragOver = new EventEmitter<{ event: DragEvent; node: WorkflowNode }>();
  @Output() nodeDragLeave = new EventEmitter<void>();
  @Output() removeNode = new EventEmitter<number>();
  @Output() removeRole = new EventEmitter<{ node: WorkflowNode; event: Event }>();
  @Output() portClick = new EventEmitter<{ node: WorkflowNode; port: string; event: Event }>();
  @Output() startConnectNode = new EventEmitter<{ node: WorkflowNode; event: Event }>();
  @Output() selectEdge = new EventEmitter<{ index: number; event: Event }>();

  @ViewChild('canvasEl') canvasEl!: ElementRef;

  readonly i18n = inject(I18nService);

  get zoomPercent(): number {
    return Math.round(this.canvasZoom * 100);
  }

  getNodeIcon(type: string): string {
    const icons: Record<string, string> = {
      trigger: 'pi pi-play', end: 'pi pi-stop', condition: 'pi pi-question-circle',
      action: 'pi pi-bolt', approval: 'pi pi-check-square', governance: 'pi pi-shield',
      escalation: 'pi pi-exclamation-triangle', api_call: 'pi pi-cloud', send_email: 'pi pi-envelope',
      webhook: 'pi pi-link', db_query: 'pi pi-database', notification: 'pi pi-bell',
      create_task: 'pi pi-list', ai_agent: 'pi pi-microchip-ai', delay: 'pi pi-clock',
      loop: 'pi pi-replay', parallel: 'pi pi-arrows-h',
    };
    return icons[type] || 'pi pi-circle';
  }

  getNodeFillColor(type: string): string {
    const colors: Record<string, string> = {
      trigger: '#22c55e', end: '#ef4444', condition: '#f59e0b', action: '#0ea5e9',
      approval: '#8b5cf6', governance: '#6366f1', escalation: '#ef4444',
    };
    return colors[type] || '#94a3b8';
  }

  getNodeStatusClass(node: WorkflowNode): string {
    if (node.type === 'trigger') return 'status-trigger';
    if (node.type === 'end') return 'status-end';
    const hasRole = !!node.config?.['assignedRole'];
    const hasCfg = Object.keys(node.config || {}).some(k => node.config[k]);
    if (hasRole && hasCfg) return 'status-complete';
    if (hasRole || hasCfg) return 'status-partial';
    return 'status-empty';
  }

  getRoleName(roleId: string): string {
    const r = this.roleOptions.find(o => o.value === roleId);
    return r ? r.label : roleId;
  }

  getNodeCenter(id: string): { x: number; y: number } {
    const node = this.nodes.find(n => n.id === id);
    return node ? { x: node.x + 65, y: node.y + 25 } : { x: 0, y: 0 };
  }

  getNodePort(id: string, port: 'in' | 'out'): { x: number; y: number } {
    const node = this.nodes.find(n => n.id === id);
    if (!node) return { x: 0, y: 0 };
    return port === 'out'
      ? { x: node.x + 130, y: node.y + 28 }
      : { x: node.x, y: node.y + 28 };
  }

  getBezierPath(e: WorkflowEdge): string {
    const from = this.getNodePort(e.from, 'out');
    const to = this.getNodePort(e.to, 'in');
    const dx = Math.abs(to.x - from.x) * 0.5;
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  }

  getEdgeMidpoint(e: WorkflowEdge): { x: number; y: number } {
    const from = this.getNodePort(e.from, 'out');
    const to = this.getNodePort(e.to, 'in');
    return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  }

  getEdgeSLA(edge: WorkflowEdge): number | null {
    const targetNode = this.nodes.find(n => n.id === edge.to);
    if (!targetNode) return null;
    const sla = targetNode.config?.['slaHours'];
    return sla ? Number(sla) : null;
  }
}
