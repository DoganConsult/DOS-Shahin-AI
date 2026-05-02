import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TimelineModule } from 'primeng/timeline';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/select';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { FormsModule } from '@angular/forms';
import { PageShellComponent } from '@app/shared/components/page-chrome/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';

interface AuditEntry {
  timestamp: string;
  agentId: string;
  action: string;
  entityType: string;
  entityId: string;
  result: string;
  runId?: string;
  correlationId?: string;
  module?: string;
  detail?: string;
}

interface WorkflowRun {
  runId: string;
  agentCode: string;
  status: string;
  taskType?: string;
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  toolCalls?: Array<{ toolCode: string; status: string; durationMs: number; timestamp: string }>;
  output?: Record<string, unknown>;
  error?: string;
}

interface TimelineStep {
  label: string;
  timestamp: string;
  icon: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
  detail?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-audit-trail',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, DialogModule, TimelineModule, TooltipModule, DropdownModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="history" [title]="i18n.isArabic() ? 'سجل تدقيق الذكاء الاصطناعي' : 'AI Audit Trail'" [subtitle]="i18n.isArabic() ? 'أحداث التدقيق والجدول الزمني لتشغيل الوكلاء' : 'Audit events & agent workflow run timeline'" [breadcrumbs]="['Dashboard','AI','Audit Trail']" [loading]="loading()">

      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis()">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? kpi.labelAr : kpi.label }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <p-tabView [dir]="i18n.direction()">
        <p-tabPanel [header]="i18n.isArabic() ? 'سجل التدقيق' : 'Audit Log'">
          <p-table [value]="entries()" [rows]="20" responsiveLayout="scroll" [paginator]="true" [sortField]="'timestamp'" [sortOrder]="-1" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="timestamp">{{ i18n.isArabic() ? 'الوقت' : 'Time' }} <p-sortIcon field="timestamp" /></th>
                <th pSortableColumn="agentId">{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }} <p-sortIcon field="agentId" /></th>
                <th>{{ i18n.isArabic() ? 'الإجراء' : 'Action' }}</th>
                <th>{{ i18n.isArabic() ? 'الكيان' : 'Entity' }}</th>
                <th>{{ i18n.isArabic() ? 'النتيجة' : 'Result' }}</th>
                <th>{{ i18n.isArabic() ? 'معرف التشغيل' : 'Run ID' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-entry>
              <tr>
                <td>{{ entry.timestamp }}</td>
                <td><strong>{{ entry.agentId }}</strong></td>
                <td>{{ entry.action }}</td>
                <td>{{ entry.entityType }}/{{ entry.entityId }}</td>
                <td><p-tag [severity]="resultSeverity(entry.result)" [value]="entry.result" /></td>
                <td>
                  <button *ngIf="entry.runId" pButton [text]="true" class="p-button-sm" [label]="entry.runId | slice:0:8" [pTooltip]="entry.runId" (click)="openRunTimeline(entry.agentId, entry.runId)"></button>
                  <span *ngIf="!entry.runId" style="color: var(--text-muted)">—</span>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد سجلات' : 'No audit entries' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'تشغيلات الوكلاء' : 'Workflow Runs'">
          <div class="flex align-items-center gap-2 mb-3">
            <p-dropdown [options]="agentOptions()" [(ngModel)]="selectedAgentFilter" [placeholder]="i18n.isArabic() ? 'كل الوكلاء' : 'All Agents'" [showClear]="true" styleClass="w-12rem" (onChange)="loadRuns()"></p-dropdown>
            <button pButton icon="pi pi-refresh" class="p-button-outlined p-button-sm" (click)="loadRuns()" [pTooltip]="i18n.isArabic() ? 'تحديث' : 'Refresh'"></button>
          </div>
          <p-table [value]="runs()" [rows]="15" responsiveLayout="scroll" [paginator]="true" [sortField]="'createdAt'" [sortOrder]="-1" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="createdAt">{{ i18n.isArabic() ? 'البداية' : 'Started' }} <p-sortIcon field="createdAt" /></th>
                <th pSortableColumn="agentCode">{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }} <p-sortIcon field="agentCode" /></th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isArabic() ? 'المدة' : 'Duration' }}</th>
                <th>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}</th>
                <th>{{ i18n.isArabic() ? 'التكلفة' : 'Cost' }}</th>
                <th>{{ i18n.isArabic() ? 'الأدوات' : 'Tools' }}</th>
                <th>{{ i18n.isArabic() ? 'الجدول الزمني' : 'Timeline' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-run>
              <tr>
                <td>{{ run.createdAt }}</td>
                <td><strong>{{ run.agentCode }}</strong></td>
                <td><app-status-badge [status]="run.status" /></td>
                <td>{{ run.durationMs ? (run.durationMs + 'ms') : '—' }}</td>
                <td>{{ run.tokensUsed ?? '—' }}</td>
                <td>{{ run.costUsd != null ? ('$' + run.costUsd.toFixed(4)) : '—' }}</td>
                <td>{{ run.toolCalls?.length ?? 0 }}</td>
                <td><button pButton icon="pi pi-clock" class="p-button-text p-button-sm" (click)="openRunTimeline(run.agentCode, run.runId)"></button></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد تشغيلات' : 'No workflow runs' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'ملخص النشاط' : 'Activity Summary'">
          <div class="grid">
            <div class="col-12 md:col-6">
              <p-card [header]="i18n.isArabic() ? 'أكثر الوكلاء نشاطاً' : 'Most Active Agents'">
                <div *ngFor="let item of topAgents()" class="flex justify-content-between align-items-center py-2 border-bottom-1" style="border-color: var(--surface-border)">
                  <strong>{{ item.agentId }}</strong>
                  <p-tag [value]="item.count + ' actions'" severity="info" />
                </div>
                <div *ngIf="topAgents().length === 0" class="text-center p-3" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'لا توجد بيانات' : 'No data' }}</div>
              </p-card>
            </div>
            <div class="col-12 md:col-6">
              <p-card [header]="i18n.isArabic() ? 'نتائج التدقيق' : 'Result Distribution'">
                <div *ngFor="let item of resultDist()" class="flex justify-content-between align-items-center py-2 border-bottom-1" style="border-color: var(--surface-border)">
                  <p-tag [value]="item.result" [severity]="resultSeverity(item.result)" />
                  <span class="font-bold">{{ item.count }}</span>
                </div>
                <div *ngIf="resultDist().length === 0" class="text-center p-3" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'لا توجد بيانات' : 'No data' }}</div>
              </p-card>
            </div>
          </div>
        </p-tabPanel>
      </p-tabView>

      <p-dialog [(visible)]="runDialogVisible" [modal]="true" [style]="{ width: '650px', maxHeight: '80vh' }" [header]="(i18n.isArabic() ? 'الجدول الزمني — ' : 'Run Timeline — ') + (selectedRun()?.runId | slice:0:12)" [closable]="true">
        <div *ngIf="runLoading()" class="text-center p-4"><i class="pi pi-spin pi-spinner text-3xl"></i></div>
        <div *ngIf="!runLoading() && selectedRun()" class="flex flex-column gap-3">
          <div class="grid">
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}:</strong> {{ selectedRun()!.agentCode }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}:</strong> <app-status-badge [status]="selectedRun()!.status" /></div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'البداية' : 'Started' }}:</strong> {{ selectedRun()!.createdAt }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'النهاية' : 'Completed' }}:</strong> {{ selectedRun()!.completedAt || '—' }}</div>
            <div class="col-4"><strong>{{ i18n.isArabic() ? 'المدة' : 'Duration' }}:</strong> {{ selectedRun()!.durationMs ? (selectedRun()!.durationMs + 'ms') : '—' }}</div>
            <div class="col-4"><strong>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}:</strong> {{ selectedRun()!.tokensUsed ?? '—' }}</div>
            <div class="col-4"><strong>{{ i18n.isArabic() ? 'التكلفة' : 'Cost' }}:</strong> {{ selectedRun()!.costUsd != null ? ('$' + selectedRun()!.costUsd!.toFixed(4)) : '—' }}</div>
          </div>

          <div *ngIf="selectedRun()!.error" class="p-3 border-round" style="background: var(--red-50); color: var(--red-700); border: 1px solid var(--red-200)">
            <strong>{{ i18n.isArabic() ? 'خطأ' : 'Error' }}:</strong> {{ selectedRun()!.error }}
          </div>

          <h4>{{ i18n.isArabic() ? 'خطوات التنفيذ' : 'Execution Steps' }}</h4>
          <p-timeline [value]="runTimeline()" align="left" styleClass="run-timeline">
            <ng-template pTemplate="marker" let-step>
              <span class="run-marker" [ngClass]="'run-marker--' + step.severity">
                <i class="pi" [ngClass]="'pi-' + step.icon" aria-hidden="true"></i>
              </span>
            </ng-template>
            <ng-template pTemplate="content" let-step>
              <div class="flex flex-column gap-1 pb-2">
                <div class="flex align-items-center gap-2">
                  <strong class="text-sm">{{ step.label }}</strong>
                  <span class="text-xs" style="color: var(--text-color-secondary)">{{ step.timestamp }}</span>
                </div>
                <span *ngIf="step.detail" class="text-xs" style="color: var(--text-muted)">{{ step.detail }}</span>
              </div>
            </ng-template>
          </p-timeline>
          <div *ngIf="runTimeline().length === 0" class="text-center p-3" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'لا توجد خطوات' : 'No steps recorded' }}</div>
        </div>
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .run-marker { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
    .run-marker--info { background: var(--blue-50, #eff6ff); color: var(--blue-600, #2563eb); }
    .run-marker--success { background: var(--green-50, #f0fdf4); color: var(--green-600, #16a34a); }
    .run-marker--warning { background: var(--yellow-50, #fefce8); color: var(--yellow-600, #ca8a04); }
    .run-marker--danger { background: var(--red-50, #fef2f2); color: var(--red-600, #dc2626); }
    :host ::ng-deep .run-timeline .p-timeline-event-opposite { display: none; }
  `],
})
export class AiAuditTrailComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly entries = signal<AuditEntry[]>([]);
  readonly runs = signal<WorkflowRun[]>([]);
  readonly selectedRun = signal<WorkflowRun | null>(null);
  readonly runLoading = signal(false);
  runDialogVisible = false;
  selectedAgentFilter: string | null = null;

  readonly kpis = computed(() => {
    const e = this.entries();
    const r = this.runs();
    return [
      { label: 'Audit Events', labelAr: 'أحداث التدقيق', value: e.length, color: 'var(--info)' },
      { label: 'Workflow Runs', labelAr: 'التشغيلات', value: r.length, color: 'var(--primary)' },
      { label: 'Success Rate', labelAr: 'معدل النجاح', value: e.length ? Math.round(e.filter(x => x.result === 'success').length / e.length * 100) + '%' : '—', color: 'var(--success)' },
      { label: 'Blocked/Failed', labelAr: 'محظور/فاشل', value: e.filter(x => x.result === 'blocked' || x.result === 'failed').length, color: 'var(--severity-critical)' },
    ];
  });

  readonly agentOptions = computed(() => {
    const ids = new Set(this.entries().map(e => e.agentId));
    return Array.from(ids).sort().map(id => ({ label: id, value: id }));
  });

  readonly topAgents = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.entries()) map.set(e.agentId, (map.get(e.agentId) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([agentId, count]) => ({ agentId, count }));
  });

  readonly resultDist = computed(() => {
    const map = new Map<string, number>();
    for (const e of this.entries()) map.set(e.result, (map.get(e.result) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([result, count]) => ({ result, count }));
  });

  readonly runTimeline = computed((): TimelineStep[] => {
    const run = this.selectedRun();
    if (!run) return [];
    const steps: TimelineStep[] = [];
    steps.push({ label: 'Run Started', timestamp: run.createdAt, icon: 'play', severity: 'info' });
    if (run.toolCalls) {
      for (const tc of run.toolCalls) {
        steps.push({
          label: `Tool: ${tc.toolCode}`,
          timestamp: tc.timestamp || run.createdAt,
          icon: tc.status === 'success' ? 'check' : tc.status === 'failed' ? 'times' : 'cog',
          severity: tc.status === 'success' ? 'success' : tc.status === 'failed' ? 'danger' : 'warning',
          detail: `${tc.durationMs}ms`,
        });
      }
    }
    if (run.error) {
      steps.push({ label: 'Error', timestamp: run.completedAt || run.createdAt, icon: 'exclamation-triangle', severity: 'danger', detail: run.error });
    }
    if (run.completedAt) {
      const endSev = run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'warning';
      steps.push({ label: `Run ${run.status}`, timestamp: run.completedAt, icon: run.status === 'completed' ? 'check-circle' : 'times-circle', severity: endSev });
    }
    return steps;
  });

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/audit-trail`).subscribe({
      next: (res) => {
        this.entries.set(res?.data || res || []);
        this.loading.set(false);
      },
      error: () => {
        this.entries.set([]);
        this.loading.set(false);
      },
    });
    this.loadRuns();
  }

  loadRuns(): void {
    const agentFilter = this.selectedAgentFilter;
    if (agentFilter) {
      this.http.get<any>(`${environment.apiUrl}/platform/agents/${agentFilter}/runs`, { params: { limit: '100' } }).subscribe({
        next: (res) => this.runs.set(this.mapRuns(res)),
        error: () => this.runs.set([]),
      });
    } else {
      this.http.get<any>(`${environment.apiUrl}/platform/agents/directory`).subscribe({
        next: (dir) => {
          const agents: string[] = (dir?.agents || []).map((a: any) => a.agentCode);
          if (agents.length === 0) { this.runs.set([]); return; }
          const first5 = agents.slice(0, 5);
          let allRuns: WorkflowRun[] = [];
          let done = 0;
          for (const code of first5) {
            this.http.get<any>(`${environment.apiUrl}/platform/agents/${code}/runs`, { params: { limit: '20' } }).subscribe({
              next: (res) => {
                allRuns = allRuns.concat(this.mapRuns(res));
                done++;
                if (done >= first5.length) this.runs.set(allRuns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
              },
              error: () => { done++; if (done >= first5.length) this.runs.set(allRuns); },
            });
          }
        },
        error: () => this.runs.set([]),
      });
    }
  }

  openRunTimeline(agentCode: string, runId: string): void {
    this.runLoading.set(true);
    this.runDialogVisible = true;
    this.selectedRun.set(null);
    this.http.get<any>(`${environment.apiUrl}/platform/agents/runs/${runId}`).subscribe({
      next: (res) => {
        const data = res?.data || res;
        this.selectedRun.set({
          runId: data.runId || data.run_id || runId,
          agentCode: data.agentCode || data.agent_code || agentCode,
          status: data.status || 'unknown',
          taskType: data.taskType || data.task_type,
          createdAt: data.createdAt || data.created_at || '',
          completedAt: data.completedAt || data.completed_at,
          durationMs: data.durationMs || data.duration_ms,
          tokensUsed: data.tokensUsed || data.tokens_used,
          costUsd: data.costUsd ?? data.cost_usd,
          toolCalls: (data.toolCalls || data.tool_calls || []).map((tc: any) => ({
            toolCode: tc.toolCode || tc.tool_code || tc.name || 'unknown',
            status: tc.status || 'unknown',
            durationMs: tc.durationMs || tc.duration_ms || 0,
            timestamp: tc.timestamp || tc.created_at || data.createdAt || '',
          })),
          output: data.output,
          error: data.error || data.errorMessage || data.error_message,
        });
        this.runLoading.set(false);
      },
      error: () => {
        this.selectedRun.set({ runId, agentCode, status: 'unknown', createdAt: '' });
        this.runLoading.set(false);
        this.msg.add({ severity: 'warn', summary: 'Warning', detail: 'Run details unavailable' });
      },
    });
  }

  resultSeverity(result: string): 'info' | 'success' | 'warning' | 'danger' {
    if (result === 'success') return 'success';
    if (result === 'blocked' || result === 'failed') return 'danger';
    if (result === 'escalated' || result === 'pending') return 'warning';
    return 'info';
  }

  private mapRuns(res: any): WorkflowRun[] {
    const list = res?.runs || res?.data || res || [];
    return (Array.isArray(list) ? list : []).map((r: any) => ({
      runId: r.runId || r.run_id || '',
      agentCode: r.agentCode || r.agent_code || '',
      status: r.status || 'unknown',
      taskType: r.taskType || r.task_type,
      createdAt: r.createdAt || r.created_at || '',
      completedAt: r.completedAt || r.completed_at,
      durationMs: r.durationMs || r.duration_ms,
      tokensUsed: r.tokensUsed || r.tokens_used,
      costUsd: r.costUsd ?? r.cost_usd,
      toolCalls: r.toolCalls || r.tool_calls || [],
      output: r.output,
      error: r.error || r.errorMessage,
    }));
  }
}
