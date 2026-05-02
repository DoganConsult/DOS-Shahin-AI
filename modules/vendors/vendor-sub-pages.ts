import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { environment } from '@env/environment';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

function asRecord(value: any): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function asRecordArray(value: any): Record<string, any>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
    : [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

const SHARED_IMPORTS = [CommonModule, PageShellComponent, StatusBadgeComponent, TableModule, CardModule, ButtonModule, TagModule, AppDatePipe];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-overview',
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="truck" [title]="i18n.translate('nav.vendors')" [subtitle]="'Overview'" [breadcrumbs]="['Dashboard','Vendor Risk','Overview']" [loading]="loading">
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
  kpis: { label: string; value: number }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors`).subscribe({
      next: (res) => {
        const payload = asRecord(res);
        const data = Array.isArray(res) ? asRecordArray(res) : asRecordArray(payload['vendors']);
        this.kpis = [
          { label: 'Total Vendors', value: data.length },
          { label: 'Active', value: data.filter((d) => asString(d['status']) === 'active').length },
          { label: 'High Risk', value: data.filter((d) => ['high','critical'].includes(asString(d['risk_tier']))).length },
          { label: 'Pending Review', value: data.filter((d) => asString(d['status']) === 'pending_review').length },
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
  standalone: true,
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
        const payload = asRecord(data);
        const list = Array.isArray(data) ? asRecordArray(data) : asRecordArray(payload['vendors']);
        this.vendors = list.map((v) => ({ ...v, dd_status: asString(v['dd_status']) || 'not_started' }));
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
  standalone: true,
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
    this.http.get<unknown[]>(`${environment.apiUrl}/vendors-advanced/sla-breaches`).subscribe({
      next: (data) => {
        this.items = Array.isArray(data)
          ? data.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
          : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-fourth-party',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="layers" [title]="'Fourth-Party Risk'" [subtitle]="'Sub-vendor and supply chain risk'" [breadcrumbs]="['Dashboard','Vendor Risk','Fourth-Party']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Primary Vendor</th><th>Sub-Vendor</th><th>Service</th><th>Risk Tier</th><th>Status</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.vendor_name || r.vendor_id | slice:0:8}}</td>
          <td>{{r.sub_vendor_name || r.name}}</td>
          <td>{{r.service_description || r.service || '\u2014'}}</td>
          <td><p-tag [value]="r.risk_tier || 'unrated'" [severity]="r.risk_tier === 'critical' ? 'danger' : r.risk_tier === 'high' ? 'warning' : 'info'" /></td>
          <td><app-status-badge [status]="r.status || 'active'" /></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No fourth-party vendors registered</td></tr></ng-template>
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
        const payload = data && typeof data === 'object' ? (data as Record<string, any>) : {};
        const vendors = Array.isArray(data)
          ? data.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
          : (Array.isArray(payload['vendors']) ? payload['vendors'].filter((item): item is Record<string, any> => !!item && typeof item === 'object') : []);
        if (vendors.length === 0) { this.loading = false; this.cdr.markForCheck(); return; }
        let loaded = 0;
        vendors.forEach((v) => {
          this.http.get<any>(`${environment.apiUrl}/vendors-advanced/fourth-party/${String(v['vendor_id'] ?? '')}`).subscribe({
            next: (fp) => {
              const fourthParty = fp && typeof fp === 'object' ? (fp as Record<string, any>) : {};
              const list = Array.isArray(fp)
                ? fp.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
                : ((Array.isArray(fourthParty['subVendors']) ? fourthParty['subVendors'] : Array.isArray(fourthParty['sub_vendors']) ? fourthParty['sub_vendors'] : [])
                    .filter((item): item is Record<string, any> => !!item && typeof item === 'object'));
              list.forEach((sv) => this.items.push({ ...sv, vendor_name: v['name'], vendor_id: v['vendor_id'] }));
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
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="pie-chart" [title]="'Concentration Risk'" [subtitle]="'Vendor concentration analysis'" [breadcrumbs]="['Dashboard','Vendor Risk','Concentration']" [loading]="loading">
      <p-card header="Concentration Analysis"><pre class="text-sm">{{concentration | json}}</pre></p-card>
    </app-page-shell>
  `
})
export class VendorConcentrationComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  concentration: Record<string, any> | null = null;
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/vendors-advanced/concentration`).subscribe({
      next: (data) => {
        this.concentration = data && typeof data === 'object' ? (data as Record<string, any>) : {};
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-offboarding',
  standalone: true,
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
        const payload = data && typeof data === 'object' ? (data as Record<string, any>) : {};
        const list = Array.isArray(data)
          ? data.filter((item): item is Record<string, any> => !!item && typeof item === 'object')
          : (Array.isArray(payload['vendors']) ? payload['vendors'].filter((item): item is Record<string, any> => !!item && typeof item === 'object') : []);
        this.vendors = list.filter((vendor) => {
          const status = typeof vendor['status'] === 'string' ? vendor['status'] : '';
          const contractExpiry = typeof vendor['contract_expiry'] === 'string' ? vendor['contract_expiry'] : '';
          return status === 'offboarding' || status === 'inactive' || (contractExpiry ? new Date(contractExpiry) < new Date() : false);
        });
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
  standalone: true,
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
        const payload = data && typeof data === 'object' ? (data as Record<string, any>) : {};
        const vendors = Array.isArray(data) ? data : (Array.isArray(payload['vendors']) ? payload['vendors'] : []);
        if (vendors.length === 0) { this.loading = false; this.cdr.markForCheck(); return; }
        let loaded = 0;
        vendors.forEach((vendor) => {
          const v = vendor && typeof vendor === 'object' ? (vendor as Record<string, any>) : {};
          this.http.get<any>(`${environment.apiUrl}/vendors-advanced/monitoring/${String(v['vendor_id'] ?? '')}`).subscribe({
            next: (m) => {
              const monitoring = m && typeof m === 'object' ? (m as Record<string, any>) : {};
              const list = Array.isArray(m) ? m : (Array.isArray(monitoring['signals']) ? monitoring['signals'] : []);
              list.forEach((signal) => {
                if (signal && typeof signal === 'object') {
                  this.signals.push({ ...(signal as Record<string, any>), vendor_name: v['name'] });
                }
              });
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
