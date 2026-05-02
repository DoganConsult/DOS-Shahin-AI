import { Component, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgFor } from '@angular/common';
import { devError } from '@app/runtime/utils/dev-logger';
import { WorkflowApiService } from '@app/core/services/platform/config-registry/workflow-api.service';

/** Local designer types — not yet in the shared DTO barrel */
type WorkflowNodeDto = { id: string; type: string; x: number; y: number; title: string; [k: string]: any };
type WorkflowEdgeDto = { id: string; source: string; target: string; [k: string]: any };
type WorkflowGraphDto = { nodes: WorkflowNodeDto[]; edges: WorkflowEdgeDto[] };
type WorkflowDefinitionDto = { id?: string; tenantId?: string; workspaceId?: string; name: string; description?: string; isPublished?: boolean; version?: number; graph?: WorkflowGraphDto; [k: string]: any };
import { ALL_PALETTE_NODE_TYPES } from '../../../../../../packages/shared-workflow-types-grc/src/index';

const NODE_TYPES = [...ALL_PALETTE_NODE_TYPES];
const NODE_DISPLAY_LABELS: Record<string, string> = {
  trigger: 'Trigger', start: 'Start', end: 'End', condition: 'Condition', decision: 'Decision',
  approval: 'Approval', notification: 'Notification', action: 'Action', task: 'Task', governance: 'Governance',
  delay: 'Timer', loop: 'Loop', parallel: 'Parallel',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-workflow-designer-page',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="min-h-screen bg-[var(--bg-0)] text-[var(--text-0)] flex flex-col">
      <header class="border-b border-[var(--border)] bg-[var(--bg-1)] px-4 py-2 flex items-center justify-between">
        <h1 class="text-lg font-semibold">Workflow Designer</h1>
        <div class="flex gap-2">
          <button type="button" (click)="save()" class="px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-sm">Save draft</button>
          @if (definition()?.id) {
            <button type="button" (click)="publish()" class="px-3 py-2 rounded-xl bg-[var(--success)] text-white text-sm">Publish</button>
          }
        </div>
      </header>
      <div class="flex flex-1 overflow-hidden">
        <aside class="w-52 border-r border-[var(--border)] bg-[var(--bg-1)] p-3 overflow-y-auto">
          <h2 class="text-sm font-medium text-[var(--text-1)] mb-2">Nodes</h2>
          @for (type of nodeTypes; track type) {
            <div
              class="mb-2 px-3 py-2 rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-sm cursor-move"
              draggable="true"
              (dragstart)="onPaletteDragStart($event, type)">
              {{ getNodeLabel(type) }}
            </div>
          }
        </aside>
        <main
          class="flex-1 p-4 overflow-auto bg-[var(--bg-0)]"
          (drop)="onCanvasDrop($event)"
          (dragover)="$event.preventDefault()">
          <div class="min-h-[400px] relative">
            @for (node of nodes(); track node.id) {
              <div tabindex="0" role="button" (keyup.enter)="selectNode(node)"
                class="absolute rounded-xl border-2 border-[var(--border)] bg-[var(--bg-1)] px-4 py-2 cursor-move text-sm"
                [style.left.px]="node.x"
                [style.top.px]="node.y"
                (click)="selectNode(node)">
                {{ getNodeLabel(node.type) }}: {{ node.title || node.id }}
              </div>
            }
            @if (nodes().length === 0) {
              <p class="text-[var(--text-1)] text-sm">Drag nodes from the palette here.</p>
            }
          </div>
        </main>
        <aside class="w-72 border-l border-[var(--border)] bg-[var(--bg-1)] p-3 overflow-y-auto">
          <h2 class="text-sm font-medium text-[var(--text-1)] mb-2">Properties</h2>
          @if (selectedNode()) {
            <div class="space-y-2">
              <label class="block text-xs text-[var(--text-1)]">Title</label>
              <input
                type="text"
                class="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 text-sm"
                [value]="selectedNode()!.title"
                (input)="updateSelectedTitle($any($event.target).value)" />
            </div>
          } @else {
            <p class="text-xs text-[var(--text-1)]">Select a node to edit.</p>
          }
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

  nodeTypes = NODE_TYPES;

  getNodeLabel(type: string): string {
    return NODE_DISPLAY_LABELS[type] ?? type;
  }

  constructor() {
    this.loadOrNew();
  }

  private loadOrNew(): void {
    const id = this.route.snapshot.queryParams['id'];
    if (id) {
      (this.api as any).get(id).subscribe({
        next: (d) => {
          this.definition.set(d);
          this.nodes.set(d.graph?.nodes ?? []);
          this.edges.set(d.graph?.edges ?? []);
        },
        error: () => this.initNew(),
      });
    } else {
      this.initNew();
    }
  }

  private initNew(): void {
    this.definition.set(null);
    this.nodes.set([
      { id: 'start-1', type: 'start', title: 'Start', x: 100, y: 100 },
      { id: 'end-1', type: 'end', title: 'End', x: 100, y: 250 },
    ]);
    this.edges.set([]);
  }

  onPaletteDragStart(e: DragEvent, type: string): void {
    e.dataTransfer?.setData('application/json', JSON.stringify({ type, x: 0, y: 0 }));
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
      const id = (typeof type === 'string' ? type : String(type)).replace(/\s+/g, '-') + '-' + Date.now();
      const canonicalType = typeof type === 'string' ? type : String(type);
      this.nodes.update((list) => [...list, { id, type: canonicalType, title: this.getNodeLabel(canonicalType), x, y }]);
    } catch (e) { devError("[catch]", e); }
  }

  selectNode(node: WorkflowNodeDto): void {
    this.selectedNode.set(node);
  }

  updateSelectedTitle(title: string): void {
    const n = this.selectedNode();
    if (!n) return;
    this.nodes.update((list) => list.map((x) => (x.id === n.id ? { ...x, title } : x)));
    this.selectedNode.set({ ...n, title });
  }

  save(): void {
    const def = this.definition();
    const payload: WorkflowDefinitionDto = {
      id: def?.id,
      tenantId: undefined,
      workspaceId: this.workspaceId() || undefined,
      name: def?.name ?? 'New workflow',
      description: def?.description,
      isPublished: false,
      version: def?.version ?? 1,
      graph: { nodes: this.nodes(), edges: this.edges() },
    };
    if (def?.id) {
      (this.api as any).update(def.id, payload).subscribe({
        next: (d) => this.definition.set(d),
        error: (err: unknown) => devError(err),
      });
    } else {
      (this.api as any).create(payload).subscribe({
        next: (d) => this.definition.set(d),
        error: (err: unknown) => devError(err),
      });
    }
  }

  publish(): void {
    const id = this.definition()?.id;
    if (!id) return;
    (this.api as any).publish(id).subscribe({
      next: (d) => this.definition.set(d),
      error: (err: unknown) => devError(err),
    });
  }
}
