import { Component, OnInit, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/select';
import { ProgressBarModule } from 'primeng/progressbar';
import { Workflow3LevelApiService } from '../../services/workflow-3level-api.service';
import type { WorkflowAnalyticsDto } from '../../services/workflow-3level-api.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-analytics',
    imports: [CommonModule, FormsModule, PageHeaderComponent, StatCardComponent, EmptyStateComponent,
        SkeletonLoaderComponent, TagModule, ButtonModule, CardModule, TableModule, DropdownModule, ProgressBarModule],
    template: `
    <app-page-header
      titleEn="Workflow Analytics" titleAr="تحليلات سير العمل"
      subtitleEn="Enterprise workflow performance, AI execution metrics & SLA compliance"
      subtitleAr="أداء سير العمل المؤسسي ومقاييس تنفيذ الذكاء الاصطناعي والامتثال لاتفاقيات مستوى الخدمة"
      icon="chart-bar" [breadcrumbs]="['Workflows', 'Analytics']"
      [isAr]="i18n.currentLang()==='ar'" [dir]="i18n.direction()" />

    <div class="an-body" [dir]="i18n.direction()">
      <div class="an-controls">
        <p-dropdown [(ngModel)]="selectedPeriod" [options]="periodOptions" optionLabel="label" optionValue="value"
          (onChange)="loadAnalytics()" [style]="{width:'180px'}" />
        <button pButton icon="pi pi-refresh" class="p-button-text" (click)="loadAnalytics()"></button>
      </div>

      <app-skeleton-loader *ngIf="loading() && !data()" variant="card" [count]="6" />

      <ng-container *ngIf="data()">
        <div class="an-kpi-grid">
          <app-stat-card label="Total Instances" [value]="data()!.instances.total" icon="pi-server" color="var(--primary-color)" />
          <app-stat-card label="Active" [value]="data()!.instances.active" icon="pi-play" color="var(--blue-500)" />
          <app-stat-card label="Completed" [value]="data()!.instances.completed" icon="pi-check-circle" color="var(--green-500)" />
          <app-stat-card label="Failed" [value]="data()!.instances.failed" icon="pi-times-circle" color="var(--red-500)" />
          <app-stat-card label="SLA Compliance" [value]="data()!.sla.compliancePct + '%'" icon="pi-shield" color="var(--teal-500)" />
          <app-stat-card label="AI Executions" [value]="data()!.aiExecution.totalExecutions" icon="pi-bolt" color="var(--purple-500)" />
          <app-stat-card label="Avg Completion" [value]="formatDuration(data()!.instances.avgCompletionMs)" icon="pi-clock" color="var(--orange-500)" />
          <app-stat-card label="Pending Approvals" [value]="data()!.approvals.pending" icon="pi-inbox" color="var(--yellow-600)" />
        </div>

        <div class="an-section-grid">
          <div class="an-card">
            <h4><i class="pi pi-bolt"></i> {{ i18n.currentLang()==='ar' ? 'تنفيذ الذكاء الاصطناعي' : 'AI Execution Breakdown' }}</h4>
            <div class="an-metric-list">
              <div class="an-metric-row"><span>Auto Approved</span><strong class="text-green-500">{{ data()!.aiExecution.autoApproved }}</strong></div>
              <div class="an-metric-row"><span>Auto Rejected</span><strong class="text-red-500">{{ data()!.aiExecution.autoRejected }}</strong></div>
              <div class="an-metric-row"><span>Pending Review</span><strong class="text-orange-500">{{ data()!.aiExecution.pendingReview }}</strong></div>
              <div class="an-metric-row"><span>Avg Confidence</span><strong>{{ (data()!.aiExecution.avgConfidence * 100).toFixed(1) }}%</strong></div>
            </div>
          </div>
          <div class="an-card">
            <h4><i class="pi pi-shield"></i> {{ i18n.currentLang()==='ar' ? 'الامتثال لمستوى الخدمة' : 'SLA Performance' }}</h4>
            <div class="an-metric-list">
              <div class="an-metric-row"><span>Total SLAs</span><strong>{{ data()!.sla.total }}</strong></div>
              <div class="an-metric-row"><span>Met</span><strong class="text-green-500">{{ data()!.sla.met }}</strong></div>
              <div class="an-metric-row"><span>Breached</span><strong class="text-red-500">{{ data()!.sla.breached }}</strong></div>
              <div class="an-metric-row">
                <span>Compliance</span>
                <p-progressBar [value]="data()!.sla.compliancePct" [showValue]="true" [style]="{height:'12px',width:'120px'}"
                  [ngClass]="data()!.sla.compliancePct >= 80 ? 'an-bar-green' : data()!.sla.compliancePct >= 50 ? 'an-bar-yellow' : 'an-bar-red'" />
              </div>
            </div>
          </div>
          <div class="an-card">
            <h4><i class="pi pi-check-square"></i> {{ i18n.currentLang()==='ar' ? 'الموافقات' : 'Approvals' }}</h4>
            <div class="an-metric-list">
              <div class="an-metric-row"><span>Total</span><strong>{{ data()!.approvals.total }}</strong></div>
              <div class="an-metric-row"><span>Approved</span><strong class="text-green-500">{{ data()!.approvals.approved }}</strong></div>
              <div class="an-metric-row"><span>Rejected</span><strong class="text-red-500">{{ data()!.approvals.rejected }}</strong></div>
              <div class="an-metric-row"><span>Avg Resolution</span><strong>{{ data()!.approvals.avgResolutionHours.toFixed(1) }}h</strong></div>
            </div>
          </div>
        </div>

        <div class="an-section-grid mt-3">
          <div class="an-card an-card-wide">
            <h4><i class="pi pi-list"></i> {{ i18n.currentLang()==='ar' ? 'توزيع الخطوات' : 'Step Type Breakdown' }}</h4>
            <p-table [value]="data()!.stepBreakdown" styleClass="p-datatable-sm p-datatable-striped" [attr.aria-label]="'Step Breakdown Table'">
              <ng-template pTemplate="header"><tr><th>Step Type</th><th>Count</th><th>Avg Duration</th></tr></ng-template>
              <ng-template pTemplate="body" let-s>
                <tr>
                  <td><code>{{ s.stepType }}</code></td>
                  <td>{{ s.count }}</td>
                  <td>{{ formatSeconds(s.avgDurationSec) }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center p-4">No step data</td></tr></ng-template>
            </p-table>
          </div>
        </div>

        <div class="an-section-grid mt-3">
          <div class="an-card">
            <h4><i class="pi pi-file-edit"></i> {{ i18n.currentLang()==='ar' ? 'ملاحظات الذكاء الاصطناعي' : 'AI Notes by Type' }}</h4>
            <p-table [value]="data()!.aiNotes" styleClass="p-datatable-sm" [attr.aria-label]="'AI Notes Breakdown'">
              <ng-template pTemplate="header"><tr><th>Type</th><th>Count</th><th>Accepted</th><th>Rejected</th></tr></ng-template>
              <ng-template pTemplate="body" let-n>
                <tr><td><p-tag [value]="n.noteType" severity="info" /></td><td>{{ n.count }}</td><td class="text-green-500">{{ n.accepted }}</td><td class="text-red-500">{{ n.rejected }}</td></tr>
              </ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No AI notes</td></tr></ng-template>
            </p-table>
          </div>
          <div class="an-card">
            <h4><i class="pi pi-send"></i> {{ i18n.currentLang()==='ar' ? 'مسودات الإجراءات' : 'Draft Actions by Type' }}</h4>
            <p-table [value]="data()!.draftActions" styleClass="p-datatable-sm" [attr.aria-label]="'Draft Actions Breakdown'">
              <ng-template pTemplate="header"><tr><th>Type</th><th>Count</th><th>Accepted</th><th>Converted</th></tr></ng-template>
              <ng-template pTemplate="body" let-d>
                <tr><td><p-tag [value]="d.draftType" severity="info" /></td><td>{{ d.count }}</td><td class="text-green-500">{{ d.accepted }}</td><td class="text-blue-500">{{ d.converted }}</td></tr>
              </ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No draft actions</td></tr></ng-template>
            </p-table>
          </div>
        </div>
      </ng-container>

      <app-empty-state *ngIf="!loading() && !data()" title="No analytics data" description="Run workflows to generate analytics data." />
    </div>
  `,
    styles: [`
    .an-body { padding: 0 24px 40px; }
    .an-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .an-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .an-section-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .an-card { background: var(--surface-card); border: 1px solid var(--surface-border); border-radius: var(--radius-lg); padding: 20px; }
    .an-card-wide { grid-column: 1 / -1; }
    .an-card h4 { margin: 0 0 16px; font-size: var(--font-size-body-sm); font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .an-metric-list { display: flex; flex-direction: column; gap: 10px; }
    .an-metric-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--surface-100); }
    .an-bar-green .p-progressbar-value { background: var(--green-500); }
    .an-bar-yellow .p-progressbar-value { background: var(--yellow-500); }
    .an-bar-red .p-progressbar-value { background: var(--red-500); }
  `]
})
export class WorkflowAnalyticsComponent implements OnInit {
  private api = inject(Workflow3LevelApiService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);

  loading = signal(false);
  data = signal<WorkflowAnalyticsDto | null>(null);
  selectedPeriod = 30;
  periodOptions = [
    { label: '7 Days', value: 7 }, { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 }, { label: '90 Days', value: 90 },
  ];

  ngOnInit(): void { this.loadAnalytics(); }

  loadAnalytics(): void {
    this.loading.set(true);
    this.api.getAnalytics(this.selectedPeriod).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of(null)),
    ).subscribe(d => { this.data.set(d); this.loading.set(false); });
  }

  formatDuration(ms: number): string {
    if (!ms) return '—';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  formatSeconds(sec: number): string {
    if (!sec) return '—';
    if (sec < 60) return `${sec.toFixed(0)}s`;
    if (sec < 3600) return `${(sec / 60).toFixed(1)}m`;
    return `${(sec / 3600).toFixed(1)}h`;
  }
}
