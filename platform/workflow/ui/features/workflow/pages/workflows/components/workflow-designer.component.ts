import {
  Component, ChangeDetectionStrategy, inject, input, output, ViewChild,
  ElementRef, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { WorkflowNode, WorkflowEdge } from '../models/workflow.models';
import { buildNodeTypesFromPackage } from '../models/node-palette';
import { WorkflowDesignerPaletteComponent } from './workflow-designer-palette.component';
import { WorkflowDesignerConfigPanelComponent } from './workflow-designer-config-panel.component';
import { WorkflowDesignerCanvasComponent } from './workflow-designer-canvas.component';
import { GrcRecord } from '@app/core/models/shared.types';

/**
 * Visual workflow designer -- orchestrator component.
 *
 * Delegates rendering to three child presentational components:
 * - WorkflowDesignerPaletteComponent (node type palette + role drag sources)
 * - WorkflowDesignerCanvasComponent (SVG canvas, nodes, edges, minimap, validation)
 * - WorkflowDesignerConfigPanelComponent (node/edge configuration sidebar)
 *
 * This component retains the interaction logic (drag, undo/redo, keyboard shortcuts,
 * zoom/pan state) and coordinates data flow between children.
 */
@Component({
    selector: 'app-workflow-designer',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule, FormsModule,
        ButtonModule, InputTextModule, DropdownModule,
        ToolbarModule, TooltipModule,
        WorkflowDesignerPaletteComponent,
        WorkflowDesignerConfigPanelComponent,
        WorkflowDesignerCanvasComponent,
    ],
    styleUrls: ['../workflows.component.scss'],
    template: `
    <p-toolbar styleClass="mb-3">
      <ng-template pTemplate="start">
        <input pInputText [(ngModel)]="designerWf.name" [placeholder]="i18n.translate('common.name')" [attr.aria-label]="i18n.translate('common.name')" style="max-width:220px" />
        <p-dropdown [(ngModel)]="designerWf.trigger_type" [options]="triggerOptions"
                    optionLabel="label" optionValue="value"
                    [style]="{'min-width': '150px', 'margin-inline-start': '8px'}" />
        <input pInputText [(ngModel)]="designerWf.description" [placeholder]="i18n.translate('common.description')" [attr.aria-label]="i18n.translate('common.description')" class="ms-2" style="max-width:200px" />
      </ng-template>
      <ng-template pTemplate="end">
        <p-button icon="pi pi-undo" pTooltip="Undo" [text]="true" (onClick)="undo()" [disabled]="undoStack.length===0" />
        <p-button icon="pi pi-refresh" pTooltip="Redo" [text]="true" (onClick)="redo()" [disabled]="redoStack.length===0" />
        <p-button icon="pi pi-eraser" pTooltip="Clear canvas" [text]="true" severity="danger" (onClick)="clearCanvas()" />
        <p-button icon="pi pi-download" pTooltip="Export JSON" [text]="true" (onClick)="exportDesigner()" />
        <p-button icon="pi pi-upload" pTooltip="Import JSON" [text]="true" (onClick)="importDesigner()" />
        <p-button [label]="i18n.translate('common.save')" icon="pi pi-save" (onClick)="onSave()" />
      </ng-template>
    </p-toolbar>

    <!-- Node Palette (child component) -->
    <app-workflow-designer-palette
      [nodeTypes]="nodeTypes"
      [roleOptions]="roleOptions()"
      (nodeClicked)="addNode($event)"
      (paletteDragStart)="onPaletteDragStart($event.event, $event.nodeType)"
      (roleDragStart)="onRoleDragStart($event.event, $event.role)" />

    <!-- Canvas + Config Panel layout -->
    <div class="designer-layout">
      <!-- Canvas (child component) -->
      <app-workflow-designer-canvas
        [nodes]="designerNodes"
        [edges]="designerEdges"
        [connectingFrom]="connectingFrom"
        [connectMousePos]="connectMousePos"
        [selectedNodeId]="selectedNode?.id || null"
        [selectedEdge]="selectedEdge"
        [canvasZoom]="canvasZoom"
        [canvasPanX]="canvasPanX"
        [canvasPanY]="canvasPanY"
        [snapToGrid]="snapToGrid"
        [showMinimap]="showMinimap"
        [isDragOver]="canvasDragOver"
        [validationErrors]="validationErrors"
        [roleDragOverNodeId]="roleDragOverNodeId"
        [dragPayloadType]="dragPayloadType"
        [roleOptions]="roleOptions()"
        [nodeTypes]="nodeTypes"
        [minimapViewBox]="getMinimapViewBox()"
        (zoomIn)="zoomIn()"
        (zoomOut)="zoomOut()"
        (fitToView)="fitToView()"
        (autoLayout)="autoLayout()"
        (toggleSnap)="toggleSnap()"
        (toggleMinimap)="toggleMinimap()"
        (validate)="validateGraph()"
        (cancelConnect)="connectingFrom = null"
        (clearValidation)="validationErrors = []"
        (canvasMouseDown)="onCanvasMouseDown($event)"
        (canvasMouseMove)="onCanvasMouseMove($event)"
        (canvasMouseUp)="onCanvasMouseUp($event)"
        (canvasWheel)="onCanvasWheel($event)"
        (canvasDrop)="onCanvasDrop($event)"
        (canvasDragOver)="onCanvasDragOver($event)"
        (canvasDragLeave)="canvasDragOver = false"
        (nodeMouseDown)="onNodeMouseDown($event.event, $event.node)"
        (nodeClick)="onNodeClick($event.event, $event.node)"
        (nodeDrop)="onNodeDrop($event.event, $event.node)"
        (nodeDragOver)="onNodeDragOver($event.event, $event.node)"
        (nodeDragLeave)="roleDragOverNodeId = null"
        (removeNode)="removeNode($event)"
        (removeRole)="removeRole($event.node, $event.event)"
        (portClick)="onPortClick($event.node, $event.port, $event.event)"
        (startConnectNode)="startConnect($event.node, $event.event)"
        (selectEdge)="selectEdge($event.index, $event.event)" />

      <!-- Node/Edge Config Panel (child component) -->
      <app-workflow-designer-config-panel
        [selectedNode]="selectedNode"
        [selectedEdgeIndex]="selectedEdge"
        [edges]="designerEdges"
        [roleOptions]="roleOptions()"
        [teamMemberOptions]="teamMemberOptions()"
        [approverOptions]="approverOptions()"
        (closeNode)="selectedNode = null"
        (closeEdge)="selectedEdge = null"
        (deleteEdge)="deleteEdge()" />
    </div>
  `
})
export class WorkflowDesignerComponent {
  @ViewChild('canvasEl') canvasEl!: ElementRef;

