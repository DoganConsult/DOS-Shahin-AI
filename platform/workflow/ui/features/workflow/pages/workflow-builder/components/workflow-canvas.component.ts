import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
  ViewChild, ElementRef, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ButtonModule } from 'primeng/button';
import { IconComponent } from '@app/shared/components/layouts/primitives/icon.component';
import {
  WorkflowNode, WorkflowEdge, NODE_COLORS, NODE_ICONS, uid,
} from '../workflow-builder.types';

/**
 * Presentational component: SVG canvas for visual workflow editing.
 * Handles node drag, edge connection, palette drop, and rendering.
 * All persistence actions are delegated to the parent via @Output events.
 */
@Component({
  selector: 'app-workflow-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonModule, IconComponent],
  template: `
    <div class="canvas-container">
      <!-- Toolbar -->
      <div class="canvas-toolbar">
        <span class="canvas-title">{{ workflowName }}</span>
        <div class="toolbar-palette">
          <div *ngFor="let nt of nodeTypes" class="palette-item"
            [attr.draggable]="true"
            (dragstart)="onPaletteDragStart($event, nt.value)"
            [style.border-color]="getNodeColor(nt.value)">
            <span class="palette-icon" [style.color]="getNodeColor(nt.value)">{{ getNodeIcon(nt.value) }}</span>
            <span class="palette-label">{{ nt.label }}</span>
          </div>
        </div>
        <div class="toolbar-actions">
          <span *ngIf="validationErrors.length" class="validation-msg error">
            <app-icon name="exclamation_triangle" type="ui" size="sm" />
            {{ validationErrors[0] }}
          </span>
          <span *ngIf="!validationErrors.length && nodes.length > 0" class="validation-msg ok">
            <app-icon name="check-circle" type="status" size="sm" />
            {{ i18n.translate('Valid') }}
          </span>
          <p-button [label]="i18n.translate('Save Canvas')" icon="pi pi-save"
            (onClick)="saveCanvas.emit()" [disabled]="validationErrors.length > 0" />
        </div>
      </div>

      <!-- SVG Canvas -->
      <div tabindex="0" role="button" (keyup.enter)="onCanvasClick($event)"
        class="canvas-viewport"
        (dragover)="onCanvasDragOver($event)"
        (drop)="onCanvasDrop($event)"
        (click)="onCanvasClick($event)">
        <svg #canvasSvg class="canvas-svg" [attr.width]="canvasWidth" [attr.height]="canvasHeight">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted, #888)" />
            </marker>
          </defs>
          <!-- Edges -->
          <g *ngFor="let edge of edges">
            <line
              [attr.x1]="getNodeCenter(edge.sourceNodeId).x"
              [attr.y1]="getNodeCenter(edge.sourceNodeId).y"
              [attr.x2]="getNodeCenter(edge.targetNodeId).x"
              [attr.y2]="getNodeCenter(edge.targetNodeId).y"
              stroke="var(--text-muted, #888)" stroke-width="2" marker-end="url(#arrowhead)" />
            <text *ngIf="edge.label"
              [attr.x]="(getNodeCenter(edge.sourceNodeId).x + getNodeCenter(edge.targetNodeId).x) / 2"
              [attr.y]="(getNodeCenter(edge.sourceNodeId).y + getNodeCenter(edge.targetNodeId).y) / 2 - 8"
              text-anchor="middle" fill="var(--text-muted)" font-size="11">{{ edge.label }}</text>
          </g>
          <!-- Connection line while dragging -->
          <line *ngIf="connectingFrom"
            [attr.x1]="getNodeCenter(connectingFrom).x"
            [attr.y1]="getNodeCenter(connectingFrom).y"
            [attr.x2]="connectMouseX" [attr.y2]="connectMouseY"
            stroke="var(--primary, #3b82f6)" stroke-width="2" stroke-dasharray="6,3" />
        </svg>

        <!-- Nodes (HTML overlay for richer interaction) -->
        <div *ngFor="let node of nodes" class="canvas-node"
          [class.selected]="selectedNodeId === node.nodeId"
          [class.connect-source]="connectingFrom === node.nodeId"
          [style.left.px]="node.x" [style.top.px]="node.y"
          [style.border-color]="getNodeColor(node.type)"
          (mousedown)="onNodeMouseDown($event, node)"
          (mouseup)="onNodeMouseUp($event, node)"
          (dblclick)="configureNode.emit(node)">
          <span class="node-icon" [style.background]="getNodeColor(node.type)">{{ getNodeIcon(node.type) }}</span>
          <span class="node-label">{{ node.label }}</span>
          <button class="node-connect-btn" title="Connect"
            (mousedown)="startConnect($event, node.nodeId)">&#10547;</button>
          <button class="node-delete-btn" title="Delete"
            (click)="deleteNode.emit(node.nodeId); $event.stopPropagation()">&times;</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .canvas-container { border: 1px solid var(--border-color, var(--border-subtle)); border-radius: var(--radius, 8px); overflow: hidden; }
    .canvas-toolbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--surface-card, #fff); border-bottom: 1px solid var(--border-color, var(--border-subtle)); flex-wrap: wrap; }
    .canvas-title { font-weight: 600; font-size: var(--font-size-base); color: var(--text-heading); min-width: 120px; }
    .toolbar-palette { display: flex; gap: 6px; flex: 1; }
    .palette-item { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: 2px dashed; border-radius: var(--radius-sm); cursor: grab; font-size: var(--font-size-sm); background: var(--surface-ground, var(--surface-ice)); user-select: none; }
    .palette-item:active { cursor: grabbing; }
    .palette-icon { font-size: var(--font-size-base); }
    .palette-label { font-weight: 500; }
    .toolbar-actions { display: flex; align-items: center; gap: 10px; }
    .validation-msg { font-size: var(--font-size-sm); display: flex; align-items: center; gap: 4px; }
    .validation-msg.error { color: var(--red-600, var(--error)); }
    .validation-msg.ok { color: var(--green-600, var(--success)); }

    .canvas-viewport { position: relative; min-height: 500px; background: var(--surface-ground, var(--surface-ice)); background-image: radial-gradient(circle, var(--border-color, var(--border-subtle)) 1px, transparent 1px); background-size: 20px 20px; overflow: auto; }
    .canvas-svg { position: absolute; top: 0; left: 0; pointer-events: none; }

    .canvas-node { position: absolute; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 2px solid; border-radius: var(--radius); background: var(--surface-card, #fff); cursor: move; user-select: none; box-shadow: var(--shadow-sm); min-width: 100px; z-index: var(--z-base); transition: box-shadow 0.15s; }
    .canvas-node:hover { box-shadow: var(--shadow-sm); }
    .canvas-node.selected { box-shadow: 0 0 0 3px rgba(var(--module-accent-blue-rgb), 0.3); }
    .canvas-node.connect-source { box-shadow: 0 0 0 3px rgba(var(--module-accent-violet-rgb), 0.4); }
    .node-icon { width: 24px; height: 24px; border-radius: var(--radius-pill); color: #fff; display: flex; align-items: center; justify-content: center; font-size: var(--font-size-sm); flex-shrink: 0; }
    .node-label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-heading); white-space: nowrap; }
    .node-connect-btn, .node-delete-btn { position: absolute; width: 18px; height: 18px; border-radius: var(--radius-pill); border: 1px solid var(--border-color, #ccc); background: var(--surface-card, #fff); font-size: var(--font-size-xs); cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; }
    .canvas-node:hover .node-connect-btn, .canvas-node:hover .node-delete-btn { opacity: 1; }
    .node-connect-btn { right: -9px; top: 50%; transform: translateY(-50%); color: var(--primary, var(--primary)); }
    .node-delete-btn { top: -9px; right: -9px; color: var(--red-500, var(--error)); }
  `],
})
export class WorkflowCanvasComponent implements OnDestroy {
  @ViewChild('canvasSvg') canvasSvgRef!: ElementRef<SVGSVGElement>;

