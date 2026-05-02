import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { GrcRecord } from '@app/core/models/shared.types';

interface MetricCard { label: string; value: string | number; icon: string; color: string; }

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workflow-metrics-tab',
    imports: [CommonModule, TableModule, TagModule, ButtonModule, CardModule, AppDatePipe],
    styles: [`
    .metrics-container{padding:20px 28px}
    .section-title{font-size:var(--font-size-lg);font-weight:600;margin-bottom:16px;color:var(--text-heading,#111)}
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px}
    .kpi-card{border:1px solid var(--surface-border);border-radius:var(--radius);padding:16px;background:var(--surface-card);display:flex;align-items:center;gap:12px}
    .kpi-icon{width:40px;height:40px;border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:var(--font-size-lg)}
    .kpi-value{font-size:var(--font-size-2xl);font-weight:700;line-height:1}
    .kpi-label{font-size:var(--font-size-sm);color:var(--text-muted)}
    .status-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .status-section{border:1px solid var(--surface-border);border-radius:var(--radius);padding:14px;background:var(--surface-card)}
    .status-section h4{margin:0 0 10px;font-size:var(--font-size-base);font-weight:600}
    .status-row{display:flex;justify-content:space-between;padding:4px 0;font-size:var(--font-size-sm)}
    .status-count{font-weight:600}
  `],
    template: `
    <div class="metrics-container">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 class="section-title" style="margin:0">{{ i18n.currentLang()==='ar' ? 'مقاييس سير العمل' : 'Workflow Metrics' }}</h2>
        <button pButton size="small" icon="pi pi-refresh" [label]="i18n.currentLang()==='ar' ? 'تحديث' : 'Refresh'" (click)="load()" class="p-button-outlined"></button>
      </div>

      <div class="kpi-grid">
        @for (kpi of kpis(); track kpi.label) {
          <div class="kpi-card">
            <div class="kpi-icon" [style.background]="kpi.color + '20'" [style.color]="kpi.color"><i class="pi" [ngClass]="kpi.icon"></i></div>
            <div><div class="kpi-value">{{kpi.value}}</div><div class="kpi-label">{{kpi.label}}</div></div>
          </div>
        }
      </div>

      <div class="status-grid">
        <div class="status-section">
          <h4>{{ i18n.currentLang()==='ar' ? 'حالات سير العمل' : 'Workflow Status' }}</h4>
          @for (s of workflowStatus(); track s.status) {
            <div class="status-row"><span>{{s.status}}</span><span class="status-count">{{s.count}}</span></div>
          }
          @if (!workflowStatus().length) { <div style="color:var(--text-muted);font-size:var(--font-size-sm)">No data</div> }
        </div>
        <div class="status-section">
          <h4>{{ i18n.currentLang()==='ar' ? 'حالات السلاسل' : 'Chain Status' }}</h4>
          @for (s of chainStatus(); track s.status) {
            <div class="status-row"><span>{{s.status}}</span><span class="status-count">{{s.count}}</span></div>
          }
          @if (!chainStatus().length) { <div style="color:var(--text-muted);font-size:var(--font-size-sm)">No data</div> }
        </div>
        <div class="status-section">
          <h4>{{ i18n.currentLang()==='ar' ? 'الموافقات المعلقة' : 'Approval Status' }}</h4>
          @for (s of approvalStatus(); track s.status) {
            <div class="status-row"><span>{{s.status}}</span><span class="status-count">{{s.count}}</span></div>
          }
          @if (!approvalStatus().length) { <div style="color:var(--text-muted);font-size:var(--font-size-sm)">No data</div> }
        </div>
        <div class="status-section">
          <h4>{{ i18n.currentLang()==='ar' ? 'المشغلات بالوحدة' : 'AI Triggers by Module' }}</h4>
          @for (t of triggersByModule(); track t.module) {
            <div class="status-row"><span style="text-transform:capitalize">{{t.module}}</span><span class="status-count">{{t.trigger_count}}</span></div>
          }
          @if (!triggersByModule().length) { <div style="color:var(--text-muted);font-size:var(--font-size-sm)">No data</div> }
        </div>
      </div>

      @if (slaBreaches().length) {
        <h3 class="section-title" style="font-size:var(--font-size-base);color:#dc2626">{{ i18n.currentLang()==='ar' ? 'انتهاكات SLA' : 'SLA Breaches' }}</h3>
        <p-table [value]="slaBreaches()" [rows]="10" styleClass="p-datatable-sm p-datatable-striped">
          <ng-template pTemplate="header"><tr><th>Template</th><th>Entity</th><th>Status</th><th>Created</th></tr></ng-template>
          <ng-template pTemplate="body" let-b>
            <tr>
              <td><code>{{b.template_key}}</code></td>
              <td>{{b.entity_type}} / {{b.entity_id | slice:0:8}}</td>
              <td><p-tag [value]="b.status" severity="danger" /></td>
              <td>{{b.created_at | appDate}}</td>
            </tr>
          </ng-template>
        </p-table>
      }

      <h3 class="section-title" style="font-size:var(--font-size-base);margin-top:24px">{{ i18n.currentLang()==='ar' ? 'الانتقالات الأخيرة' : 'Recent Transitions' }}</h3>
      <p-table [value]="recentTransitions()" [rows]="15" [paginator]="recentTransitions().length > 15" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header">
          <tr><th>Module</th><th>Entity</th><th>From</th><th>To</th><th>Approval</th><th>Date</th></tr>
        </ng-template>
        <ng-template pTemplate="body" let-t>
          <tr>
            <td style="text-transform:capitalize">{{t.module_code}}</td>
            <td><code>{{t.entity_id | slice:0:8}}</code></td>
            <td><p-tag [value]="t.previous_status" severity="warning" /></td>
            <td><p-tag [value]="t.new_status" severity="success" /></td>
            <td>@if (t.requires_approval) { <p-tag value="Yes" severity="info" /> } @else { <span style="color:var(--text-muted)">-</span> }</td>
            <td>{{t.transitioned_at | appDate}}</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted)">No transitions recorded</td></tr></ng-template>
      </p-table>

      <h3 class="section-title" style="font-size:var(--font-size-base);margin-top:24px">{{ i18n.currentLang()==='ar' ? 'الانتقالات بالوحدة' : 'Transitions by Module' }}</h3>
      <p-table [value]="lifecycleByModule()" [rows]="20" styleClass="p-datatable-sm p-datatable-striped">
        <ng-template pTemplate="header"><tr><th>Module</th><th>Transitions</th><th>Last</th></tr></ng-template>
        <ng-template pTemplate="body" let-m>
          <tr>
            <td style="font-weight:600;text-transform:capitalize">{{m.module_code}}</td>
            <td>{{m.transition_count}}</td>
            <td>{{m.last_transition | appDate}}</td>
          </tr>
        </ng-template>
      </p-table>
    </div>`
})
export class WorkflowMetricsTabComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  kpis = signal<MetricCard[]>([]);
  workflowStatus = signal<GrcRecord[]>([]);
  chainStatus = signal<GrcRecord[]>([]);
  approvalStatus = signal<GrcRecord[]>([]);
  triggersByModule = signal<GrcRecord[]>([]);
  lifecycleByModule = signal<GrcRecord[]>([]);
  recentTransitions = signal<GrcRecord[]>([]);
  slaBreaches = signal<GrcRecord[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>(`${this.api}/automation-admin/workflow-metrics`).subscribe({
      next: data => {
        const wfTotal = (data.workflows?.statusBreakdown || []).reduce((s: number, r: GrcRecord) => s + r.count, 0);
        const chainTotal = (data.chains?.statusBreakdown || []).reduce((s: number, r: GrcRecord) => s + r.count, 0);
        const pendingApprovals = (data.approvals?.statusBreakdown || []).find((r) => r.status === 'pending')?.count || 0;
        const totalTransitions = (data.lifecycle?.transitionsByModule || []).reduce((s: number, r: GrcRecord) => s + r.transition_count, 0);

        this.kpis.set([
          { label: 'Workflow Instances', value: wfTotal, icon: 'pi-sitemap', color: '#4338ca' },
          { label: 'Chain Instances', value: chainTotal, icon: 'pi-link', color: '#0891b2' },
          { label: 'Pending Approvals', value: pendingApprovals, icon: 'pi-clock', color: '#d97706' },
          { label: 'Total Transitions', value: totalTransitions, icon: 'pi-sync', color: '#059669' },
          { label: 'SLA Breaches', value: data.slaBreaches?.length || 0, icon: 'pi-exclamation-triangle', color: '#dc2626' },
        ]);
        this.workflowStatus.set(data.workflows?.statusBreakdown || []);
        this.chainStatus.set(data.chains?.statusBreakdown || []);
        this.approvalStatus.set(data.approvals?.statusBreakdown || []);
        this.triggersByModule.set(data.aiTriggers?.byModule || []);
        this.lifecycleByModule.set(data.lifecycle?.transitionsByModule || []);
        this.recentTransitions.set(data.recentTransitions || []);
        this.slaBreaches.set(data.slaBreaches || []);
      },
      error: () => {
        this.kpis.set([]);
        this.workflowStatus.set([]);
      },
    });
  }
}
