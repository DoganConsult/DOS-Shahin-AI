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
import { DropdownModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-decision-log',
  standalone: true,
  imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, DropdownModule, InputTextModule, ProgressBarModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="clipboard-list" [title]="i18n.isArabic() ? 'سجل قرارات الذكاء الاصطناعي' : 'AI Decision Log'" [subtitle]="i18n.isArabic() ? 'شفافية القرارات والمسار التدقيقي' : 'Decision transparency & audit trail'" [breadcrumbs]="['Dashboard','AI','Decision Log']" [loading]="loading()">
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

      <div class="flex gap-2 mb-3 flex-wrap" [dir]="i18n.direction()">
        <p-dropdown [options]="moduleOptions" [(ngModel)]="filterModule" optionLabel="label" optionValue="value" [placeholder]="i18n.isArabic() ? 'كل الوحدات' : 'All Modules'" [showClear]="true" (onChange)="applyFilters()" />
        <p-dropdown [options]="agentOptions" [(ngModel)]="filterAgent" optionLabel="label" optionValue="value" [placeholder]="i18n.isArabic() ? 'كل الوكلاء' : 'All Agents'" [showClear]="true" (onChange)="applyFilters()" />
        <p-dropdown [options]="confidenceOptions" [(ngModel)]="filterConfidence" optionLabel="label" optionValue="value" [placeholder]="i18n.isArabic() ? 'الثقة الدنيا' : 'Min Confidence'" [showClear]="true" (onChange)="applyFilters()" />
        <button pButton [label]="i18n.isArabic() ? 'إعادة تعيين' : 'Reset'" class="p-button-outlined p-button-secondary" (click)="resetFilters()"></button>
      </div>

      <p-tabView [dir]="i18n.direction()">
        <p-tabPanel [header]="i18n.isArabic() ? 'قائمة القرارات' : 'Decisions'">
          <p-table [value]="filteredDecisions()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'timestamp'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="timestamp">{{ i18n.isArabic() ? 'الوقت' : 'Timestamp' }} <p-sortIcon field="timestamp" /></th>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'النموذج' : 'Model' }}</th>
                <th>{{ i18n.isArabic() ? 'الوحدة' : 'Module' }}</th>
                <th pSortableColumn="confidence_score">{{ i18n.isArabic() ? 'الثقة (%)' : 'Confidence' }} <p-sortIcon field="confidence_score" /></th>
                <th pSortableColumn="latency_ms">{{ i18n.isArabic() ? 'الكمون (ms)' : 'Latency (ms)' }} <p-sortIcon field="latency_ms" /></th>
                <th>{{ i18n.isArabic() ? 'القرار' : 'Decision' }}</th>
                <th>{{ i18n.isArabic() ? 'تجاوز بشري' : 'Override' }}</th>
                <th>{{ i18n.isArabic() ? 'النتيجة' : 'Outcome' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-d>
              <tr>
                <td>{{ d.timestamp }}</td>
                <td>{{ d.agent_id }}</td>
                <td>{{ d.model_id || d.model }}</td>
                <td><p-tag [value]="d.module_code || d.module || '—'" /></td>
                <td>
                  <div class="flex align-items-center gap-2">
                    <p-progressBar [value]="+(d.confidence_score * 100).toFixed(0)" [style]="{'height':'8px','width':'60px'}" [showValue]="false" />
                    <span>{{ (d.confidence_score * 100).toFixed(0) }}%</span>
                  </div>
                </td>
                <td>{{ d.latency_ms ?? '—' }}</td>
                <td class="max-w-xs" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ d.decision_summary || d.decision }}</td>
                <td>
                  <p-tag *ngIf="d.human_override" value="Override" severity="warning" />
                  <span *ngIf="!d.human_override">—</span>
                </td>
                <td><app-status-badge [status]="d.outcome || d.result || 'pending'" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="9" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد قرارات مسجلة' : 'No decisions found' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'التجاوزات البشرية' : 'Human Overrides'">
          <p-table [value]="overrides()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الوقت' : 'Timestamp' }}</th>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'القرار الأصلي' : 'Original Decision' }}</th>
                <th>{{ i18n.isArabic() ? 'القرار المُعدَّل' : 'Override Value' }}</th>
                <th>{{ i18n.isArabic() ? 'بواسطة' : 'Overridden By' }}</th>
                <th>{{ i18n.isArabic() ? 'السبب' : 'Reason' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-o>
              <tr>
                <td>{{ o.timestamp }}</td>
                <td>{{ o.agent_id }}</td>
                <td>{{ o.original_decision || '—' }}</td>
                <td>{{ o.override_value || o.new_decision }}</td>
                <td>{{ o.overridden_by || o.user_id }}</td>
                <td>{{ o.reason || '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد تجاوزات' : 'No overrides recorded' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class AiDecisionLogComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);
  private readonly allDecisions = signal<any[]>([]);
  readonly filteredDecisions = signal<any[]>([]);
  readonly overrides = signal<any[]>([]);

  filterModule: string | null = null;
  filterAgent: string | null = null;
  filterConfidence: number | null = null;

  readonly moduleOptions = [
    { label: 'AI', value: 'ai' }, { label: 'Risk', value: 'risk' },
    { label: 'Compliance', value: 'compliance' }, { label: 'Vendor', value: 'vendor' },
  ];

  readonly agentOptions = Array.from({ length: 10 }, (_, i) => ({
    label: `A${String(i + 1).padStart(2, '0')}`,
    value: `A${String(i + 1).padStart(2, '0')}`,
  }));

  readonly confidenceOptions = [
    { label: '≥ 90%', value: 0.9 }, { label: '≥ 75%', value: 0.75 },
    { label: '≥ 50%', value: 0.5 }, { label: '< 50%', value: -0.5 },
  ];

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/os/decisions`).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.allDecisions.set(list);
        this.filteredDecisions.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load decision log' });
      },
    });

    this.http.get<any>(`${environment.apiUrl}/ai/os/decisions/stats`).subscribe({
      next: (res) => {
        const d = res?.data || res || {};
        this.kpis.set([
          { label: 'Total Decisions', labelAr: 'إجمالي القرارات', value: d.totalDecisions ?? 0, color: 'var(--info)' },
          { label: 'Avg Confidence', labelAr: 'متوسط الثقة', value: d.avgConfidence ? `${(d.avgConfidence * 100).toFixed(1)}%` : '—', color: 'var(--success)' },
          { label: 'Human Overrides', labelAr: 'التجاوزات البشرية', value: d.humanOverrides ?? 0, color: 'var(--warning)' },
          { label: 'Avg Latency (ms)', labelAr: 'متوسط الكمون', value: d.avgLatencyMs ?? 0, color: 'var(--blue-500)' },
        ]);
      },
      error: () => this.kpis.set([]),
    });

    this.http.get<any>(`${environment.apiUrl}/ai/os/decisions/overrides`).subscribe({
      next: (res) => this.overrides.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.overrides.set([]),
    });
  }

  applyFilters(): void {
    let result = this.allDecisions();
    if (this.filterModule) result = result.filter(d => d.module_code === this.filterModule || d.module === this.filterModule);
    if (this.filterAgent) result = result.filter(d => d.agent_id === this.filterAgent);
    if (this.filterConfidence !== null) {
      if (this.filterConfidence < 0) {
        result = result.filter(d => d.confidence_score < Math.abs(this.filterConfidence!));
      } else {
        result = result.filter(d => d.confidence_score >= this.filterConfidence!);
      }
    }
    this.filteredDecisions.set(result);
  }

  resetFilters(): void {
    this.filterModule = null;
    this.filterAgent = null;
    this.filterConfidence = null;
    this.filteredDecisions.set(this.allDecisions());
  }
}
