import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/infrastructure';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface ExecutionRun {
  run_id: string;
  agent_code: string;
  status: string;
  trigger_source: string;
  duration_ms: number;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
  completed_at: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-execution-timeline',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, ButtonModule, DialogModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="clock" [title]="i18n.isArabic() ? 'الجدول الزمني للتنفيذ' : 'Execution Timeline'" [subtitle]="i18n.isArabic() ? 'سجل تنفيذ جميع الوكلاء' : 'Full agent execution history'" [breadcrumbs]="['Dashboard','AI','Execution Timeline']" [loading]="loading()">

      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--info)">{{ runs().length }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'إجمالي التشغيلات' : 'Total Runs' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--success)">{{ completedCount() }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'مكتمل' : 'Completed' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--severity-critical)">{{ failedCount() }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'فاشل' : 'Failed' }}</div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" style="color: var(--warning)">{{ avgDuration() }}ms</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'متوسط المدة' : 'Avg Duration' }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <p-table [value]="runs()" [paginator]="true" [rows]="20" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'created_at'" [sortOrder]="-1" [dir]="i18n.direction()">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.isArabic() ? 'معرف التشغيل' : 'Run ID' }}</th>
            <th pSortableColumn="agent_code">{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }} <p-sortIcon field="agent_code" /></th>
            <th pSortableColumn="status">{{ i18n.isArabic() ? 'الحالة' : 'Status' }} <p-sortIcon field="status" /></th>
            <th>{{ i18n.isArabic() ? 'المصدر' : 'Trigger' }}</th>
            <th pSortableColumn="duration_ms">{{ i18n.isArabic() ? 'المدة' : 'Duration' }} <p-sortIcon field="duration_ms" /></th>
            <th>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}</th>
            <th>{{ i18n.isArabic() ? 'التكلفة' : 'Cost' }}</th>
            <th pSortableColumn="created_at">{{ i18n.isArabic() ? 'البدء' : 'Started' }} <p-sortIcon field="created_at" /></th>
            <th>{{ i18n.isArabic() ? 'التفاصيل' : 'Detail' }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td class="font-mono text-sm">{{ r.run_id | slice:0:12 }}...</td>
            <td><strong>{{ r.agent_code }}</strong></td>
            <td><p-tag [value]="r.status" [severity]="statusSeverity(r.status)" /></td>
            <td>{{ r.trigger_source }}</td>
            <td>{{ r.duration_ms ? (r.duration_ms + 'ms') : '—' }}</td>
            <td>{{ r.tokens_used || 0 }}</td>
            <td>{{ r.cost_usd ? ('$' + r.cost_usd.toFixed(4)) : '—' }}</td>
            <td>{{ r.created_at | date:'short' }}</td>
            <td><button pButton icon="pi pi-eye" class="p-button-text p-button-sm" (click)="openDetail(r)"></button></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="9" class="text-center p-4">{{ i18n.isArabic() ? 'لا يوجد سجلات تنفيذ' : 'No execution records' }}</td></tr>
        </ng-template>
      </p-table>

      <p-dialog [(visible)]="detailVisible" [modal]="true" [style]="{ width: '600px' }" [header]="'Run ' + (selectedRun()?.run_id || '')" [closable]="true">
        <div *ngIf="selectedRun()" class="flex flex-column gap-2">
          <div class="grid">
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}:</strong> {{ selectedRun()!.agent_code }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}:</strong> <p-tag [value]="selectedRun()!.status" [severity]="statusSeverity(selectedRun()!.status)" /></div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'المصدر' : 'Trigger' }}:</strong> {{ selectedRun()!.trigger_source }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'المدة' : 'Duration' }}:</strong> {{ selectedRun()!.duration_ms }}ms</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}:</strong> {{ selectedRun()!.tokens_used }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'التكلفة' : 'Cost' }}:</strong> {{ selectedRun()!.cost_usd ? ('$' + selectedRun()!.cost_usd.toFixed(4)) : '—' }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'البدء' : 'Started' }}:</strong> {{ selectedRun()!.created_at | date:'medium' }}</div>
            <div class="col-6"><strong>{{ i18n.isArabic() ? 'الانتهاء' : 'Completed' }}:</strong> {{ selectedRun()!.completed_at ? (selectedRun()!.completed_at | date:'medium') : '—' }}</div>
          </div>
        </div>
      </p-dialog>
    </app-page-shell>
  `,
})
export class ExecutionTimelineComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly runs = signal<ExecutionRun[]>([]);
  readonly selectedRun = signal<ExecutionRun | null>(null);
  detailVisible = false;

  readonly completedCount = signal(0);
  readonly failedCount = signal(0);
  readonly avgDuration = signal(0);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/workflows/executions?limit=200`).subscribe({
      next: (res) => {
        const list: ExecutionRun[] = res?.data || [];
        this.runs.set(list);
        this.completedCount.set(list.filter(r => r.status === 'completed').length);
        this.failedCount.set(list.filter(r => r.status === 'failed').length);
        const durations = list.filter(r => r.duration_ms).map(r => r.duration_ms);
        this.avgDuration.set(durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load execution timeline' });
      },
    });
  }

  openDetail(run: ExecutionRun): void {
    this.http.get<any>(`${environment.apiUrl}/ai/workflows/executions/${run.run_id}`).subscribe({
      next: (res) => {
        this.selectedRun.set(res?.data || run);
        this.detailVisible = true;
      },
      error: () => {
        this.selectedRun.set(run);
        this.detailVisible = true;
      },
    });
  }

  statusSeverity(status: string): 'info' | 'success' | 'warning' | 'danger' {
    switch (status) {
      case 'completed': return 'success';
      case 'running': case 'queued': return 'info';
      case 'failed': return 'danger';
      case 'cancelled': return 'warning';
      default: return 'info';
    }
  }
}