  roleOptions = input<{ label: string; value: string }[]>([]);
  teamMemberOptions = input<{ label: string; value: string }[]>([]);
  approverOptions = input<{ label: string; value: string }[]>([]);
  saved = output<{ designerWf: GrcRecord; nodes: WorkflowNode[]; edges: WorkflowEdge[] }>();

  i18n = inject(I18nService);
  private messageService = inject(MessageService);
  private confirmService = inject(ConfirmationService);

  designerWf: GrcRecord = { name: '', trigger_type: 'manual', description: '' };
  designerNodes: WorkflowNode[] = [];
  designerEdges: WorkflowEdge[] = [];
  nodeCounter = 0;
  selectedNode: WorkflowNode | null = null;
  selectedEdge: number | null = null;
  connectingFrom: WorkflowNode | null = null;

  private draggingNode: WorkflowNode | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  undoStack: string[] = [];
  redoStack: string[] = [];

  canvasZoom = 1;
  canvasPanX = 0;
  canvasPanY = 0;
  snapToGrid = false;
  showMinimap = false;
  canvasDragOver = false;
  validationErrors: string[] = [];
  connectMousePos: { x: number; y: number } | null = null;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  dragPayloadType: 'node' | 'role' | null = null;
  dragPayloadData: GrcRecord | null = null;
  roleDragOverNodeId: string | null = null;

