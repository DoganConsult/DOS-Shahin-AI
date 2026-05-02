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
import { KnobModule } from 'primeng/knob';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ai-agent-health',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, ToastModule, CardModule, TableModule, TagModule, TabViewModule, ProgressBarModule, KnobModule, ButtonModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <app-page-shell icon="activity" [title]="i18n.isArabic() ? 'مراقبة صحة الوكلاء' : 'Agent Health Monitoring'" [subtitle]="i18n.isArabic() ? 'مقاييس الأداء وتتبع SLA' : 'Per-agent metrics, SLA & circuit breakers'" [breadcrumbs]="['Dashboard','AI','Agent Health']" [loading]="loading()">
      <div class="grid mb-3" [dir]="i18n.direction()">
        <div class="col-12 md:col-3" *ngFor="let kpi of summary()">
          <p-card>
            <div class="text-center">
              <div class="text-3xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
              <div class="text-sm mt-1" style="color: var(--text-muted)">{{ i18n.isArabic() ? kpi.labelAr : kpi.label }}</div>
            </div>
          </p-card>
        </div>
      </div>

      <p-tabView [dir]="i18n.direction()">
        <p-tabPanel [header]="i18n.isArabic() ? 'بطاقات صحة الوكلاء' : 'Health Cards'">
          <div class="grid" [dir]="i18n.direction()">
            <div class="col-12 md:col-6 lg:col-4" *ngFor="let agent of agents()">
              <p-card [header]="agent.agent_id + ' — ' + (agent.name || '')">
                <div class="flex flex-column gap-2">
                  <div class="flex justify-content-between align-items-center">
                    <span class="text-sm font-semibold">{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</span>
                    <app-status-badge [status]="agent.status || 'unknown'" />
                  </div>
                  <div class="flex justify-content-between align-items-center">
                    <span class="text-sm font-semibold">{{ i18n.isArabic() ? 'وقت التشغيل (%)' : 'Uptime %' }}</span>
                    <span class="font-bold" [style.color]="agent.uptime_pct >= 99 ? 'var(--success)' : agent.uptime_pct >= 95 ? 'var(--warning)' : 'var(--severity-critical)'">{{ agent.uptime_pct ?? '—' }}%</span>
                  </div>
                  <div>
                    <div class="flex justify-content-between text-sm mb-1">
                      <span>CPU</span><span>{{ agent.cpu_pct ?? 0 }}%</span>
                    </div>
                    <p-progressBar [value]="agent.cpu_pct ?? 0" [style]="{'height':'6px'}" [showValue]="false" />
                  </div>
                  <div>
                    <div class="flex justify-content-between text-sm mb-1">
                      <span>{{ i18n.isArabic() ? 'الذاكرة' : 'Memory' }}</span><span>{{ agent.memory_pct ?? 0 }}%</span>
                    </div>
                    <p-progressBar [value]="agent.memory_pct ?? 0" [style]="{'height':'6px'}" [showValue]="false" />
                  </div>
                  <div class="flex justify-content-between text-sm">
                    <span>{{ i18n.isArabic() ? 'متوسط الكمون' : 'Avg Latency' }}</span>
                    <span>{{ agent.avg_latency_ms ?? '—' }} ms</span>
                  </div>
                  <div class="flex justify-content-between text-sm">
                    <span>{{ i18n.isArabic() ? 'قاطع الدائرة' : 'Circuit Breaker' }}</span>
                    <p-tag [value]="agent.circuit_breaker_state || 'closed'" [severity]="agent.circuit_breaker_state === 'open' ? 'danger' : agent.circuit_breaker_state === 'half-open' ? 'warning' : 'success'" />
                  </div>
                  <div class="flex justify-content-between text-sm">
                    <span>{{ i18n.isArabic() ? 'امتثال SLA' : 'SLA Compliance' }}</span>
                    <span [style.color]="agent.sla_compliance_pct >= 99 ? 'var(--success)' : 'var(--warning)'">{{ agent.sla_compliance_pct ?? '—' }}%</span>
                  </div>
                </div>
              </p-card>
            </div>
            <div class="col-12" *ngIf="agents().length === 0">
              <p class="text-center p-4" style="color: var(--text-muted)">{{ i18n.isArabic() ? 'لا توجد بيانات صحة' : 'No health data available' }}</p>
            </div>
          </div>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'الأخطاء الأخيرة' : 'Recent Errors'">
          <p-table [value]="errors()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'الوقت' : 'Timestamp' }}</th>
                <th>{{ i18n.isArabic() ? 'الخطأ' : 'Error' }}</th>
                <th>{{ i18n.isArabic() ? 'الخطورة' : 'Severity' }}</th>
                <th>{{ i18n.isArabic() ? 'الحالة' : 'Status' }}</th>
                <th>{{ i18n.isArabic() ? 'تتبع المكدس' : 'Stack (truncated)' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-e>
              <tr>
                <td>{{ e.agent_id }}</td>
                <td>{{ e.timestamp }}</td>
                <td>{{ e.error_type || e.message }}</td>
                <td><app-status-badge [status]="e.severity || 'error'" /></td>
                <td><app-status-badge [status]="e.resolved ? 'resolved' : 'open'" /></td>
                <td class="font-mono text-xs" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ (e.stack_trace || e.stack || '').slice(0, 120) || '—' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد أخطاء' : 'No recent errors' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <p-tabPanel [header]="i18n.isArabic() ? 'امتثال SLA' : 'SLA Compliance'">
          <p-table [value]="slaData()" styleClass="p-datatable-sm" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>{{ i18n.isArabic() ? 'الوكيل' : 'Agent' }}</th>
                <th>{{ i18n.isArabic() ? 'مستهدف SLA (ms)' : 'SLA Target (ms)' }}</th>
                <th>{{ i18n.isArabic() ? 'متوسط الفعلي' : 'Actual Avg (ms)' }}</th>
                <th>{{ i18n.isArabic() ? 'نسبة الامتثال' : 'Compliance %' }}</th>
                <th>{{ i18n.isArabic() ? 'الانتهاكات' : 'Violations' }}</th>
                <th>{{ i18n.isArabic() ? 'الفترة' : 'Period' }}</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td><strong>{{ row.agent_id }}</strong></td>
                <td>{{ row.sla_target_ms }}</td>
                <td>{{ row.actual_avg_ms }}</td>
                <td>
                  <div class="flex align-items-center gap-2">
                    <p-progressBar [value]="row.compliance_pct ?? 0" [style]="{'height':'8px','width':'80px'}" [showValue]="false" />
                    <span [style.color]="row.compliance_pct >= 99 ? 'var(--success)' : 'var(--warning)'">{{ row.compliance_pct ?? 0 }}%</span>
                  </div>
                </td>
                <td>{{ row.violations ?? 0 }}</td>
                <td>{{ row.period || '30d' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="6" class="text-center p-4">{{ i18n.isArabic() ? 'لا توجد بيانات SLA' : 'No SLA data' }}</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>
      </p-tabView>
    </app-page-shell>
  `,
})
export class AiAgentHealthComponent implements OnInit {
  readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly msg = inject(MessageService);

  readonly loading = signal(true);
  readonly agents = signal<any[]>([]);
  readonly errors = signal<any[]>([]);
  readonly slaData = signal<any[]>([]);
  readonly summary = signal<{ label: string; labelAr: string; value: number | string; color: string }[]>([]);

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/ai/agents/health/summary`).subscribe({
      next: (res) => {
        const d = res?.data || res || {};
        this.summary.set([
          { label: 'Healthy Agents', labelAr: 'وكلاء بصحة جيدة', value: d.healthyCount ?? 0, color: 'var(--success)' },
          { label: 'Degraded', labelAr: 'أداء منخفض', value: d.degradedCount ?? 0, color: 'var(--warning)' },
          { label: 'Down', labelAr: 'متوقف', value: d.downCount ?? 0, color: 'var(--severity-critical)' },
          { label: 'Avg Uptime %', labelAr: 'متوسط وقت التشغيل', value: d.avgUptimePct ? `${d.avgUptimePct}%` : '—', color: 'var(--info)' },
          { label: 'Open Breakers', labelAr: 'قواطع مفتوحة', value: d.openBreakers ?? 0, color: 'var(--orange-500)' },
          { label: 'SLA Violations (30d)', labelAr: 'انتهاكات SLA', value: d.slaViolations30d ?? 0, color: 'var(--severity-critical)' },
        ]);
      },
      error: () => this.summary.set([]),
    });

    this.http.get<any>(`${environment.apiUrl}/ai/agents/health`).subscribe({
      next: (res) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.agents.set(list);
        this.slaData.set(list.map((a: any) => ({
          agent_id: a.agent_id,
          sla_target_ms: a.sla_target_ms,
          actual_avg_ms: a.avg_latency_ms,
          compliance_pct: a.sla_compliance_pct,
          violations: a.sla_violations,
          period: '30d',
        })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({ severity: 'error', summary: 'Error', detail: 'Failed to load agent health' });
      },
    });

    this.http.get<any>(`${environment.apiUrl}/ai/agents/errors`).subscribe({
      next: (res) => this.errors.set(res?.data || (Array.isArray(res) ? res : [])),
      error: () => this.errors.set([]),
    });
  }
}
