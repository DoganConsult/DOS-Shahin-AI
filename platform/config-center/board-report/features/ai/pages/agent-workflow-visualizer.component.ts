import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface DepNode {
  agentCode: string;
  name: string;
  predecessors: string[];
  successors: string[];
  depth: number;
}

interface DepEdge {
  from: string;
  to: string;
}

interface DepGraph {
  nodes: DepNode[];
  edges: DepEdge[];
  executionWaves: string[][];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-agent-workflow-visualizer',
  standalone: true,
  imports: [CommonModule, PageShellComponent, ToastModule, CardModule, TagModule, ButtonModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="sitemap" [title]="i18n.isArabic() ? 'مخطط الاعتمادية' : 'Agent Dependency Graph'" [subtitle]="i18n.isArabic() ? 'تصور اعتمادات الوكلاء وموجات التنفيذ' : 'Visualize agent dependencies & execution waves'" [breadcrumbs]="['Dashboard','AI','Dependency Graph']" [loading]="loading()">

      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--info)">{{ graph()?.nodes?.length || 0 }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'الوكلاء' : 'Agents' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--success)">{{ graph()?.edges?.length || 0 }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'الروابط' : 'Edges' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--warning)">{{ graph()?.executionWaves?.length || 0 }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'الموجات' : 'Waves' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--severity-critical)">{{ rootNodes().length }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'الجذور' : 'Root Agents' }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <div class="mb-4" *ngIf="graph()">
        <h3 class="mb-2">{{ i18n.isArabic() ? 'موجات التنفيذ' : 'Execution Waves' }}</h3>
        <div class="flex flex-column gap-3">
          <div *ngFor="let wave of graph()!.executionWaves; let wi = index" class="flex align-items-center gap-3">
            <div class="flex-shrink-0 text-center font-bold p-2 border-round" style="width: 80px; background: var(--surface-card); border: 1px solid var(--surface-border)">
              {{ i18n.isArabic() ? 'م' : 'W' }}{{ wi }}
            </div>
            <div class="flex-grow-1">
              <div class="flex flex-wrap gap-2">
                <div *ngFor="let code of wave" class="dep-node" [class.dep-root]="isRoot(code)" (click)="selectNode(code)">
                  <strong>{{ code }}</strong>
                  <div class="text-xs" style="color: var(--text-muted)">{{ getNodeName(code) }}</div>
                </div>
              </div>
            </div>
            <div *ngIf="wi < graph()!.executionWaves.length - 1" class="flex-shrink-0" style="color: var(--text-muted)">
              <i class="pi pi-arrow-down"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="grid" *ngIf="graph()">
        <div class="col-12 md:col-6">
          <p-card [header]="i18n.isArabic() ? 'الروابط' : 'Dependency Edges'">
            <div *ngFor="let edge of graph()!.edges" class="flex align-items-center gap-2 py-1 border-bottom-1" style="border-color: var(--surface-border)">
              <p-tag [value]="edge.from" severity="info" />
              <i class="pi pi-arrow-right" style="color: var(--text-muted)"></i>
              <p-tag [value]="edge.to" severity="success" />
            </div>
            <div *ngIf="graph()!.edges.length === 0" class="text-center p-3" style="color: var(--text-muted)">
              {{ i18n.isArabic() ? 'لا توجد روابط' : 'No dependency edges' }}
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6">
          <p-card [header]="selectedNode() ? (selectedNode()!.agentCode + ' — ' + selectedNode()!.name) : (i18n.isArabic() ? 'تفاصيل الوكيل' : 'Agent Detail')">
            <div *ngIf="selectedNode()" class="flex flex-column gap-2">
              <div><strong>{{ i18n.isArabic() ? 'العمق' : 'Depth' }}:</strong> {{ selectedNode()!.depth }}</div>
              <div>
                <strong>{{ i18n.isArabic() ? 'المتطلبات' : 'Predecessors' }}:</strong>
                <span *ngIf="selectedNode()!.predecessors.length === 0" style="color: var(--text-muted)"> {{ i18n.isArabic() ? 'لا يوجد' : 'None (root)' }}</span>
                <p-tag *ngFor="let p of selectedNode()!.predecessors" [value]="p" severity="warning" styleClass="ml-1" />
              </div>
              <div>
                <strong>{{ i18n.isArabic() ? 'التابعون' : 'Successors' }}:</strong>
                <span *ngIf="selectedNode()!.successors.length === 0" style="color: var(--text-muted)"> {{ i18n.isArabic() ? 'لا يوجد' : 'None (leaf)' }}</span>
                <p-tag *ngFor="let s of selectedNode()!.successors" [value]="s" severity="success" styleClass="ml-1" />
              </div>
            </div>
            <div *ngIf="!selectedNode()" class="text-center p-3" style="color: var(--text-muted)">
              {{ i18n.isArabic() ? 'انقر على وكيل لعرض تفاصيله' : 'Click an agent node to view details' }}
            </div>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `,
  styles: [`
    .dep-node {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      background: var(--surface-card);
      border: 2px solid var(--surface-border);
      cursor: pointer;
      transition: border-color 0.2s;
      text-align: center;
      min-width: 80px;
    }
    .dep-node:hover { border-color: var(--primary-color); }
    .dep-root { border-color: var(--success); background: var(--green-50, var(--surface-card)); }
  `],
})
export class AgentWorkflowVisualizerComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly graph = signal<DepGraph | null>(null);
  readonly selectedNode = signal<DepNode | null>(null);

  readonly rootNodes = signal<string[]>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/workflows/dependencies`).subscribe({
      next: (res) => {
        const g: DepGraph = res?.data || { nodes: [], edges: [], executionWaves: [] };
        this.graph.set(g);
        this.rootNodes.set(g.nodes.filter(n => n.depth === 0).map(n => n.agentCode));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load dependency graph' });
      },
    });
  }

  isRoot(code: string): boolean {
    return this.rootNodes().includes(code);
  }

  getNodeName(code: string): string {
    return this.graph()?.nodes.find(n => n.agentCode === code)?.name || code;
  }

  selectNode(code: string): void {
    const node = this.graph()?.nodes.find(n => n.agentCode === code) || null;
    this.selectedNode.set(node);
  }
}