  @Input() workflowName = '';
  @Input() nodes: WorkflowNode[] = [];
  @Input() edges: WorkflowEdge[] = [];
  @Input() nodeTypes: { label: string; value: string }[] = [];
  @Input() validationErrors: string[] = [];
  @Input() canvasWidth = 1200;
  @Input() canvasHeight = 600;

  @Output() nodesChange = new EventEmitter<WorkflowNode[]>();
  @Output() edgesChange = new EventEmitter<WorkflowEdge[]>();
  @Output() saveCanvas = new EventEmitter<void>();
  @Output() configureNode = new EventEmitter<WorkflowNode>();
  @Output() deleteNode = new EventEmitter<string>();
  @Output() nodeSelected = new EventEmitter<string | null>();

  selectedNodeId: string | null = null;
  connectingFrom: string | null = null;
  connectMouseX = 0;
  connectMouseY = 0;

  private draggingNodeId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private paletteDragType: string | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private boundConnectMove: ((e: MouseEvent) => void) | null = null;
  private boundConnectUp: ((e: MouseEvent) => void) | null = null;

  constructor(public i18n: I18nService) {}

  ngOnDestroy(): void {
    this.cleanupListeners();
  }

  getNodeColor(type: string): string {
    return NODE_COLORS[type] || '#6b7280';
  }

  getNodeIcon(type: string): string {
    return NODE_ICONS[type] || '\u25CF';
  }

