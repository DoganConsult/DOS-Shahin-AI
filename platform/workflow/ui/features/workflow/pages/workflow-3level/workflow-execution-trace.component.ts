import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { GraphExplorerComponent, GraphExplorerNode, GraphExplorerEdge } from '@app/shared/graph-explorer/graph-explorer.component';
import { Workflow3LevelApiService } from '../../services/workflow-3level-api.service';
import type { ExecutionTraceDto, TraceEventDto, NextBestActionDto } from '../../services/workflow-3level-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-execution-trace',
    imports: [CommonModule, FormsModule, PageHeaderComponent, EmptyStateComponent, SkeletonLoaderComponent,
        TagModule, ButtonModule, CardModule, InputTextModule, DropdownModule, TooltipModule, ToastModule, DialogModule, GraphExplorerComponent],
    providers: [MessageService],
    template: `
    <p-toast />
    <app-page-header
      titleEn="Execution Trace" titleAr="تتبع التنفيذ"
      subtitleEn="L3 Runtime Trace — Step-by-step execution visibility with AI actions, interventions & rollbacks"
      subtitleAr="تتبع التنفيذ L3 — رؤية تنفيذ خطوة بخطوة مع إجراءات الذكاء الاصطناعي والتدخلات والتراجعات"
      icon="sitemap" [breadcrumbs]="['Workflows', 'Execution Trace']"
      [isAr]="i18n.currentLang()==='ar'" [dir]="i18n.direction()" />

    <div class="et-body" [dir]="i18n.direction()">
      <div class="et-search">
        <span class="p-input-icon-left w-full" style="max-width:500px">
          <i class="pi pi-search"></i>
          <input pInputText [(ngModel)]="instanceIdInput" placeholder="Enter Workflow Instance ID..." class="w-full"
            (keyup.enter)="loadTrace(instanceIdInput)" />
        </span>
        <button pButton icon="pi pi-search" label="Load Trace" (click)="loadTrace(instanceIdInput)" [disabled]="!instanceIdInput"></button>
        <p-dropdown [(ngModel)]="filterSource" [options]="sourceOptions" optionLabel="label" optionValue="value"
          placeholder="Filter by source" (onChange)="applyFilter()" [style]="{width:'180px'}" [showClear]="true" />
      </div>

      <app-skeleton-loader *ngIf="loading()" variant="list" [count]="10" />

      <ng-container *ngIf="nba()">
        <div class="et-nba-card">
          <h4><i class="pi pi-lightbulb"></i> {{ i18n.currentLang()==='ar' ? 'الإجراء التالي الأفضل' : 'Next Best Action' }}
            <p-tag [value]="nba()!.workflowStatus" [severity]="statusSeverity(nba()!.workflowStatus)" class="ml-2" />
          </h4>
          <div class="et-nba-recs">
            <div *ngFor="let rec of nba()!.recommendations" class="et-nba-rec">
              <div class="et-nba-priority">#{{ rec.priority }}</div>
              <div class="et-nba-content">
                <strong>{{ rec.label }}</strong>
                <span class="et-nba-desc">{{ rec.description }}</span>
              </div>
              <div class="et-nba-meta">
                <p-tag [value]="rec.category" severity="info" />
                <span class="et-confidence" [pTooltip]="'Confidence: ' + (rec.confidence * 100).toFixed(0) + '%'">
                  <i class="pi pi-chart-bar"></i> {{ (rec.confidence * 100).toFixed(0) }}%
                </span>
              </div>
            </div>
            <div *ngIf="!nba()!.recommendations.length" class="text-center text-color-secondary p-3">No recommendations available</div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="trace()">
        <div class="et-graph-section" *ngIf="traceGraphNodes().length > 0">
          <h4><i class="pi pi-share-alt"></i> {{ i18n.currentLang()==='ar' ? 'مخطط تدفق التنفيذ' : 'Execution Flow Graph' }}</h4>
          <app-graph-explorer [nodes]="traceGraphNodes()" [edges]="traceGraphEdges()" height="300px" />
        </div>

        <div class="et-header">
          <h4>{{ i18n.currentLang()==='ar' ? 'جدول الأحداث' : 'Event Timeline' }} ({{ filteredEvents().length }} / {{ trace()!.traceCount }})</h4>
        </div>

        <div class="et-timeline">
          <div *ngFor="let ev of filteredEvents(); let idx = index" class="et-event" [ngClass]="'et-event-' + ev.source">
            <div class="et-event-line">
              <div class="et-event-dot" [ngClass]="'et-dot-' + ev.eventType"></div>
              <div class="et-event-connector" *ngIf="idx < filteredEvents().length - 1"></div>
            </div>
            <div class="et-event-card" (click)="showDetail(ev)">
              <div class="et-event-header">
                <p-tag [value]="ev.eventType" [severity]="eventSeverity(ev.eventType)" />
                <p-tag [value]="ev.source" severity="info" class="ml-1" />
                <span class="et-event-time">{{ ev.timestamp | date:'medium' }}</span>
              </div>
              <div class="et-event-body">
                <span *ngIf="ev.stepId" class="et-step-id"><i class="pi pi-tag"></i> {{ ev.stepId | slice:0:8 }}…</span>
                <span class="et-detail-preview">{{ summarize(ev.details) }}</span>
              </div>
            </div>
          </div>
        </div>

        <app-empty-state *ngIf="filteredEvents().length === 0" title="No matching events" description="Adjust filters or load a different instance." />
      </ng-container>

      <app-empty-state *ngIf="!loading() && !trace()" title="No trace loaded" description="Enter a workflow instance ID to view execution trace." />

      <p-dialog [header]="'Event Detail'" [(visible)]="showDetailDialog" [modal]="true" [style]="{width:'600px'}">
        <pre class="et-json">{{ detailJson }}</pre>
      </p-dialog>
    </div>
  `,
    styles: [`
    .et-body { padding: 0 24px 40px; }
    .et-search { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
    .et-nba-card { background: linear-gradient(135deg, var(--primary-50), var(--purple-50)); border: 1px solid var(--primary-200); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 24px; }
    .et-nba-card h4 { margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
    .et-nba-recs { display: flex; flex-direction: column; gap: 10px; }
    .et-nba-rec { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(var(--color-white-rgb), 0.7); border-radius: var(--radius); }
    .et-nba-priority { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--primary-500); color: white; border-radius: 50%; font-weight: 700; font-size: var(--font-size-caption); flex-shrink: 0; }
    .et-nba-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .et-nba-desc { font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .et-nba-meta { display: flex; align-items: center; gap: 8px; }
    .et-confidence { font-size: var(--font-size-caption); font-weight: 600; display: flex; align-items: center; gap: 4px; }
    .et-header { margin-bottom: 16px; }
    .et-header h4 { margin: 0; }
    .et-timeline { display: flex; flex-direction: column; gap: 0; padding-left: 20px; }
    .et-event { display: flex; gap: 16px; }
    .et-event-line { display: flex; flex-direction: column; align-items: center; width: 20px; }
    .et-event-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--surface-border); }
    .et-dot-step_execution { background: var(--blue-500); border-color: var(--blue-500); }
    .et-dot-ai_execution { background: var(--purple-500); border-color: var(--purple-500); }
    .et-dot-audit_event { background: var(--gray-400); border-color: var(--gray-400); }
    .et-dot-intervention { background: var(--orange-500); border-color: var(--orange-500); }
    .et-dot-rollback { background: var(--red-500); border-color: var(--red-500); }
    .et-event-connector { width: 2px; flex: 1; background: var(--surface-border); min-height: 16px; }
    .et-event-card { flex: 1; background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 8px; cursor: pointer; transition: box-shadow 0.15s; }
    .et-event-card:hover { box-shadow: 0 2px 8px rgba(var(--color-black-rgb), 0.08); }
    .et-event-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
    .et-event-time { font-size: var(--font-size-sm); color: var(--text-color-secondary); margin-left: auto; }
    .et-event-body { font-size: var(--font-size-tag); display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .et-step-id { font-family: monospace; font-size: var(--font-size-sm); background: var(--surface-100); padding: 2px 6px; border-radius: var(--radius-xs); }
    .et-detail-preview { color: var(--text-color-secondary); }
    .et-json { font-family: monospace; font-size: var(--font-size-caption); white-space: pre-wrap; word-break: break-all; max-height: 400px; overflow-y: auto; background: var(--surface-50); padding: 12px; border-radius: var(--radius-sm); }
    .et-graph-section { margin-bottom: 20px; }
    .et-graph-section h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: var(--font-size-base); font-weight: 600; color: var(--text-heading); }
  `]
})
export class WorkflowExecutionTraceComponent implements OnInit {
  private api = inject(Workflow3LevelApiService);
  private route = inject(ActivatedRoute);
  private msg = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  loading = signal(false);
  trace = signal<ExecutionTraceDto | null>(null);
  nba = signal<NextBestActionDto | null>(null);
  filteredEvents = signal<TraceEventDto[]>([]);
  instanceIdInput = '';
  filterSource = '';
  showDetailDialog = false;
  detailJson = '';