  nodeTypes = buildNodeTypesFromPackage();
  triggerOptions = [
    { label: 'Manual', value: 'manual' }, { label: 'Scheduled', value: 'scheduled' },
    { label: 'Event-based', value: 'event' }, { label: 'Webhook', value: 'webhook' },
  ];

  // ---- Public API for parent ----

  loadWorkflow(wf: GrcRecord): void {
    this.designerWf = { ...wf };
    this.designerNodes = (wf.definition?.nodes || []).map((n: WorkflowNode) => ({ ...n, config: n.config || {} }));
    this.designerEdges = wf.definition?.edges || [];
    this.nodeCounter = this.designerNodes.length;
    this.selectedNode = null; this.selectedEdge = null; this.undoStack = []; this.redoStack = [];
  }

  reset(): void {
    this.designerWf = { name: '', trigger_type: 'manual', description: '' };
    this.designerNodes = []; this.designerEdges = []; this.nodeCounter = 0;
    this.selectedNode = null; this.selectedEdge = null; this.undoStack = []; this.redoStack = [];
  }

  // ---- Palette ----

  addNode(nt: GrcRecord): void {
    this.pushUndo();
    const id = `node_${++this.nodeCounter}`;
    const x = 40 + (this.designerNodes.length % 5) * 170;
    const y = 40 + Math.floor(this.designerNodes.length / 5) * 110;
    this.designerNodes.push({ id, type: nt.type, label: `${nt.label} ${this.nodeCounter}`, config: {}, x, y });
    if (this.designerNodes.length > 1) {
      const prev = this.designerNodes[this.designerNodes.length - 2];
      this.designerEdges.push({ from: prev.id, to: id });
    }
  }

  removeNode(i: number): void {
    this.pushUndo();
    const node = this.designerNodes[i];
    this.designerNodes.splice(i, 1);
    this.designerEdges = this.designerEdges.filter(e => e.from !== node.id && e.to !== node.id);
    if (this.selectedNode?.id === node.id) this.selectedNode = null;
  }

  onSave(): void {
    if (!this.designerWf.name) {
      this.messageService.add({ severity: 'warning', summary: this.i18n.translate('common.warning'), detail: this.i18n.translate('common.pleaseEnterWorkflowName'), life: 3000 });
      return;
    }
    this.saved.emit({ designerWf: this.designerWf, nodes: this.designerNodes, edges: this.designerEdges });
  }

  // ---- Node Interaction ----

  onNodeClick(event: Event, node: WorkflowNode): void {
    event.stopPropagation();
    if (this.connectingFrom && this.connectingFrom.id !== node.id) {
      if (!this.designerEdges.some(e => e.from === this.connectingFrom!.id && e.to === node.id)) {
        this.pushUndo();
        this.designerEdges.push({ from: this.connectingFrom.id, to: node.id });
      }
      this.connectingFrom = null; return;
    }
    this.selectedNode = node; this.selectedEdge = null;
  }

  startConnect(node: WorkflowNode, event: Event): void { event.stopPropagation(); this.connectingFrom = node; }
  selectEdge(index: number, event: Event): void { event.stopPropagation(); this.selectedEdge = index; this.selectedNode = null; }
  deleteEdge(): void { if (this.selectedEdge !== null) { this.pushUndo(); this.designerEdges.splice(this.selectedEdge, 1); this.selectedEdge = null; } }

  // ---- Drag & Drop ----

