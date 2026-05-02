import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ProgressBarModule } from 'primeng/progressbar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-operations-center',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ProgressBarModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="cpu" [title]="i18n.isArabic() ? 'مركز العمليات' : 'AI Operations Center'" [subtitle]="i18n.isArabic() ? 'لوحة تشغيل الوكلاء في الوقت الفعلي' : 'Real-time agent execution pipeline'" [breadcrumbs]="['Dashboard','AI','Operations Center']" [loading]="loading()">
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
        <p-tabPanel [header]="i18n.isArabic() ? 'قائمة المهام النشطة' : 'Active Task Queue'">
          <p-table [value]="queue()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [sortField]="'priority'" [sortOrder]="1" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="priority">{{ i18n.isArabic() ? 'الأولوية' : 'Priority' }} <p-sortIcon field="priority" /></th>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'المهمة' : 'Task' }}</th>
                <th>{{ i18n.isArabic() ? 'النوع' : 'Type' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isArabic() ? 'وقت الانتظار' : 'Wait (s)' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-task>
              <tr>
                <td><p-tag [value]="task.priority" [severity]="task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'info'" /></td>
                <td><strong>{{ task.agent_id }}</strong></td>
                <td>{{ task.task_type || task.description || '—' }}</td>
                <td>{{ task.execution_type || '—' }}</td>
                <td><app-status-badge [status]="task.status" /></td>
                <td>{{ task.wait_seconds ?? '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد مهام نشطة' : 'No active tasks in queue' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'استخدام الرموز' : 'Token Usage'">
          <p-table [value]="tokenUsage()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'التاريخ' : 'Date' }}</th>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'النموذج' : 'Model' }}</th>
                <th>{{ i18n.isArabic() ? 'رموز الإدخال' : 'Input Tokens' }}</th>
                <th>{{ i18n.isArabic() ? 'رموز الإخراج' : 'Output Tokens' }}</th>
                <th>{{ i18n.isArabic() ? 'التكلفة (USD)' : 'Cost (USD)' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.date || row.period }}</td>
                <td>{{ row.agent_id || '—' }}</td>
                <td>{{ row.model }}</td>
                <td>{{ row.input_tokens | number }}</td>
                <td>{{ row.output_tokens | number }}</td>
                <td>{{ row.cost_usd ?? '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد بيانات استخدام' : 'No token usage data' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'تنسيق الوكلاء' : 'Agent Coordination'">
          <p-table [value]="pipeline()" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'المُرسِل' : 'From Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'المُستقبِل' : 'To Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'نوع الرسالة' : 'Message Type' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isArabic() ? 'الوقت' : 'Timestamp' }}</th>
                <th>{{ i18n.isArabic() ? 'معدل الخطأ (%)' : 'Error Rate (%)' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-msg>
              <tr>
                <td><strong>{{ msg.from_agent }}</strong></td>
                <td><strong>{{ msg.to_agent }}</strong></td>
                <td>{{ msg.message_type || msg.type }}</td>
                <td><app-status-badge [status]="msg.status" /></td>
                <td>{{ msg.timestamp }}</td>
                <td>
                  <p-progressBar [value]="msg.error_rate ?? 0" [style]="{'height': '8px'}" />
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد رسائل تنسيق' : 'No coordination messages' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class AiOperationsCenterComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);
  readonly queue = signal<any[]>([]);
  readonly tokenUsage = signal<any[]>([]);
  readonly pipeline = signal<any[]>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/os/operations/dashboard`).subscribe({
      next: (res) => {
        const d = res?.data || res || {};
        this.kpis.set([
          { label: 'Total Executions', labelAr: 'إجمالي التنفيذات', value: d.totalExecutions ?? 0, color: 'var(--info)' },
          { label: 'Active Agents', labelAr: 'الوكلاء النشطون', value: d.activeAgents ?? 0, color: 'var(--success)' },
          { label: 'Avg Latency (ms)', labelAr: 'متوسط الكمون', value: d.avgLatencyMs ?? 0, color: 'var(--warning)' },
          { label: 'Error Rate (%)', labelAr: 'معدل الخطأ', value: d.errorRatePct ?? 0, color: 'var(--severity-critical)' },
          { label: 'Tokens Today', labelAr: 'الرموز اليوم', value: d.tokenUsageToday ?? 0, color: 'var(--blue-500)' },
          { label: 'Queue Depth', labelAr: 'عمق الطابور', value: d.queueDepth ?? 0, color: 'var(--orange-500)' },
        ]);
        if (Array.isArray(d.tokenUsage)) this.tokenUsage.set(d.tokenUsage);
        if (Array.isArray(d.coordinationMessages)) this.pipeline.set(d.coordinationMessages);
        this.loading.set(false);
      },
      error: () => {
        this.kpis.set([]);
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load operations dashboard' });
      },
    });
    this.http.get<any>(`${environment.apiUrl}/ai/os/operations/queue`).subscribe({
      next: (res) => this.queue.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.queue.set([]),
    });
  }
}