  sourceOptions = [
    { label: 'All Sources', value: '' },
    { label: 'Engine', value: 'engine' },
    { label: 'Agent', value: 'agent' },
    { label: 'Audit', value: 'audit' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Safety', value: 'safety' },
  ];

  traceGraphNodes = computed<GraphExplorerNode[]>(() => {
    const events = this.filteredEvents();
    if (!events.length) return [];
    const TYPE_COLORS: Record<string, string> = { step_execution: '#3b82f6', ai_execution: '#8b5cf6', audit_event: '#94a3b8', intervention: '#f59e0b', rollback: '#ef4444' };
    return events.map((ev, i) => ({
      id: ev.stepId || `ev-${i}`,
      label: `${ev.eventType}${ev.details?.['stepType'] ? ':' + ev.details['stepType'] : ''}`,
      type: ev.eventType,
      size: ev.eventType === 'intervention' || ev.eventType === 'rollback' ? 14 : 10,
      color: TYPE_COLORS[ev.eventType] || '#3b82f6',
    }));
  });

  traceGraphEdges = computed<GraphExplorerEdge[]>(() => {
    const events = this.filteredEvents();
    if (events.length < 2) return [];
    const edges: GraphExplorerEdge[] = [];
    for (let i = 0; i < events.length - 1; i++) {
      edges.push({ source: events[i].stepId || `ev-${i}`, target: events[i + 1].stepId || `ev-${i + 1}` });
    }
    return edges;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('instanceId');
    if (id) { this.instanceIdInput = id; this.loadTrace(id); }
  }

  loadTrace(instanceId: string): void {
    if (!instanceId) return;
    this.loading.set(true);
    this.api.getExecutionTrace(instanceId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => { this.msg.add({ severity: 'error', summary: 'Failed to load trace' }); return of(null); }),
    ).subscribe(d => {
      this.trace.set(d);
      this.filteredEvents.set(d?.events || []);
      this.loading.set(false);
    });
    this.api.getNextBestAction(instanceId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of(null)),
    ).subscribe(n => this.nba.set(n));
  }