  onNodeMouseDown(event: MouseEvent, node: WorkflowNode): void {
    if ((event.target as HTMLElement).closest('.node-delete') || (event.target as HTMLElement).closest('.port')) return;
    this.draggingNode = node;
    const canvasRect = this.canvasEl?.nativeElement?.getBoundingClientRect();
    if (canvasRect) {
      this.dragOffsetX = (event.clientX - canvasRect.left) / this.canvasZoom - this.canvasPanX - node.x;
      this.dragOffsetY = (event.clientY - canvasRect.top) / this.canvasZoom - this.canvasPanY - node.y;
    }
    event.preventDefault();
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('.canvas-node') && !(event.target as HTMLElement).closest('.port')) {
      this.selectedNode = null; this.selectedEdge = null;
      if (this.connectingFrom) { this.connectingFrom = null; this.connectMousePos = null; }
      if (event.button === 1 || (!this.draggingNode && event.button === 0)) {
        this.isPanning = true;
        this.panStartX = event.clientX - this.canvasPanX * this.canvasZoom;
        this.panStartY = event.clientY - this.canvasPanY * this.canvasZoom;
      }
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.connectingFrom) {
      const rect = this.canvasEl?.nativeElement?.getBoundingClientRect();
      if (rect) { this.connectMousePos = { x: (event.clientX - rect.left) / this.canvasZoom - this.canvasPanX, y: (event.clientY - rect.top) / this.canvasZoom - this.canvasPanY }; }
    }
    if (this.isPanning) { this.canvasPanX = (event.clientX - this.panStartX) / this.canvasZoom; this.canvasPanY = (event.clientY - this.panStartY) / this.canvasZoom; return; }
    if (!this.draggingNode) return;
    const canvasRect = this.canvasEl?.nativeElement?.getBoundingClientRect();
    if (!canvasRect) return;
    let x = (event.clientX - canvasRect.left) / this.canvasZoom - this.canvasPanX - this.dragOffsetX;
    let y = (event.clientY - canvasRect.top) / this.canvasZoom - this.canvasPanY - this.dragOffsetY;
    x = Math.max(0, x); y = Math.max(0, y);
    if (this.snapToGrid) { x = Math.round(x / 20) * 20; y = Math.round(y / 20) * 20; }
    this.draggingNode.x = x; this.draggingNode.y = y;
  }

  onCanvasMouseUp(_event: MouseEvent): void { if (this.draggingNode) { this.pushUndo(); this.draggingNode = null; } this.isPanning = false; }

  // ---- Undo / Redo ----

  private pushUndo(): void { this.undoStack.push(JSON.stringify({ nodes: this.designerNodes, edges: this.designerEdges })); this.redoStack = []; if (this.undoStack.length > 50) this.undoStack.shift(); }
  undo(): void { if (this.undoStack.length === 0) return; this.redoStack.push(JSON.stringify({ nodes: this.designerNodes, edges: this.designerEdges })); const s = JSON.parse(this.undoStack.pop()!); this.designerNodes = s.nodes; this.designerEdges = s.edges; this.selectedNode = null; this.selectedEdge = null; }
  redo(): void { if (this.redoStack.length === 0) return; this.undoStack.push(JSON.stringify({ nodes: this.designerNodes, edges: this.designerEdges })); const s = JSON.parse(this.redoStack.pop()!); this.designerNodes = s.nodes; this.designerEdges = s.edges; this.selectedNode = null; this.selectedEdge = null; }

  clearCanvas(): void {
    this.confirmService.confirm({ message: 'Clear all nodes and edges?', accept: () => { this.pushUndo(); this.designerNodes = []; this.designerEdges = []; this.nodeCounter = 0; this.selectedNode = null; this.selectedEdge = null; } });
  }

  // ---- Zoom & Pan ----

  zoomIn(): void { this.canvasZoom = Math.min(2, this.canvasZoom + 0.1); }
  zoomOut(): void { this.canvasZoom = Math.max(0.3, this.canvasZoom - 0.1); }
  onCanvasWheel(event: WheelEvent): void { event.preventDefault(); this.canvasZoom = Math.max(0.3, Math.min(2, this.canvasZoom + (event.deltaY > 0 ? -0.05 : 0.05))); }

  fitToView(): void {
    if (this.designerNodes.length === 0) return;
    const xs = this.designerNodes.map(n => n.x); const ys = this.designerNodes.map(n => n.y);
    const w = (Math.max(...xs) + 140 - Math.min(...xs)) || 400; const h = (Math.max(...ys) + 60 - Math.min(...ys)) || 300;
    const cW = this.canvasEl?.nativeElement?.clientWidth || 800; const cH = this.canvasEl?.nativeElement?.clientHeight || 500;
    this.canvasZoom = Math.min(cW / (w + 80), cH / (h + 80), 1.5);
    this.canvasPanX = -Math.min(...xs) + 40; this.canvasPanY = -Math.min(...ys) + 40;
  }

  toggleSnap(): void { this.snapToGrid = !this.snapToGrid; }
  toggleMinimap(): void { this.showMinimap = !this.showMinimap; }

  // ---- Palette Drag & Drop ----

  onPaletteDragStart(event: DragEvent, nt: GrcRecord): void { this.dragPayloadType = 'node'; this.dragPayloadData = nt; event.dataTransfer?.setData('text/plain', JSON.stringify({ type: 'node', data: nt })); }
  onRoleDragStart(event: DragEvent, role: GrcRecord): void { this.dragPayloadType = 'role'; this.dragPayloadData = role; event.dataTransfer?.setData('text/plain', JSON.stringify({ type: 'role', data: role })); }
  onCanvasDragOver(event: DragEvent): void { event.preventDefault(); this.canvasDragOver = true; }

  onCanvasDrop(event: DragEvent): void {
    event.preventDefault(); this.canvasDragOver = false;
    const rect = this.canvasEl?.nativeElement?.getBoundingClientRect(); if (!rect) return;
    const x = (event.clientX - rect.left) / this.canvasZoom - this.canvasPanX;
    const y = (event.clientY - rect.top) / this.canvasZoom - this.canvasPanY;
    const sx = this.snapToGrid ? Math.round(x / 20) * 20 : x; const sy = this.snapToGrid ? Math.round(y / 20) * 20 : y;
    if (this.dragPayloadType === 'node' && this.dragPayloadData) {
      this.pushUndo(); const id = `node_${++this.nodeCounter}`;
      this.designerNodes.push({ id, type: this.dragPayloadData.type, label: `${this.dragPayloadData.label} ${this.nodeCounter}`, config: {}, x: sx, y: sy });
    }
    this.dragPayloadType = null; this.dragPayloadData = null;
  }

  onNodeDragOver(event: DragEvent, node: WorkflowNode): void { event.preventDefault(); event.stopPropagation(); if (this.dragPayloadType === 'role') this.roleDragOverNodeId = node.id; }

  onNodeDrop(event: DragEvent, node: WorkflowNode): void {
    event.preventDefault(); event.stopPropagation(); this.canvasDragOver = false; this.roleDragOverNodeId = null;
    if (this.dragPayloadType === 'role' && this.dragPayloadData) {
      this.pushUndo(); node.config['assignedRole'] = this.dragPayloadData.value;
      this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.roleAssigned'), detail: `${this.dragPayloadData.label} \u2192 ${node.label}`, life: 2500 });
    }
    this.dragPayloadType = null; this.dragPayloadData = null;
  }

  removeRole(node: WorkflowNode, event: Event): void { event.stopPropagation(); this.pushUndo(); delete node.config['assignedRole']; }

  onPortClick(node: WorkflowNode, port: string, event: Event): void {
    event.stopPropagation();
    if (port === 'in' && this.connectingFrom && this.connectingFrom.id !== node.id) {
      if (!this.designerEdges.some(e => e.from === this.connectingFrom!.id && e.to === node.id)) { this.pushUndo(); this.designerEdges.push({ from: this.connectingFrom.id, to: node.id }); }
      this.connectingFrom = null;
    }
  }

  // ---- Helpers ----

  getMinimapViewBox(): string {
    if (this.designerNodes.length === 0) return '0 0 400 300';
    const xs = this.designerNodes.map(n => n.x); const ys = this.designerNodes.map(n => n.y);
    return `${Math.min(...xs) - 30} ${Math.min(...ys) - 30} ${Math.max(...xs) + 160} ${Math.max(...ys) + 80}`;
  }

  // ---- Auto-layout (topological sort) ----

  autoLayout(): void {
    if (this.designerNodes.length === 0) return;
    this.pushUndo();
    const idToNode = new Map(this.designerNodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>(); const adj = new Map<string, string[]>();
    this.designerNodes.forEach(n => { inDegree.set(n.id, 0); adj.set(n.id, []); });
    this.designerEdges.forEach(e => { adj.get(e.from)?.push(e.to); inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1); });
    const queue: string[] = []; inDegree.forEach((d, id) => { if (d === 0) queue.push(id); });
    const sorted: string[] = [];
    while (queue.length > 0) { const id = queue.shift()!; sorted.push(id); for (const next of (adj.get(id) || [])) { const d = (inDegree.get(next) || 0) - 1; inDegree.set(next, d); if (d === 0) queue.push(next); } }
    this.designerNodes.forEach(n => { if (!sorted.includes(n.id)) sorted.push(n.id); });
    const layers = new Map<string, number>();
    sorted.forEach(id => { const parents = this.designerEdges.filter(e => e.to === id).map(e => e.from); layers.set(id, parents.length > 0 ? Math.max(...parents.map(p => layers.get(p) || 0)) + 1 : 0); });
    const buckets = new Map<number, string[]>();
    layers.forEach((l, id) => { if (!buckets.has(l)) buckets.set(l, []); buckets.get(l)!.push(id); });
    buckets.forEach((ids, l) => { ids.forEach((id, idx) => { const n = idToNode.get(id); if (n) { n.x = 80 + l * 220; n.y = 60 + idx * 110; } }); });
    this.fitToView();
  }

  // ---- Keyboard Shortcuts ----

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) { event.preventDefault(); this.undo(); }
    else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) { event.preventDefault(); this.redo(); }
    else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (this.selectedNode) { const idx = this.designerNodes.findIndex(n => n.id === this.selectedNode!.id); if (idx >= 0) this.removeNode(idx); }
      else if (this.selectedEdge !== null) this.deleteEdge();
    }
    else if (event.key === 'Escape') { this.selectedNode = null; this.selectedEdge = null; this.connectingFrom = null; this.connectMousePos = null; }
    else if (event.key === '+' || event.key === '=') this.zoomIn();
    else if (event.key === '-') this.zoomOut();
    else if (event.key === '0' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); this.canvasZoom = 1; this.canvasPanX = 0; this.canvasPanY = 0; }
    else if (event.key === 'g') this.toggleSnap();
    else if (event.key === 'm') this.toggleMinimap();
  }

  // ---- Export / Import ----

  exportDesigner(): void {
    const data = { name: this.designerWf.name, trigger_type: this.designerWf.trigger_type, description: this.designerWf.description, nodes: this.designerNodes, edges: this.designerEdges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `workflow-${this.designerWf.name || 'draft'}.json`; a.click(); URL.revokeObjectURL(url);
  }

  importDesigner(): void {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = (e: GrcRecord) => {
      const file = e.target?.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev: GrcRecord) => {
        try {
          const data = JSON.parse(ev.target.result); this.pushUndo();
          if (data.name) this.designerWf.name = data.name;
          if (data.trigger_type) this.designerWf.trigger_type = data.trigger_type;
          if (data.description) this.designerWf.description = data.description;
          this.designerNodes = data.nodes || []; this.designerEdges = data.edges || []; this.nodeCounter = this.designerNodes.length;
          this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.imported'), detail: this.i18n.translate('common.workflowImportedSuccessfully'), life: 3000 });
        } catch { this.messageService.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('common.invalidWorkflowJson'), life: 4000 }); }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ---- Validation ----

  validateGraph(): void {
    const errors: string[] = [];
    const triggers = this.designerNodes.filter(n => n.type === 'trigger');
    const ends = this.designerNodes.filter(n => n.type === 'end');
    if (triggers.length === 0) errors.push('Missing trigger node');
    if (triggers.length > 1) errors.push('Multiple trigger nodes found');
    if (ends.length === 0) errors.push('Missing end node');
    const connected = new Set([...this.designerEdges.map(e => e.from), ...this.designerEdges.map(e => e.to)]);
    const orphans = this.designerNodes.filter(n => !connected.has(n.id) && this.designerNodes.length > 1);
    if (orphans.length > 0) errors.push(`${orphans.length} orphan node(s) not connected`);
    this.validationErrors = errors;
    if (errors.length === 0) this.messageService.add({ severity: 'success', summary: this.i18n.translate('common.valid'), detail: this.i18n.translate('common.workflowGraphValid'), life: 3000 });
  }
}