  getNodeCenter(nodeId: string): { x: number; y: number } {
    const node = this.nodes.find(n => n.nodeId === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 60, y: node.y + 20 };
  }

  // -- Palette drag-and-drop --

  onPaletteDragStart(event: DragEvent, type: string): void {
    this.paletteDragType = type;
    event.dataTransfer?.setData('text/plain', type);
  }

  onCanvasDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault();
    const type = this.paletteDragType || event.dataTransfer?.getData('text/plain');
    if (!type) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newNode: WorkflowNode = {
      nodeId: uid(),
      type: type as WorkflowNode['type'],
      label: type.charAt(0).toUpperCase() + type.slice(1),
      x: Math.max(0, x - 50),
      y: Math.max(0, y - 20),
      config: {},
    };

    this.nodesChange.emit([...this.nodes, newNode]);
    this.paletteDragType = null;
    this.configureNode.emit(newNode);
  }

  onCanvasClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('canvas-viewport') ||
        (event.target as HTMLElement).tagName === 'svg') {
      this.selectedNodeId = null;
      this.nodeSelected.emit(null);
    }
  }

  // -- Node dragging --

  onNodeMouseDown(event: MouseEvent, node: WorkflowNode): void {
    if (this.connectingFrom) return;
    event.preventDefault();
    this.selectedNodeId = node.nodeId;
    this.nodeSelected.emit(node.nodeId);
    this.draggingNodeId = node.nodeId;

    const rect = (event.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    this.dragOffsetX = event.clientX - node.x - rect.left;
    this.dragOffsetY = event.clientY - node.y - rect.top;

    this.boundMouseMove = (e: MouseEvent) => this.onDragMove(e);
    this.boundMouseUp = () => this.onDragEnd();
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.draggingNodeId) return;
    const viewport = document.querySelector('.canvas-viewport') as HTMLElement;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const node = this.nodes.find(n => n.nodeId === this.draggingNodeId);
    if (!node) return;

    node.x = Math.max(0, event.clientX - rect.left - this.dragOffsetX);
    node.y = Math.max(0, event.clientY - rect.top - this.dragOffsetY);
    this.nodesChange.emit([...this.nodes]);
  }

  private onDragEnd(): void {
    this.draggingNodeId = null;
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
    this.boundMouseMove = null;
    this.boundMouseUp = null;
  }

  onNodeMouseUp(_event: MouseEvent, node: WorkflowNode): void {
    if (this.connectingFrom && this.connectingFrom !== node.nodeId) {
      this.completeConnection(node.nodeId);
    }
  }

  // -- Node connection --

  startConnect(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.connectingFrom = nodeId;

    const viewport = document.querySelector('.canvas-viewport') as HTMLElement;
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      this.connectMouseX = event.clientX - rect.left;
      this.connectMouseY = event.clientY - rect.top;
    }

    this.boundConnectMove = (e: MouseEvent) => {
      const vp = document.querySelector('.canvas-viewport') as HTMLElement;
      if (!vp) return;
      const r = vp.getBoundingClientRect();
      this.connectMouseX = e.clientX - r.left;
      this.connectMouseY = e.clientY - r.top;
    };
    this.boundConnectUp = () => {
      this.connectingFrom = null;
      if (this.boundConnectMove) document.removeEventListener('mousemove', this.boundConnectMove);
      if (this.boundConnectUp) document.removeEventListener('mouseup', this.boundConnectUp);
      this.boundConnectMove = null;
      this.boundConnectUp = null;
    };

    document.addEventListener('mousemove', this.boundConnectMove);
    document.addEventListener('mouseup', this.boundConnectUp);
  }

  private completeConnection(targetNodeId: string): void {
    if (!this.connectingFrom) return;
    const exists = this.edges.some(
      e => e.sourceNodeId === this.connectingFrom && e.targetNodeId === targetNodeId
    );
    if (!exists) {
      const newEdge: WorkflowEdge = {
        edgeId: uid(),
        sourceNodeId: this.connectingFrom,
        targetNodeId,
      };
      this.edgesChange.emit([...this.edges, newEdge]);
    }

    this.connectingFrom = null;
    if (this.boundConnectMove) document.removeEventListener('mousemove', this.boundConnectMove);
    if (this.boundConnectUp) document.removeEventListener('mouseup', this.boundConnectUp);
    this.boundConnectMove = null;
    this.boundConnectUp = null;
  }

  private cleanupListeners(): void {
    if (this.boundMouseMove) document.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseUp) document.removeEventListener('mouseup', this.boundMouseUp);
    if (this.boundConnectMove) document.removeEventListener('mousemove', this.boundConnectMove);
    if (this.boundConnectUp) document.removeEventListener('mouseup', this.boundConnectUp);
  }
}