  applyFilter(): void {
    const events = this.trace()?.events || [];
    this.filteredEvents.set(this.filterSource ? events.filter(e => e.source === this.filterSource) : events);
  }

  showDetail(ev: TraceEventDto): void {
    this.detailJson = JSON.stringify(ev, null, 2);
    this.showDetailDialog = true;
  }

  summarize(details: Record<string, unknown>): string {
    const parts: string[] = [];
    if (details['stepType']) parts.push(`step:${details['stepType']}`);
    if (details['status']) parts.push(`status:${details['status']}`);
    if (details['agentId']) parts.push(`agent:${details['agentId']}`);
    if (details['action']) parts.push(`action:${details['action']}`);
    if (details['type']) parts.push(`type:${details['type']}`);
    if (details['confidence']) parts.push(`conf:${(Number(details['confidence']) * 100).toFixed(0)}%`);
    return parts.join(' · ') || JSON.stringify(details).slice(0, 60);
  }

  eventSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (type) {
      case 'step_execution': return 'info';
      case 'ai_execution': return 'success';
      case 'intervention': return 'warning';
      case 'rollback': return 'danger';
      default: return 'info';
    }
  }

  statusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'info';
      case 'stalled': case 'paused': return 'warning';
      case 'failed': case 'stopped': return 'danger';
      default: return 'info';
    }
  }
}
