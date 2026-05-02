import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-squad-management',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, ProgressBarModule, DialogModule, InputTextModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <p-dialog [header]="i18n.isArabic() ? 'فريق جديد' : 'New Squad'" [(visible)]="showCreateDialog" [modal]="true" [style]="{width:'480px'}">
      <div class="flex flex-column gap-3 p-3">
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'اسم الفريق' : 'Squad Name' }}</label>
          <input pInputText [(ngModel)]="newSquad.name" class="w-full" />
        </div>
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'الهدف' : 'Mission' }}</label>
          <input pInputText [(ngModel)]="newSquad.mission" class="w-full" />
        </div>
        <div>
          <label class="font-semibold block mb-1">{{ i18n.isArabic() ? 'معرّفات الوكلاء (مفصولة بفاصلة)' : 'Agent IDs (comma-separated)' }}</label>
          <input pInputText [(ngModel)]="newSquad.agentIds" class="w-full" placeholder="A01,A02,A03" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <button pButton [label]="i18n.isArabic() ? 'إلغاء' : 'Cancel'" class="p-button-text" (click)="showCreateDialog = false"></button>
        <button pButton [label]="i18n.isArabic() ? 'إنشاء' : 'Create'" (click)="createSquad()"></button>
      </ng-template>
    </p-dialog>

    <app-page-shell icon="users" [title]="i18n.isArabic() ? 'إدارة الفرق' : 'Multi-Agent Squad Management'" [subtitle]="i18n.isArabic() ? 'تنسيق الوكلاء المتعددين وتتبع الأداء' : 'Squad coordination, execution history & resource allocation'" [breadcrumbs]="['Dashboard','AI','Squad Management']" [loading]="loading()">
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
        <p-tabPanel [header]="i18n.isArabic() ? 'تعريفات الفرق' : 'Squad Definitions'">
          <div class="flex justify-content-end mb-2">
            <button pButton [label]="i18n.isArabic() ? 'فريق جديد' : 'New Squad'" icon="pi pi-plus" (click)="showCreateDialog = true"></button>
          </div>
          <div class="grid">
            <div class="col-12 md:col-6 lg:col-4" *ngFor="let squad of squads()">
              <p-card [header]="squad.name">
                <div class="flex flex-column gap-2">
                  <div class="text-sm" style="color: var(--text-muted)">{{ squad.mission || squad.description || '—' }}</div>
                  <div class="flex gap-1 flex-wrap mt-1">
                    <p-tag *ngFor="let agentId of (squad.agent_ids || squad.agents || [])" [value]="agentId" severity="info" />
                  </div>
                  <div class="flex justify-content-between align-items-center mt-2">
                    <app-status-badge [status]="squad.status || 'active'" />
                    <span class="text-sm" style="color: var(--text-muted)">{{ (squad.agent_ids || squad.agents || []).length }} {{ i18n.isArabic() ? 'وكيل' : 'agents' }}</span>
                  </div>
                  <div class="flex justify-content-between text-sm">
                    <span>{{ i18n.isArabic() ? 'معدل النجاح' : 'Success Rate' }}</span>
                    <span [style.color]="squad.success_rate >= 0.95 ? 'var(--success)' : 'var(--warning)'">{{ squad.success_rate ? (squad.success_rate * 100).toFixed(1) + '%' : '—' }}</span>
                  </div>
                  <div class="flex justify-content-between text-sm">
                    <span>{{ i18n.isArabic() ? 'عمليات هذا الشهر' : 'Runs (30d)' }}</span>
                    <span>{{ squad.runs_30d ?? '—' }}</span>
                  </div>
                </div>
              </p-card>
            </div>
            <div class="col-12" *ngIf="squads().length === 0">
              <p class="text-center p-4" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'لا توجد فرق محددة' : 'No squads defined' }}</p>
            </div>
          </div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'سجل التنفيذ' : 'Execution History'">
          <p-table [value]="executions()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'started_at'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الفريق' : 'Squad' }}</th>
                <th pSortableColumn="started_at">{{ i18n.isArabic() ? 'بدأ' : 'Started' }} <p-sortIcon field="started_at" /></th>
                <th>{{ i18n.isArabic() ? 'انتهى' : 'Ended' }}</th>
                <th>{{ i18n.isArabic() ? 'المشغّل' : 'Trigger' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isArabic() ? 'المدة (s)' : 'Duration (s)' }}</th>
                <th>{{ i18n.isArabic() ? 'الرموز' : 'Tokens' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-ex>
              <tr>
                <td>{{ ex.squad_name || ex.squad_id }}</td>
                <td>{{ ex.started_at }}</td>
                <td>{{ ex.ended_at || '—' }}</td>
                <td><p-tag [value]="ex.trigger || 'manual'" /></td>
                <td><app-status-badge [status]="ex.status" /></td>
                <td>{{ ex.duration_seconds ?? ex.duration_ms ? (ex.duration_ms / 1000).toFixed(1) : '—' }}</td>
                <td>{{ ex.total_tokens | number }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">{{ i18n.isArabic() ? 'لا يوجد سجل تنفيذ' : 'No execution history' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'الأداء حسب الفريق' : 'Performance by Squad'">
          <p-table [value]="squadPerformance()" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'success_rate'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الفريق' : 'Squad' }}</th>
                <th pSortableColumn="total_runs">{{ i18n.isArabic() ? 'إجمالي العمليات' : 'Total Runs' }} <p-sortIcon field="total_runs" /></th>
                <th pSortableColumn="success_rate">{{ i18n.isArabic() ? 'معدل النجاح' : 'Success Rate' }} <p-sortIcon field="success_rate" /></th>
                <th>{{ i18n.isArabic() ? 'متوسط المدة' : 'Avg Duration (s)' }}</th>
                <th>{{ i18n.isArabic() ? 'الرموز المستهلكة' : 'Total Tokens' }}</th>
                <th>{{ i18n.isArabic() ? 'التكلفة (USD)' : 'Est. Cost (USD)' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.squad_name || row.squad_id }}</td>
                <td>{{ row.total_runs | number }}</td>
                <td>
                  <div class="flex align-items-center gap-2">
                    <p-progressBar [value]="+(row.success_rate * 100).toFixed(0)" [style]="{'height':'8px','width':'80px'}" [showValue]="false" />
                    <span [style.color]="row.success_rate >= 0.95 ? 'var(--success)' : 'var(--warning)'">{{ (row.success_rate * 100).toFixed(1) }}%</span>
                  </div>
                </td>
                <td>{{ row.avg_duration_s ?? '—' }}</td>
                <td>{{ row.total_tokens | number }}</td>
                <td>{{ row.estimated_cost_usd ?? '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد بيانات أداء' : 'No performance data' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class AiSquadManagementComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);
  readonly squads = signal<any[]>([]);
  readonly executions = signal<any[]>([]);
  readonly squadPerformance = signal<any[]>([]);

  showCreateDialog = false;
  newSquad = { name: '', mission: '', agentIds: '' };

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/squads`).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.squads.set(list);
        this.kpis.set([
          { label: 'Total Squads', labelAr: 'إجمالي الفرق', value: list.length, color: 'var(--info)' },
          { label: 'Active', labelAr: 'نشطة', value: list.filter((s: any) => s.status === 'active').length, color: 'var(--success)' },
          { label: 'Avg Agents/Squad', labelAr: 'متوسط الوكلاء', value: list.length ? (list.reduce((s: number, sq: any) => s + ((sq.agent_ids || sq.agents || []).length), 0) / list.length).toFixed(1) : 0, color: 'var(--blue-500)' },
          { label: 'Best Success Rate', labelAr: 'أفضل معدل نجاح', value: list.length ? `${(Math.max(...list.map((s: any) => s.success_rate || 0)) * 100).toFixed(1)}%` : '—', color: 'var(--success)' },
        ]);
        this.squadPerformance.set(list.map((s: any) => ({
          squad_name: s.name, squad_id: s.squad_id, total_runs: s.runs_30d ?? s.total_runs ?? 0,
          success_rate: s.success_rate ?? 0, avg_duration_s: s.avg_duration_s, total_tokens: s.total_tokens ?? 0, estimated_cost_usd: s.estimated_cost_usd,
        })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load squads' });
      },
    });

    this.http.get<any>(`${environment.apiUrl}/ai/squads/executions`).subscribe({
      next: (res) => this.executions.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.executions.set([]),
    });
  }

  createSquad(): void {
    if (!this.newSquad.name) return;
    const payload = {
      name: this.newSquad.name,
      mission: this.newSquad.mission,
      agent_ids: this.newSquad.agentIds.split(',').map(s => s.trim()).filter(Boolean),
    };
    this.http.post<any>(`${environment.apiUrl}/ai/squads`, payload).subscribe({
      next: (created) => {
        this.squads.update(list => [created, ...list]);
        this.showCreateDialog = false;
        this.newSquad = { name: '', mission: '', agentIds: '' };
        this.msg.add({ severity: 'success', summary: 'Created', detail: 'Squad created successfully' });
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to create squad' }),
    });
  }
}
