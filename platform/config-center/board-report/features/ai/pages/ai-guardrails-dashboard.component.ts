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
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { KnobModule } from 'primeng/knob';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-guardrails-dashboard',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ButtonModule, ProgressBarModule, KnobModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="shield-check" [title]="i18n.isArabic() ? 'لوحة الحوكمة والحماية' : 'Guardrails Dashboard'" [subtitle]="i18n.isArabic() ? 'مراقبة الحماية والامتثال لاستخدام الذكاء الاصطناعي' : 'Real-time guardrail monitoring & AI usage compliance'" [breadcrumbs]="['Dashboard','AI','Guardrails']" [loading]="loading()">
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

      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3" *ngFor="let cat of blocksByCategory()">
          <p-card [header]="cat.label">
            <div class="flex flex-column align-items-center gap-2">
              <p-knob [ngModel]="cat.blockRate" [size]="80" [readonly]="true" valueTemplate="{value}%" [strokeWidth]="8" />
              <div class="text-sm" style="color: var(--text-muted)">{{ cat.totalChecks | number }} {{ i18n.isArabic() ? 'فحص' : 'checks' }}</div>
              <app-status-badge [status]="cat.blockRate > 10 ? 'critical' : cat.blockRate > 5 ? 'warning' : 'compliant'" />
            </div>
          </p-card>
        </div>
      </div>

      <p-tabView [dir]="i18n.direction()">
        <p-tabPanel [header]="i18n.isArabic() ? 'نتائج الفحص الفوري' : 'Live Check Results'">
          <p-table [value]="checks()" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" responsiveLayout="scroll" [sortField]="'timestamp'" [sortOrder]="-1">
            <ng-template pTemplate="header">
              <tr>
                <th pSortableColumn="timestamp">{{ i18n.isArabic() ? 'الوقت' : 'Timestamp' }} <p-sortIcon field="timestamp" /></th>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'الفئة' : 'Category' }}</th>
                <th>{{ i18n.isArabic() ? 'القاعدة' : 'Rule' }}</th>
                <th>{{ i18n.isArabic() ? 'النتيجة' : 'Result' }}</th>
                <th>{{ i18n.isArabic() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ i18n.isArabic() ? 'الإجراء' : 'Action' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-check>
              <tr>
                <td>{{ check.timestamp }}</td>
                <td>{{ check.agent_id }}</td>
                <td><p-tag [value]="check.category || check.guardrail_type || '—'" /></td>
                <td>{{ check.rule_name || check.rule_id }}</td>
                <td><p-tag [value]="check.passed ? 'PASS' : 'BLOCK'" [severity]="check.passed ? 'success' : 'danger'" /></td>
                <td><app-status-badge [status]="check.severity || (check.passed ? 'low' : 'high')" /></td>
                <td><p-tag [value]="check.action || (check.passed ? 'allowed' : 'blocked')" [severity]="check.passed ? 'info' : 'danger'" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد نتائج فحص' : 'No check results' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'طلبات التجاوز' : 'Override Requests'">
          <p-table [value]="overrides()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'القاعدة' : 'Rule' }}</th>
                <th>{{ i18n.isArabic() ? 'المطلوب بواسطة' : 'Requested By' }}</th>
                <th>{{ i18n.isArabic() ? 'السبب' : 'Justification' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isArabic() ? 'الوقت' : 'Requested At' }}</th>
                <th>{{ i18n.isArabic() ? 'إجراءات' : 'Actions' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-ov>
              <tr>
                <td>{{ ov.agent_id }}</td>
                <td>{{ ov.rule_name || ov.guardrail_id }}</td>
                <td>{{ ov.requested_by || ov.user_id }}</td>
                <td class="text-sm" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ ov.justification || ov.reason || '—' }}</td>
                <td><app-status-badge [status]="ov.status || 'pending'" /></td>
                <td>{{ ov.requested_at || ov.created_at }}</td>
                <td>
                  <div class="flex gap-1" *ngIf="ov.status === 'pending'">
                    <button pButton label="Approve" class="p-button-sm p-button-outlined p-button-success" (click)="approveOverride(ov)"></button>
                    <button pButton label="Reject" class="p-button-sm p-button-outlined p-button-danger" (click)="rejectOverride(ov)"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد طلبات تجاوز' : 'No override requests' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'مقاييس الامتثال' : 'Compliance Metrics'">
          <p-table [value]="complianceMetrics()" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'المقياس' : 'Metric' }}</th>
                <th>{{ i18n.isArabic() ? 'الفترة' : 'Period' }}</th>
                <th>{{ i18n.isArabic() ? 'القيمة' : 'Value' }}</th>
                <th>{{ i18n.isArabic() ? 'الهدف' : 'Target' }}</th>
                <th>{{ i18n.isArabic() ? 'الاتجاه' : 'Trend' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-m>
              <tr>
                <td>{{ m.metric_name || m.metric }}</td>
                <td>{{ m.period }}</td>
                <td>{{ m.value }}{{ m.unit || '' }}</td>
                <td>{{ m.target }}{{ m.unit || '' }}</td>
                <td>
                  <p-tag [value]="m.trend || 'stable'" [severity]="m.trend === 'improving' ? 'success' : m.trend === 'declining' ? 'danger' : 'info'" />
                </td>
                <td><app-status-badge [status]="m.compliant ? 'compliant' : 'non_compliant'" /></td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد مقاييس امتثال' : 'No compliance metrics' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class AiGuardrailsDashboardComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly kpis = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);
  readonly blocksByCategory = signal<{ label: string; blockRate: number; totalChecks: number }[]>([]);
  readonly checks = signal<any[]>([]);
  readonly overrides = signal<any[]>([]);
  readonly complianceMetrics = signal<any[]>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/guardrails/stats`).subscribe({
      next: (res) => {
        const d = res?.data || res || {};
        this.kpis.set([
          { label: 'Total Checks (24h)', labelAr: 'إجمالي الفحوصات (24 ساعة)', value: d.totalChecks24h ?? 0, color: 'var(--info)' },
          { label: 'Block Rate (%)', labelAr: 'معدل الحظر', value: d.blockRatePct ? `${d.blockRatePct.toFixed(1)}%` : '0%', color: 'var(--severity-critical)' },
          { label: 'Pending Overrides', labelAr: 'تجاوزات معلقة', value: d.pendingOverrides ?? 0, color: 'var(--warning)' },
          { label: 'Policy Compliance', labelAr: 'امتثال السياسة', value: d.policyCompliancePct ? `${d.policyCompliancePct.toFixed(1)}%` : '—', color: 'var(--success)' },
        ]);
        const cats = d.byCategory || [];
        this.blocksByCategory.set(
          (cats.length ? cats : [
            { label: 'Content', category: 'content', block_rate: d.contentBlockRate ?? 0, total_checks: 0 },
            { label: 'Bias', category: 'bias', block_rate: d.biasBlockRate ?? 0, total_checks: 0 },
            { label: 'Privacy', category: 'privacy', block_rate: d.privacyBlockRate ?? 0, total_checks: 0 },
            { label: 'Accuracy', category: 'accuracy', block_rate: d.accuracyBlockRate ?? 0, total_checks: 0 },
          ]).map((c: any) => ({
            label: c.label || c.category,
            blockRate: +(c.block_rate * (c.block_rate > 1 ? 1 : 100)).toFixed(1),
            totalChecks: c.total_checks ?? 0,
          }))
        );
        if (Array.isArray(d.recentChecks)) this.checks.set(d.recentChecks);
        if (Array.isArray(d.complianceMetrics)) this.complianceMetrics.set(d.complianceMetrics);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load guardrails stats' });
      },
    });

    this.http.get<any>(`${environment.apiUrl}/ai/guardrails/overrides`).subscribe({
      next: (res) => this.overrides.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.overrides.set([]),
    });

    this.http.get<any>(`${environment.apiUrl}/ai/guardrails/checks`).subscribe({
      next: (res) => { if (this.checks().length === 0) this.checks.set(res?.data || (Array.isArray(res) ? res : [])); },
      error: () => {},
    });
  }

  approveOverride(item: any): void {
    this.http.put<any>(`${environment.apiUrl}/ai/guardrails/overrides/${item.override_id}/approve`, {}).subscribe({
      next: () => {
        this.overrides.update(list => list.map(o => o.override_id === item.override_id ? { ...o, status: 'approved' } : o));
        this.msg.add({ severity: 'success', summary: 'Approved', detail: 'Override approved' });
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to approve override' }),
    });
  }

  rejectOverride(item: any): void {
    this.http.put<any>(`${environment.apiUrl}/ai/guardrails/overrides/${item.override_id}/reject`, {}).subscribe({
      next: () => {
        this.overrides.update(list => list.map(o => o.override_id === item.override_id ? { ...o, status: 'rejected' } : o));
        this.msg.add({ severity: 'info', summary: 'Rejected', detail: 'Override rejected' });
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to reject override' }),
    });
  }
}
