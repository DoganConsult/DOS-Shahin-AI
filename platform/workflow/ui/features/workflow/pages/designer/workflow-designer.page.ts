import { Component, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgFor, NgIf } from '@angular/common';
import { WorkflowApiService } from '@app/features/workflow/services/workflow-api.service';

/** Local designer types — not yet in the shared DTO barrel */
type WorkflowNodeDto = { id: string; type: string; x: number; y: number; title: string; [k: string]: any };
type WorkflowEdgeDto = { id: string; source: string; target: string; [k: string]: any };
type WorkflowDefinitionDto = { id?: string; tenantId?: string; workspaceId?: string; name: string; description?: string; isPublished?: boolean; version?: number; graph?: { nodes: WorkflowNodeDto[]; edges: WorkflowEdgeDto[] }; [k: string]: any };
import { devError } from '@app/runtime/utils/dev-logger';
import { ALL_PALETTE_NODE_TYPES } from '../../../../../../packages/shared-workflow-types-grc/src/index';

const NODE_TYPES = [...ALL_PALETTE_NODE_TYPES];
const NODE_DISPLAY_LABELS: Record<string, string> = {
  trigger: 'Trigger', start: 'Start', end: 'End', condition: 'Condition', decision: 'Decision',
  approval: 'Approval', notification: 'Notification', action: 'Action', task: 'Task', governance: 'Governance',
  delay: 'Timer', loop: 'Loop', parallel: 'Parallel',
};

const NODE_COLORS: Record<string, string> = {
  trigger: 'var(--success, #10b981)', start: 'var(--success, #10b981)', end: 'var(--error, #ef4444)',
  condition: 'var(--warning, #f59e0b)', decision: 'var(--warning, #f59e0b)', approval: '#8b5cf6',
  notification: '#06b6d4', action: '#3b82f6', task: '#3b82f6', governance: '#64748b',
  delay: '#06b6d4', loop: '#14b8a6', parallel: '#a855f7',
};

const NODE_ICONS: Record<string, string> = {
  trigger: '▶', start: '▶', end: '■', condition: '◆', decision: '◆', approval: '✓',
  notification: '🔔', action: '⚡', task: '⚡', governance: '🏛', delay: '⏱', loop: '🔄', parallel: '⇄',
};

