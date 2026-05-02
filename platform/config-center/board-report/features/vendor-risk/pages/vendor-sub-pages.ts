import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'carbon-components-angular';
import { environment } from '@env/environment';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

const SHARED_IMPORTS = [CommonModule, PageShellComponent, StatusBadgeComponent, TableModule, CardModule, ButtonModule, TagModule, AppDatePipe];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-overview',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="truck" [title]="i18n.translate('nav.vendors')" [subtitle]="'Overview'" [breadcrumbs]="['Dashboard','Vendor Risk','Overview']" [loading]="loading">
      <div class="flex align-items-center gap-2 mb-3">
        <app-status-badge [status]="'active'" [label]="'Live'" />
        <span class="text-sm" style="color: var(--text-muted)">{{ today | appDate:'relative' }}</span>
      </div>
      <div class="grid">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{kpi.value}}</div><div class="text-sm text-color-secondary mt-1">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class VendorOverviewComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  today = new Date();
  kpis: { label: string; value: number }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.vendors || []);
        this.kpis = [
          { label: 'Total Vendors', value: data.length },
          { label: 'Active', value: data.filter((d: Record<string, any>) => d.status === 'active').length },
          { label: 'High Risk', value: data.filter((d: Record<string, any>) => ['high','critical'].includes(d.risk_tier)).length },
          { label: 'Pending Review', value: data.filter((d: Record<string, any>) => d.status === 'pending_review').length },
        ];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-due-diligence',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="search" [title]="'Due Diligence'" [subtitle]="'Vendor due diligence workflows'" [breadcrumbs]="['Dashboard','Vendor Risk','Due Diligence']" [loading]="loading">
      <p-table [value]="vendors" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Vendor</th><th>Status</th><th>Steps Completed</th><th>Last Updated</th></tr></ng-template>
        <ng-template pTemplate="body" let-v><tr>
          <td>{{v.name}}</td>
          <td><app-status-badge [status]="v.dd_status || v.status || 'pending'" /></td>
          <td>{{v.completed_steps || 0}} / {{v.total_steps || '\u2014'}}</td>
          <td>{{v.updated_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No due diligence workflows in progress</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class VendorDueDiligenceComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  vendors: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors`).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data?.vendors || []);
        this.vendors = list.map((v: Record<string, any>) => ({ ...v, dd_status: v.dd_status || 'not_started' }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-sla',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="clock" [title]="'SLA Monitoring'" [subtitle]="'Track SLA compliance and breaches'" [breadcrumbs]="['Dashboard','Vendor Risk','SLA']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Vendor</th><th>Metric</th><th>Status</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.vendor_id | slice:0:8}}</td>
          <td>{{r.metric_name || r.metric_code}}</td>
          <td><app-status-badge [status]="r.remediation_status" /></td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No SLA breaches</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class VendorSlaComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/vendors-advanced/sla-breaches`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-fourth-party',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="layers" [title]="'Fourth-Party Risk'" [subtitle]="'Sub-vendor and supply chain risk'" [breadcrumbs]="['Dashboard','Vendor Risk','Fourth-Party']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Primary Vendor</th><th>Sub-Vendor</th><th>Service</th><th>Risk Tier</th><th>Status</th><th>Added</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.vendor_name || r.vendor_id | slice:0:8}}</td>
          <td>{{r.sub_vendor_name || r.name}}</td>
          <td>{{r.service_description || r.service || '\u2014'}}</td>
          <td><p-tag [value]="r.risk_tier || 'unrated'" [severity]="r.risk_tier === 'critical' ? 'danger' : r.risk_tier === 'high' ? 'warning' : 'info'" /></td>
          <td><app-status-badge [status]="r.status || 'active'" /></td>
          <td>{{r.created_at | appDate:'short'}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center p-4">No fourth-party vendors registered</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class VendorFourthPartyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors`).subscribe({
      next: (data) => {
        const vendors = Array.isArray(data) ? data : (data?.vendors || []);
        if (vendors.length === 0) { this.loading = false; this.cdr.markForCheck(); return; }
        let loaded = 0;
        vendors.forEach((v: Record<string, any>) => {
          this.http.get<any>(`${environment.apiUrl}/vendors-advanced/fourth-party/${v.vendor_id}`).subscribe({
            next: (fp) => {
              const list = Array.isArray(fp) ? fp : (fp?.subVendors || fp?.sub_vendors || []);
              list.forEach((sv: Record<string, any>) => this.items.push({ ...sv, vendor_name: v.name, vendor_id: v.vendor_id }));
            },
            complete: () => { loaded++; if (loaded >= vendors.length) { this.loading = false; this.cdr.markForCheck(); } },
            error: () => { loaded++; if (loaded >= vendors.length) { this.loading = false; this.cdr.markForCheck(); } }
          });
        });
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-concentration',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="pie-chart" [title]="'Concentration Risk'" [subtitle]="'Vendor concentration analysis'" [breadcrumbs]="['Dashboard','Vendor Risk','Concentration']" [loading]="loading">
      <div class="flex align-items-center gap-2 mb-3">
        <app-status-badge [status]="concentration ? 'active' : 'info'" [label]="concentration ? 'Data Available' : 'Loading'" />
        <span class="text-sm" style="color: var(--text-muted)">{{ today | appDate:'relative' }}</span>
      </div>
      <p-card header="Concentration Analysis"><pre class="text-sm">{{concentration | json}}</pre></p-card>
    </app-page-shell>
  `
})
export class VendorConcentrationComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  today = new Date();
  concentration: Record<string, any> | null = null;
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors-advanced/concentration`).subscribe({
      next: (data) => { this.concentration = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-offboarding',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="user-minus" [title]="'Vendor Offboarding'" [subtitle]="'Manage vendor offboarding checklists'" [breadcrumbs]="['Dashboard','Vendor Risk','Offboarding']" [loading]="loading">
      <p-table [value]="vendors" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Vendor</th><th>Risk Tier</th><th>Status</th><th>Contract Expiry</th></tr></ng-template>
        <ng-template pTemplate="body" let-v><tr>
          <td>{{v.name}}</td>
          <td><p-tag [value]="v.risk_tier || 'unrated'" [severity]="v.risk_tier === 'critical' ? 'danger' : v.risk_tier === 'high' ? 'warning' : 'info'" /></td>
          <td><app-status-badge [status]="v.offboarding_status || v.status || 'active'" /></td>
          <td>{{v.contract_expiry | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No vendors in offboarding</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class VendorOffboardingComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  vendors: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors`).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data?.vendors || []);
        this.vendors = list.filter((v: Record<string, any>) =>
          v.status === 'offboarding' || v.status === 'inactive' ||
          (v.contract_expiry && new Date(v.contract_expiry) < new Date())
        );
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-monitoring',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="eye" [title]="'Continuous Monitoring'" [subtitle]="'Ongoing vendor monitoring signals'" [breadcrumbs]="['Dashboard','Vendor Risk','Monitoring']" [loading]="loading">
      <p-table [value]="signals" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Vendor</th><th>Signal</th><th>Severity</th><th>Status</th><th>Detected</th></tr></ng-template>
        <ng-template pTemplate="body" let-s><tr>
          <td>{{s.vendor_name || s.vendor_id | slice:0:8}}</td>
          <td>{{s.signal_type || s.type || s.description || '\u2014'}}</td>
          <td><p-tag [value]="s.severity || 'info'" [severity]="s.severity === 'critical' ? 'danger' : s.severity === 'high' ? 'warning' : 'info'" /></td>
          <td><app-status-badge [status]="s.status || 'open'" /></td>
          <td>{{s.detected_at || s.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No monitoring signals detected</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class VendorMonitoringComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  signals: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors`).subscribe({
      next: (data) => {
        const vendors = Array.isArray(data) ? data : (data?.vendors || []);
        if (vendors.length === 0) { this.loading = false; this.cdr.markForCheck(); return; }
        let loaded = 0;
        vendors.forEach((v: Record<string, any>) => {
          this.http.get<any>(`${environment.apiUrl}/vendors-advanced/monitoring/${v.vendor_id}`).subscribe({
            next: (m) => {
              const list = Array.isArray(m) ? m : (m?.signals || []);
              list.forEach((s: Record<string, any>) => this.signals.push({ ...s, vendor_name: v.name }));
            },
            complete: () => { loaded++; if (loaded >= vendors.length) { this.loading = false; this.cdr.markForCheck(); } },
            error: () => { loaded++; if (loaded >= vendors.length) { this.loading = false; this.cdr.markForCheck(); } }
          });
        });
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Enterprise Uplift Pages — Home, Engagements, Issues, Reports, Admin
// ════════════════════════════════════════════════════════════════════════════

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-risk-home',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="truck" [title]="'Vendor Risk Home'" [subtitle]="'Dashboard & work queue'" [breadcrumbs]="['Dashboard','Vendor Risk','Home']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold" [style.color]="kpi.color">{{kpi.value}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
      <h3 class="mt-4 mb-2">Work Queue</h3>
      <p-table [value]="workQueue" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Task</th><th>Vendor</th><th>Type</th><th>Due</th><th>Status</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title || r.task}}</td>
          <td>{{r.vendor_name || '\u2014'}}</td>
          <td><p-tag [value]="r.task_type || 'task'" /></td>
          <td>{{r.due_date | appDate}}</td>
          <td><app-status-badge [status]="r.status" /></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No pending tasks</td></tr></ng-template>
      </p-table>
      <h3 class="mt-4 mb-2">Recent Activity</h3>
      <div *ngFor="let a of recentActivity" class="p-2 border-bottom-1 surface-border">
        <span class="font-semibold">{{a.action}}</span> — {{a.entity_name || a.vendor_name}} <span class="text-sm" style="color: var(--text-muted)">{{a.timestamp | appDate}}</span>
      </div>
      <div *ngIf="recentActivity.length === 0 && !loading" class="text-center p-3" style="color: var(--text-muted)">No recent activity</div>
    </app-page-shell>
  `
})
export class VendorRiskHomeComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  kpis: { label: string; value: number; color: string }[] = [];
  workQueue: Record<string, any>[] = [];
  recentActivity: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendor-dashboard/kpis`).subscribe({
      next: (d) => {
        this.kpis = [
          { label: 'Total Vendors', value: d.totalVendors ?? 0, color: 'var(--info)' },
          { label: 'High Risk', value: d.highRiskCount ?? 0, color: 'var(--severity-critical)' },
          { label: 'Pending DD', value: d.pendingDD ?? 0, color: 'var(--warning)' },
          { label: 'Expiring Contracts', value: d.expiringContracts30d ?? 0, color: 'var(--orange-500)' },
          { label: 'SLA Breaches', value: d.openSLABreaches ?? 0, color: 'var(--severity-critical)' },
          { label: 'Monitoring Alerts', value: d.unackedMonitoringAlerts ?? 0, color: 'var(--warning)' },
          { label: 'Open Issues', value: d.openIssues ?? 0, color: 'var(--orange-500)' },
          { label: 'Assessment %', value: d.assessmentCompletionPct ?? 0, color: 'var(--success)' },
        ];
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
    this.http.get<any>(`${environment.apiUrl}/vendor-dashboard/work-queue`).subscribe({
      next: (res) => { this.workQueue = Array.isArray(res) ? res : (res?.items || []); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<any>(`${environment.apiUrl}/vendor-dashboard/recent-activity`).subscribe({
      next: (res) => { this.recentActivity = Array.isArray(res) ? res : (res?.items || []); this.cdr.markForCheck(); },
      error: () => this.cdr.markForCheck()
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-engagements',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="file-text" [title]="'Engagements'" [subtitle]="'Contract and engagement lifecycle tracking'" [breadcrumbs]="['Dashboard','Vendor Risk','Engagements']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold" [style.color]="kpi.color">{{kpi.value}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Vendor</th><th>Type</th><th>Contract Ref</th><th>Start</th><th>End</th><th>Value</th><th>Status</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td>{{r.vendor_name || '\u2014'}}</td>
          <td><p-tag [value]="r.engagement_type || 'contract'" /></td>
          <td>{{r.contract_ref || '\u2014'}}</td>
          <td>{{r.start_date | appDate}}</td>
          <td>{{r.end_date | appDate}}</td>
          <td>{{r.total_value ? (r.total_value | number) + ' ' + (r.currency || 'SAR') : '\u2014'}}</td>
          <td><app-status-badge [status]="r.status" /></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="8" class="text-center p-4">No engagements found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class VendorEngagementsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  kpis: { label: string; value: number; color: string }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendor-engagements`).subscribe({
      next: (res) => {
        const rows = res?.rows || (Array.isArray(res) ? res : []);
        this.items = rows;
        const now = new Date();
        const in30d = new Date(now.getTime() + 30 * 86400000);
        this.kpis = [
          { label: 'Total', value: res?.total ?? rows.length, color: 'var(--info)' },
          { label: 'Active', value: rows.filter((r: Record<string, any>) => r.status === 'active').length, color: 'var(--success)' },
          { label: 'Expiring (30d)', value: rows.filter((r: Record<string, any>) => r.end_date && new Date(r.end_date) <= in30d && new Date(r.end_date) >= now).length, color: 'var(--warning)' },
          { label: 'Expired', value: rows.filter((r: Record<string, any>) => r.status === 'expired' || (r.end_date && new Date(r.end_date) < now)).length, color: 'var(--severity-critical)' },
        ];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-issues',
    imports: [...SHARED_IMPORTS, TabsModule],
    template: `
    <app-page-shell icon="alert-circle" [title]="'Issues & Exceptions'" [subtitle]="'Track vendor issues and manage exception requests'" [breadcrumbs]="['Dashboard','Vendor Risk','Issues']" [loading]="loading">
      <cds-tabs>
        <cds-tab heading="Issues">
          <p-table [value]="issues" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
            <ng-template pTemplate="header"><tr><th>Source</th><th>Vendor</th><th>Title</th><th>Severity</th><th>Status</th><th>Assigned</th><th>Due</th><th>Action</th></tr></ng-template>
            <ng-template pTemplate="body" let-r><tr>
              <td><p-tag [value]="r.source_type || 'manual'" /></td>
              <td>{{r.vendor_name || '\u2014'}}</td>
              <td>{{r.title}}</td>
              <td><app-status-badge [status]="r.severity" /></td>
              <td><app-status-badge [status]="r.status" /></td>
              <td>{{r.assigned_to || '\u2014'}}</td>
              <td>{{r.due_date | appDate}}</td>
              <td><button pButton label="Escalate" class="p-button-sm p-button-outlined p-button-warning" (click)="onEscalate(r)" [disabled]="r.severity === 'critical'"></button></td>
            </tr></ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="8" class="text-center p-4">No issues found</td></tr></ng-template>
          </p-table>
        </cds-tab>
        <cds-tab heading="Exceptions">
          <p-table [value]="exceptions" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
            <ng-template pTemplate="header"><tr><th>Vendor</th><th>Type</th><th>Title</th><th>Status</th><th>Valid Until</th><th>Requested By</th><th>Actions</th></tr></ng-template>
            <ng-template pTemplate="body" let-r><tr>
              <td>{{r.vendor_name || '\u2014'}}</td>
              <td><p-tag [value]="r.exception_type || 'general'" /></td>
              <td>{{r.title}}</td>
              <td><app-status-badge [status]="r.status" /></td>
              <td>{{r.valid_until | appDate}}</td>
              <td>{{r.requested_by || '\u2014'}}</td>
              <td>
                <button *ngIf="r.status === 'pending'" pButton label="Approve" class="p-button-sm p-button-outlined p-button-success mr-1" (click)="onApprove(r)"></button>
                <button *ngIf="r.status === 'pending'" pButton label="Reject" class="p-button-sm p-button-outlined p-button-danger" (click)="onReject(r)"></button>
              </td>
            </tr></ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="7" class="text-center p-4">No exceptions found</td></tr></ng-template>
          </p-table>
        </cds-tab>
      </cds-tabs>
    </app-page-shell>
  `
})
export class VendorIssuesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  issues: Record<string, any>[] = [];
  exceptions: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendor-issues/issues`).subscribe({
      next: (res) => { this.issues = res?.rows || (Array.isArray(res) ? res : []); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<any>(`${environment.apiUrl}/vendor-issues/exceptions`).subscribe({
      next: (res) => { this.exceptions = res?.rows || (Array.isArray(res) ? res : []); this.cdr.markForCheck(); },
      error: () => this.cdr.markForCheck()
    });
  }
  onEscalate(item: Record<string, any>) {
    this.http.post<any>(`${environment.apiUrl}/vendor-issues/issues/${item.issue_id}/escalate`, {}).subscribe({
      next: (updated) => { Object.assign(item, updated); this.cdr.markForCheck(); }
    });
  }
  onApprove(item: Record<string, any>) {
    this.http.put<any>(`${environment.apiUrl}/vendor-issues/exceptions/${item.exception_id}/approve`, {}).subscribe({
      next: (updated) => { Object.assign(item, updated); this.cdr.markForCheck(); }
    });
  }
  onReject(item: Record<string, any>) {
    this.http.put<any>(`${environment.apiUrl}/vendor-issues/exceptions/${item.exception_id}/reject`, {}).subscribe({
      next: (updated) => { Object.assign(item, updated); this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-reports-page',
    imports: [...SHARED_IMPORTS, TabsModule],
    template: `
    <app-page-shell icon="bar-chart-2" [title]="'Reports'" [subtitle]="'Vendor risk analytics and reporting'" [breadcrumbs]="['Dashboard','Vendor Risk','Reports']" [loading]="loading">
      <div class="flex align-items-center gap-2 mb-3">
        <app-status-badge [status]="'active'" [label]="'Reports'" />
        <span class="text-sm" style="color: var(--text-muted)">{{ today | appDate:'short' }}</span>
      </div>
      <cds-tabs>
        <cds-tab heading="Scorecard"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
        <cds-tab heading="Concentration"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
        <cds-tab heading="Risk Tiers"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
        <cds-tab heading="DD Completion"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
        <cds-tab heading="SLA Performance"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
        <cds-tab heading="Fourth-Party"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
        <cds-tab heading="Trends"><p-table [value]="reportData" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading"><ng-template pTemplate="body" let-r><tr><td *ngFor="let col of reportCols">{{r[col]}}</td></tr></ng-template><ng-template pTemplate="emptymessage"><tr><td [attr.colspan]="reportCols.length" class="text-center p-4">No data</td></tr></ng-template></p-table></cds-tab>
      </cds-tabs>
    </app-page-shell>
  `
})
export class VendorReportsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  today = new Date();
  reportData: Record<string, any>[] = [];
  reportCols: string[] = [];
  private endpoints = ['scorecard', 'concentration', 'risk-tiers', 'dd-completion', 'sla-performance', 'fourth-party', 'trends'];
  ngOnInit() { this.loadReport(0); }
  onTabChange(event: { index: number }) { this.loadReport(event.index); }
  private loadReport(index: number) {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/vendor-reports/${this.endpoints[index]}`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.rows || res?.data || [res]);
        this.reportData = Array.isArray(data) ? data : [data];
        this.reportCols = this.reportData.length > 0 ? Object.keys(this.reportData[0]).filter(k => typeof this.reportData[0][k] !== 'object') : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.reportData = []; this.reportCols = []; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-admin',
    imports: [...SHARED_IMPORTS, TabsModule],
    template: `
    <app-page-shell icon="settings" [title]="'Vendor Admin'" [subtitle]="'Module configuration and templates'" [breadcrumbs]="['Dashboard','Vendor Risk','Admin']" [loading]="loading">
      <cds-tabs>
        <cds-tab heading="Configuration">
          <p-table [value]="configs" styleClass="p-datatable-sm" [loading]="loading">
            <ng-template pTemplate="header"><tr><th>Key</th><th>Value</th><th>Updated</th></tr></ng-template>
            <ng-template pTemplate="body" let-r><tr>
              <td><code>{{r.config_key}}</code></td>
              <td>{{r.config_value | json}}</td>
              <td>{{r.updated_at | appDate}}</td>
            </tr></ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center p-4">No configuration found</td></tr></ng-template>
          </p-table>
        </cds-tab>
        <cds-tab heading="Assessment Templates">
          <p-table [value]="templates" styleClass="p-datatable-sm" [loading]="loading">
            <ng-template pTemplate="header"><tr><th>Name</th><th>Type</th><th>Status</th><th>Created</th></tr></ng-template>
            <ng-template pTemplate="body" let-r><tr>
              <td>{{r.template_name || r.name}}</td>
              <td><p-tag [value]="r.assessment_type || 'standard'" /></td>
              <td><app-status-badge [status]="r.is_active ? 'active' : 'inactive'" /></td>
              <td>{{r.created_at | appDate}}</td>
            </tr></ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No templates</td></tr></ng-template>
          </p-table>
        </cds-tab>
        <cds-tab heading="DD Workflows">
          <p-table [value]="ddTemplates" styleClass="p-datatable-sm" [loading]="loading">
            <ng-template pTemplate="header"><tr><th>Name</th><th>Steps</th><th>Status</th></tr></ng-template>
            <ng-template pTemplate="body" let-r><tr>
              <td>{{r.template_name || r.name}}</td>
              <td>{{r.steps?.length || 0}}</td>
              <td><app-status-badge [status]="r.is_active ? 'active' : 'inactive'" /></td>
            </tr></ng-template>
            <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center p-4">No workflow templates</td></tr></ng-template>
          </p-table>
        </cds-tab>
      </cds-tabs>
    </app-page-shell>
  `
})
export class VendorAdminComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  configs: Record<string, any>[] = [];
  templates: Record<string, any>[] = [];
  ddTemplates: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendor-admin/config`).subscribe({
      next: (res) => { this.configs = Array.isArray(res) ? res : []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<any>(`${environment.apiUrl}/vendor-admin/templates/assessment`).subscribe({
      next: (res) => { this.templates = Array.isArray(res) ? res : (res?.templates || []); this.cdr.markForCheck(); },
      error: () => this.cdr.markForCheck()
    });
    this.http.get<any>(`${environment.apiUrl}/vendor-admin/templates/dd-workflow`).subscribe({
      next: (res) => { this.ddTemplates = Array.isArray(res) ? res : (res?.templates || []); this.cdr.markForCheck(); },
      error: () => this.cdr.markForCheck()
    });
  }
}
