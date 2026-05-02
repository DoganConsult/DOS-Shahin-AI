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
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/select';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

interface WorkflowAgent {
  agentCode: string;
  name: string;
  workflow: { canStartWorkflows: boolean; canInterruptHuman: boolean; maxConcurrentWorkflows: number };
  executionMode: string;
  state: string;
}

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
  selector: 'app-workflow-dashboard',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, DropdownModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="cog" [title]="i18n.isArabic() ? 'لوحة سير العمل' : 'Workflow Dashboard'" [subtitle]="i18n.isArabic() ? 'إدارة ومراقبة سير عمل الوكلاء' : 'Manage & monitor agent workflows'" [breadcrumbs]="['Dashboard','AI','Workflows']" [loading]="loading()">

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
        <p-tabPanel [header]="i18n.isArabic() ? 'وكلاء سير العمل' : 'Workflow Agents'">
          <p-table [value]="workflowAgents()" [paginator]="true" [rows]="12" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الرمز' : 'Code' }}</th>
                <th>{{ i18n.isArabic() ? 'الاسم' : 'Name' }}</th>
                <th>{{ i18n.isArabic() ? 'الوضع' : 'Mode' }}</th>
                <th>{{ i18n.isArabic() ? 'بدء سير العمل' : 'Can Start' }}</th>
                <th>{{ i18n.isArabic() ? 'المقاطعة' : 'Can Interrupt' }}</th>
                <th>{{ i18n.isArabic() ? 'الحد الأقصى' : 'Max Concurrent' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'State' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-a>
              <tr>
                <td><strong>{{ a.agentCode }}</strong></td>
                <td>{{ a.name }}</td>
                <td><p-tag [value]="a.executionMode" severity="info" /></td>
                <td><p-tag [value]="a.workflow.canStartWorkflows ? 'Yes' : 'No'" [severity]="a.workflow.canStartWorkflows ? 'success' : 'warning'" /></td>
                <td><p-tag [value]="a.workflow.canInterruptHuman ? 'Yes' : 'No'" [severity]="a.workflow.canInterruptHuman ? 'danger' : 'success'" /></td>
                <td class="text-center">{{ a.workflow.maxConcurrentWorkflows }}</td>
                <td><app-status-badge [status]="a.state" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">{{ i18n.isArabic() ? 'لا يوجد وكلاء بسير عمل' : 'No workflow-enabled agents' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'سجل التنفيذ' : 'Execution History'">
          <p-table [value]="executions()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'created_at'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'معرف التشغيل' : 'Run ID' }}</th>
                <th pSortableColumn="agent_code">{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }} <p-sortIcon field="agent_code" /></th>
                <th pSortableColumn="status">{{ i18n.isArabic() ? 'الحالة' : 'Status' }} <p-sortIcon field="status" /></th>
                <th>{{ i18n.isArabic() ? 'المصدر' : 'Trigger' }}</th>
                <th pSortableColumn="duration_ms">{{ i18n.isArabic() ? 'المدة' : 'Duration' }} <p-sortIcon field="duration_ms" /></th>
                <th>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}</th>
                <th>{{ i18n.isArabic() ? 'التكلفة' : 'Cost' }}</th>
                <th pSortableColumn="created_at">{{ i18n.isArabic() ? 'التاريخ' : 'Date' }} <p-sortIcon field="created_at" /></th>
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
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="text-center p-4">{{ i18n.isArabic() ? 'لا يوجد سجلات تنفيذ' : 'No execution records' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'موجات التنفيذ' : 'Execution Waves'">
          <div class="grid">
            <div class="col-12 md:col-4" *ngFor="let wave of executionWaves(); let i = index">
              <p-card [header]="(i18n.isArabic() ? 'الموجة ' : 'Wave ') + i">
                <div class="flex flex-wrap gap-2">
                  <p-tag *ngFor="let code of wave" [value]="code" severity="info" styleClass="text-sm" />
                </div>
                <div class="text-sm mt-2" style="color: var(--text-muted)">{{ wave.length }} {{ i18n.isArabic() ? 'وكلاء' : 'agents' }}</div>
              </p-card>
            </div>
          </div>
          <div *ngIf="executionWaves().length === 0" class="text-center p-4" style="color: var(--text-muted)">
            {{ i18n.isArabic() ? 'لا توجد موجات تنفيذ' : 'No execution waves available' }}
          </div>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class WorkflowDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly workflowAgents = signal<WorkflowAgent[]>([]);
  readonly executions = signal<ExecutionRun[]>([]);
  readonly executionWaves = signal<string[][]>([]);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);

  ngOnInit(): void {
    this.loadWorkflowAgents();
    this.loadExecutions();
    this.loadWaves();
  }

  private loadWorkflowAgents(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/workflows`).subscribe({
      next: (res) => {
        const list: WorkflowAgent[] = res?.data || [];
        this.workflowAgents.set(list);
        this.kpis.set([
          { label: 'Workflow Agents', labelAr: 'وكلاء سير العمل', value: list.length, color: 'var(--info)' },
          { label: 'Can Start', labelAr: 'يمكنه البدء', value: list.filter(a => a.workflow?.canStartWorkflows).length, color: 'var(--success)' },
          { label: 'Can Interrupt', labelAr: 'يمكنه المقاطعة', value: list.filter(a => a.workflow?.canInterruptHuman).length, color: 'var(--severity-critical)' },
          { label: 'Waves', labelAr: 'الموجات', value: this.executionWaves().length || '—', color: 'var(--warning)' },
        ]);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load workflow agents' });
      },
    });
  }

  private loadExecutions(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/workflows/executions?limit=100`).subscribe({
      next: (res) => this.executions.set(res?.data || []),
      error: () => {},
    });
  }

  private loadWaves(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/workflows/waves`).subscribe({
      next: (res) => this.executionWaves.set(res?.data || []),
      error: () => {},
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