// ── Pure validation (exported for PBT) ──────────────────────
export function validateWorkflowDesigner(nodes: WorkflowNodeDto[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const starts = nodes.filter(n => n.type === 'Start' || n.type === 'start' || n.type === 'trigger');
  const ends = nodes.filter(n => n.type === 'End' || n.type === 'end');
  if (starts.length !== 1) errors.push(`Expected exactly 1 Start node, found ${starts.length}`);
  if (ends.length < 1) errors.push(`Expected at least 1 End node, found ${ends.length}`);
  return { valid: errors.length === 0, errors };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workflow-designer-page',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] flex flex-col">
      <header class="border-b border-[var(--border)] bg-[var(--bg-1)] px-4 py-2 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Workflow Designer</h1>
        <div class="flex gap-2 items-center">
          <span *ngIf="validationErrors().length" class="text-[var(--error)] text-xs flex items-center gap-1">
            <i class="pi pi-exclamation-triangle"></i> {{ validationErrors()[0] }}
          </span>
          <span *ngIf="!validationErrors().length && nodes().length > 0" class="text-[var(--success)] text-xs flex items-center gap-1">
            <i class="pi pi-check-circle"></i> Valid
          </span>
          <button type="button" (click)="save()" class="px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-sm" [disabled]="validationErrors().length > 0">Save draft</button>
          <button *ngIf="definition()?.id" type="button" (click)="publish()" class="px-3 py-2 rounded-xl bg-[var(--success)] text-white text-sm">Publish</button>
        </div>
      </header>
      <div class="flex flex-1 overflow-hidden">
        <!-- Left: Node palette -->
        <aside class="w-52 border-r border-[var(--border)] bg-[var(--bg-1)] p-3 overflow-y-auto">
          <h2 class="text-sm font-medium text-[var(--text-1)] mb-2">Nodes</h2>
          <div *ngFor="let type of nodeTypes"
            class="mb-2 px-3 py-2 rounded-xl bg-[var(--bg-2)] border text-sm cursor-move flex items-center gap-2"
            [style.border-color]="getNodeColor(type)"
            draggable="true"
            (dragstart)="onPaletteDragStart($event, type)">
            <span class="text-base">{{ getNodeIcon(type) }}</span>
            <span>{{ getNodeLabel(type) }}</span>
          </div>
        </aside>
        <!-- Center: SVG Canvas -->
        <main
          class="flex-1 relative overflow-auto bg-[var(--bg-0)]"
          (drop)="onCanvasDrop($event)"
          (dragover)="$event.preventDefault()"
          (mousemove)="onCanvasMouseMove($event)"
          (mouseup)="onCanvasMouseUp()">
          <svg class="absolute inset-0 w-full h-full pointer-events-none" style="min-height:600px; min-width:800px">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted, #888)" />
              </marker>
            </defs>
            <!-- Edges -->
            <line *ngFor="let edge of edges()"
              [attr.x1]="getNodeCenter(edge.source).x"
              [attr.y1]="getNodeCenter(edge.source).y"
              [attr.x2]="getNodeCenter(edge.target).x"
              [attr.y2]="getNodeCenter(edge.target).y"
              stroke="var(--text-muted, #888)" stroke-width="2" marker-end="url(#arrowhead)" />
            <!-- Connection line while dragging -->
            <line *ngIf="connectingFrom()"
              [attr.x1]="getNodeCenter(connectingFrom()!).x"
              [attr.y1]="getNodeCenter(connectingFrom()!).y"
              [attr.x2]="connectMouseX()" [attr.y2]="connectMouseY()"
              stroke="var(--primary, #3b82f6)" stroke-width="2" stroke-dasharray="6,3" />
          </svg>
          <!-- Nodes (HTML overlay) -->
          <div *ngFor="let node of nodes()"
            class="absolute rounded-xl border-2 px-4 py-2 cursor-move text-sm flex items-center gap-2 select-none"
            [class.ring-2]="selectedNode()?.id === node.id"
            [class.ring-blue-400]="selectedNode()?.id === node.id"
            [style.border-color]="getNodeColor(node.type)"
            [style.left.px]="node.x"
            [style.top.px]="node.y"
            style="background: var(--bg-1); z-index: 10"
            (mousedown)="onNodeMouseDown($event, node)"
            (mouseup)="onNodeMouseUp(node)"
            (click)="selectNode(node)">
            <span class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
              [style.background]="getNodeColor(node.type)">{{ getNodeIcon(node.type) }}</span>
            <span>{{ node.title || node.type }}</span>
            <button class="ml-auto text-xs opacity-50 hover:opacity-100" title="Connect"
              (mousedown)="startConnect($event, node.id)">⤳</button>
            <button class="text-xs opacity-50 hover:opacity-100 text-[var(--error)]" title="Delete"
              (click)="deleteNode(node.id); $event.stopPropagation()">×</button>
          </div>
          <p *ngIf="nodes().length === 0" class="p-8 text-[var(--text-1)] text-sm">Drag nodes from the palette here.</p>
        </main>
        <!-- Right: Properties panel -->
        <aside class="w-72 border-l border-[var(--border)] bg-[var(--bg-1)] p-3 overflow-y-auto">
          <h2 class="text-sm font-medium text-[var(--text-1)] mb-2">Properties</h2>
          <div *ngIf="selectedNode()">
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-[var(--text-1)] mb-1">Title</label>
                <input type="text" class="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 text-sm"
                  [value]="selectedNode()!.title"
                  (input)="updateSelectedTitle($any($event.target).value)" />
              </div>
              <div>
                <label class="block text-xs text-[var(--text-1)] mb-1">Type</label>
                <span class="text-sm px-2 py-1 rounded-lg" [style.background]="getNodeColor(selectedNode()!.type)" style="color:white">
                  {{ selectedNode()!.type }}
                </span>
              </div>
              <div>
                <label class="block text-xs text-[var(--text-1)] mb-1">Position</label>
                <span class="text-xs text-[var(--text-1)]">x: {{ selectedNode()!.x }}, y: {{ selectedNode()!.y }}</span>
              </div>
            </div>
          </div>
          <p *ngIf="!selectedNode()" class="text-xs text-[var(--text-1)]">Select a node to edit.</p>
        </aside>
      </div>
    </div>
  `,
})
export class WorkflowDesignerPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkflowApiService);

  /** Route params as a signal via toSignal() */
  private readonly routeParams = toSignal(this.route.params, { initialValue: {} as Record<string, string> });

  workspaceId = computed(() => this.routeParams()['workspaceId'] ?? '');
  definition = signal<WorkflowDefinitionDto | null>(null);
  nodes = signal<WorkflowNodeDto[]>([]);
  edges = signal<WorkflowEdgeDto[]>([]);
  selectedNode = signal<WorkflowNodeDto | null>(null);
  connectingFrom = signal<string | null>(null);
  connectMouseX = signal(0);
  connectMouseY = signal(0);
  draggingNode = signal<string | null>(null);
  dragOffsetX = 0;
  dragOffsetY = 0;

  nodeTypes = NODE_TYPES;

  validationErrors = computed(() => {
    const result = validateWorkflowDesigner(this.nodes());
    return result.errors;
  });

  constructor() {
    this.loadOrNew();
  }

  getNodeLabel(type: string): string { return NODE_DISPLAY_LABELS[type] ?? (type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')); }
  getNodeColor(type: string): string { return NODE_COLORS[type] || '#6b7280'; }
  getNodeIcon(type: string): string { return NODE_ICONS[type] || '●'; }

  getNodeCenter(nodeId: string): { x: number; y: number } {
    const node = this.nodes().find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    return { x: node.x + 60, y: node.y + 18 };
  }

  private loadOrNew(): void {
    const id = this.route.snapshot.queryParams['id'];
    if (id) {
      (this.api as any).get(id).subscribe({
        next: (d) => { this.definition.set(d); this.nodes.set(d.graph?.nodes ?? []); this.edges.set(d.graph?.edges ?? []); },
        error: () => this.initNew(),
      });
    } else { this.initNew(); }
  }

  private initNew(): void {
    this.definition.set(null);
    this.nodes.set([
      { id: 'start-1', type: 'start', x: 100, y: 100, title: 'Start' },
      { id: 'end-1', type: 'end', x: 100, y: 350, title: 'End' },
    ]);
    this.edges.set([]);
  }

  onPaletteDragStart(e: DragEvent, type: string): void {
    e.dataTransfer?.setData('application/json', JSON.stringify({ type }));
    e.dataTransfer!.effectAllowed = 'copy';
  }

  onCanvasDrop(e: DragEvent): void {
    e.preventDefault();
    const raw = e.dataTransfer?.getData('application/json');
    if (!raw) return;
    try {
      const { type } = JSON.parse(raw);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left - 50;
      const y = e.clientY - rect.top - 20;
      const id = (typeof type === 'string' ? type : 'node').toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      const title = NODE_DISPLAY_LABELS[type] ?? (typeof type === 'string' ? type : 'Node');
      this.nodes.update((list) => [...list, { id, type, title, x, y }]);
    } catch (err) { devError("[drop]", err); }
  }

  // ── Node dragging ──
  onNodeMouseDown(e: MouseEvent, node: WorkflowNodeDto): void {
    if (this.connectingFrom()) return;
    this.draggingNode.set(node.id);
    this.dragOffsetX = e.clientX - node.x;
    this.dragOffsetY = e.clientY - node.y;
    e.preventDefault();
  }

  onCanvasMouseMove(e: MouseEvent): void {
    if (this.connectingFrom()) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.connectMouseX.set(e.clientX - rect.left);
      this.connectMouseY.set(e.clientY - rect.top);
      return;
    }
    const dragId = this.draggingNode();
    if (!dragId) return;
    const newX = e.clientX - this.dragOffsetX;
    const newY = e.clientY - this.dragOffsetY;
    this.nodes.update(list => list.map(n => n.id === dragId ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) } : n));
  }

  onCanvasMouseUp(): void {
    this.draggingNode.set(null);
  }

  // ── Node connections ──
  startConnect(e: MouseEvent, nodeId: string): void {
    e.stopPropagation();
    e.preventDefault();
    this.connectingFrom.set(nodeId);
  }

  onNodeMouseUp(node: WorkflowNodeDto): void {
    const from = this.connectingFrom();
    if (from && from !== node.id) {
      const exists = this.edges().some(e => e.source === from && e.target === node.id);
      if (!exists) {
        this.edges.update(list => [...list, { id: `e-${Date.now()}`, source: from, target: node.id }]);
      }
    }
    this.connectingFrom.set(null);
  }

  selectNode(node: WorkflowNodeDto): void { this.selectedNode.set(node); }

  deleteNode(nodeId: string): void {
    this.nodes.update(list => list.filter(n => n.id !== nodeId));
    this.edges.update(list => list.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (this.selectedNode()?.id === nodeId) this.selectedNode.set(null);
  }

  updateSelectedTitle(title: string): void {
    const n = this.selectedNode();
    if (!n) return;
    this.nodes.update(list => list.map(x => x.id === n.id ? { ...x, title } : x));
    this.selectedNode.set({ ...n, title });
  }

  save(): void {
    const def = this.definition();
    const payload: WorkflowDefinitionDto = {
      id: def?.id, tenantId: undefined,
      workspaceId: this.workspaceId() || undefined,
      name: def?.name ?? 'New workflow',
      description: def?.description,
      isPublished: false,
      version: def?.version ?? 1,
      graph: { nodes: this.nodes(), edges: this.edges() },
    };
    if (def?.id) {
      (this.api as any).update(def.id, payload).subscribe({ next: (d: any) => this.definition.set(d), error: (err: any) => devError(err) });
    } else {
      (this.api as any).create(payload).subscribe({ next: (d: any) => this.definition.set(d), error: (err: any) => devError(err) });
    }
  }

  publish(): void {
    const id = this.definition()?.id;
    if (!id) return;
    (this.api as any).publish(id).subscribe({ next: (d: any) => this.definition.set(d), error: (err: any) => devError(err) });
  }
}
