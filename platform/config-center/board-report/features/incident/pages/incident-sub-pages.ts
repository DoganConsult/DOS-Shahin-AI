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
import { environment } from '@env/environment';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

const SHARED_IMPORTS = [CommonModule, PageShellComponent, StatusBadgeComponent, TableModule, CardModule, ButtonModule, TagModule, AppDatePipe];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-overview',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="bell" [title]="i18n.translate('nav.incidents')" [subtitle]="'Overview'" [breadcrumbs]="['Dashboard','Incidents','Overview']" [loading]="loading">
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
export class IncidentOverviewComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  today = new Date();
  kpis: { label: string; value: number }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        const active = data.filter((d: Record<string, any>) => !['resolved', 'closed'].includes(d.status)).length;
        const resolved = data.filter((d: Record<string, any>) => d.status === 'resolved' || d.status === 'closed').length;
        this.kpis = [
          { label: 'Total Incidents', value: data.length },
          { label: 'Active', value: active },
          { label: 'Resolved', value: resolved },
          { label: 'Investigation', value: data.filter((d: Record<string, any>) => d.status === 'investigating').length },
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
    selector: 'app-incident-near-miss',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="alert-triangle" [title]="'Near-Miss Reports'" [subtitle]="'Track and manage near-miss events'" [breadcrumbs]="['Dashboard','Incidents','Near-Miss']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Severity</th><th>Status</th><th>Reported</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.severity_estimate" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.reported_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No near-miss reports found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentNearMissComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/incidents-advanced/near-miss`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-pir',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="clipboard-check" [title]="'Post-Incident Review'" [subtitle]="'PIR workflow management'" [breadcrumbs]="['Dashboard','Incidents','PIR']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Status</th><th>Scheduled</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.pir_type" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.scheduled_date | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No PIR records found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentPirComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/incidents-advanced/pir`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-trends',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="trending-up" [title]="'Trends & Analytics'" [subtitle]="'Incident trend analysis and recurring patterns'" [breadcrumbs]="['Dashboard','Incidents','Trends']" [loading]="loading">
      <div class="flex align-items-center gap-2 mb-3">
        <app-status-badge [status]="'info'" [label]="'Analytics'" />
        <span class="text-sm" style="color: var(--text-muted)">{{ today | appDate:'relative' }}</span>
      </div>
      <div class="grid">
        <div class="col-12"><p-card header="Trend Data"><pre class="text-sm">{{trends | json}}</pre></p-card></div>
        <div class="col-12"><p-card header="Recurring Patterns"><pre class="text-sm">{{patterns | json}}</pre></p-card></div>
      </div>
    </app-page-shell>
  `
})
export class IncidentTrendsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  today = new Date();
  trends: Record<string, any> | null = null;
  patterns: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents-advanced/trends`).subscribe({
      next: (d) => { this.trends = d; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<any[]>(`${environment.apiUrl}/incidents-advanced/patterns`).subscribe({
      next: (d) => { this.patterns = d; this.cdr.markForCheck(); },
      error: () => {}
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-regulatory',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="file-text" [title]="'Regulatory Reporting'" [subtitle]="'NCA/SAMA regulatory notifications'" [breadcrumbs]="['Dashboard','Incidents','Regulatory']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Incident</th><th>Authority</th><th>Status</th><th>Due Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.incident_id}}</td>
          <td>{{r.authority | displayValue}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.due_date | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No regulatory reportable incidents</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentRegulatoryComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/incidents-advanced/regulatory`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-taxonomy',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="git-branch" [title]="'Incident Taxonomy'" [subtitle]="'Classification tree for incidents'" [breadcrumbs]="['Dashboard','Incidents','Taxonomy']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Code</th><th>Name</th><th>Type</th><th>Severity Hint</th><th>Regulatory</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.code}}</code></td>
          <td>{{r.name_en}}</td>
          <td><p-tag [value]="r.node_type" /></td>
          <td><app-status-badge [status]="r.severity_hint" /></td>
          <td><i [class]="r.regulatory_flag ? 'pi pi-check text-green-500' : 'pi pi-minus text-color-secondary'"></i></td>
          <td>{{r.created_at | appDate:'short'}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center p-4">No taxonomy nodes</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentTaxonomyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/incidents-advanced/taxonomy`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-lessons',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="book-open" [title]="'Lessons Learned'" [subtitle]="'Knowledge from past incidents'" [breadcrumbs]="['Dashboard','Incidents','Lessons Learned']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Status</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center p-4">No lessons learned recorded</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentLessonsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        this.items = data.filter((d: Record<string, any>) => d.lessons_learned);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-investigation',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="search" [title]="'Investigation'" [subtitle]="'Active incident investigations'" [breadcrumbs]="['Dashboard','Incidents','Investigation']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Severity</th><th>Status</th><th>Assigned To</th><th>Reported</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.assigned_to || '\u2014'}}</td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No active investigations</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentInvestigationComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        this.items = data.filter((d: Record<string, any>) => d.status === 'investigating');
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-war-room',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="zap" [title]="'War Room'" [subtitle]="'Active incident war rooms'" [breadcrumbs]="['Dashboard','Incidents','War Room']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Status</th><th>Commander</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.commander_id || '\u2014'}}</td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No active war rooms</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentWarRoomComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/cooperative-workflows/war-rooms`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Enterprise Uplift Pages — Triage, Cases, Breach, Impact, Evidence, CAPA, Reports, Admin
// ════════════════════════════════════════════════════════════════════════════

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-triage',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="filter" [title]="'Triage Queue'" [subtitle]="'Incoming incidents awaiting triage'" [breadcrumbs]="['Dashboard','Incidents','Triage']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold" [style.color]="kpi.color">{{kpi.value}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Severity</th><th>Category</th><th>Reported</th><th>Action</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td>{{r.category || '\u2014'}}</td>
          <td>{{r.created_at | appDate}}</td>
          <td><button pButton label="Triage" class="p-button-sm p-button-outlined" (click)="onTriage(r)"></button></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No incidents awaiting triage</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentTriageComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  kpis: { label: string; value: number; color: string }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        const pending = data.filter((d: Record<string, any>) => d.status === 'reported' || d.status === 'new');
        this.items = pending;
        this.kpis = [
          { label: 'Awaiting Triage', value: pending.length, color: 'var(--warning)' },
          { label: 'Critical', value: pending.filter((d: Record<string, any>) => d.severity === 'critical').length, color: 'var(--severity-critical)' },
          { label: 'High', value: pending.filter((d: Record<string, any>) => d.severity === 'high').length, color: 'var(--orange-500)' },
          { label: 'Total Today', value: data.length, color: 'var(--info)' },
        ];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
  onTriage(item: Record<string, any>) {
    this.http.post<any>(`${environment.apiUrl}/incidents/${item.id}/triage`, {
      severity_assigned: item.severity,
      priority_assigned: 'medium',
    }).subscribe({ next: () => { this.items = this.items.filter(i => i !== item); this.cdr.markForCheck(); } });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-cases',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="briefcase" [title]="'Cases'" [subtitle]="'Group related incidents into investigation cases'" [breadcrumbs]="['Dashboard','Incidents','Cases']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Case #</th><th>Title</th><th>Severity</th><th>Status</th><th>Opened</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.case_number || (r.case_id | slice:0:8)}}</code></td>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.opened_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No cases created</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentCasesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents/cases`).subscribe({
      next: (res) => { this.items = Array.isArray(res) ? res : (res?.cases || []); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-breach',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="shield-off" [title]="'Breach Reporting'" [subtitle]="'Data breach notification tracking and regulatory compliance'" [breadcrumbs]="['Dashboard','Incidents','Breach']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold" [style.color]="kpi.color">{{kpi.value}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Incident</th><th>Breach Type</th><th>Severity</th><th>Status</th><th>Authority Deadline</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.incident_id | slice:0:8}}</code></td>
          <td>{{r.breach_type || '\u2014'}}</td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.authority_deadline | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No breach records</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentBreachComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  kpis: { label: string; value: number; color: string }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents/breach-records`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.records || []);
        this.items = data;
        const pending = data.filter((d: Record<string, any>) => d.status !== 'closed' && d.status !== 'resolved');
        this.kpis = [
          { label: 'Total Breaches', value: data.length, color: 'var(--text-body)' },
          { label: 'Active', value: pending.length, color: 'var(--severity-critical)' },
          { label: 'Notification Pending', value: data.filter((d: Record<string, any>) => d.notification_required && !d.authority_notified_at).length, color: 'var(--warning)' },
          { label: 'Resolved', value: data.filter((d: Record<string, any>) => d.status === 'resolved' || d.status === 'closed').length, color: 'var(--success)' },
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
    selector: 'app-incident-impact',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="activity" [title]="'Impact & Timeline'" [subtitle]="'Incident impact analysis and event timeline'" [breadcrumbs]="['Dashboard','Incidents','Impact']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Incident</th><th>Impact Area</th><th>Severity</th><th>Financial Impact</th><th>Duration (hrs)</th><th>Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.incident_id | slice:0:8}}</code></td>
          <td>{{r.impact_area}}</td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td>{{r.financial_impact ? (r.financial_currency || 'SAR') + ' ' + r.financial_impact : '\u2014'}}</td>
          <td>{{r.duration_hours || '\u2014'}}</td>
          <td>{{r.occurred_at || r.created_at | appDate:'short'}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center p-4">No impact records</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentImpactComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents/impacts`).subscribe({
      next: (res) => { this.items = Array.isArray(res) ? res : (res?.impacts || []); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-evidence',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="paperclip" [title]="'Evidence & Artifacts'" [subtitle]="'Incident evidence collection and chain of custody'" [breadcrumbs]="['Dashboard','Incidents','Evidence']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Status</th><th>Incident</th><th>Collected By</th><th>Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title || '\u2014'}}</td>
          <td><p-tag [value]="r.evidence_type || 'document'" /></td>
          <td><app-status-badge [status]="r.status || 'open'" /></td>
          <td><code>{{r.incident_id | slice:0:8}}</code></td>
          <td>{{r.collected_by || '\u2014'}}</td>
          <td>{{r.collected_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center p-4">No evidence artifacts</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentEvidenceComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents/evidence`).subscribe({
      next: (res) => { this.items = Array.isArray(res) ? res : (res?.evidence || []); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-capa',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="check-square" [title]="'CAPA'" [subtitle]="'Corrective and Preventive Actions'" [breadcrumbs]="['Dashboard','Incidents','CAPA']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>Due</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.action_type || 'corrective'" /></td>
          <td><app-status-badge [status]="r.severity || r.priority" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.due_date | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No CAPA items</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentCapaComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/incidents/capa`).subscribe({
      next: (res) => { this.items = Array.isArray(res) ? res : (res?.actions || []); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-reports',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="file-text" [title]="'Incident Reports'" [subtitle]="'Generate and view incident management reports'" [breadcrumbs]="['Dashboard','Incidents','Reports']" [loading]="false">
      <div class="flex align-items-center gap-2 mb-3">
        <app-status-badge [status]="'active'" [label]="'Available'" />
        <span class="text-sm" style="color: var(--text-muted)">{{ today | appDate:'short' }}</span>
      </div>
      <div class="grid">
        <div class="col-12 md:col-4" *ngFor="let report of reports">
          <p-card [header]="report.title">
            <p style="color: var(--text-muted)">{{report.description}}</p>
            <ng-template pTemplate="footer">
              <button pButton [label]="'View'" icon="pi pi-eye" class="p-button-sm p-button-outlined" (click)="onViewReport(report.key)"></button>
            </ng-template>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class IncidentReportsComponent {
  i18n = inject(I18nService);
  today = new Date();
  reports = [
    { key: 'summary', title: 'Incident Summary', description: 'Overview of all incidents by severity, status, and resolution time.' },
    { key: 'trends', title: 'Trend Analysis', description: 'Incident trends over time with recurring pattern detection.' },
    { key: 'sla', title: 'SLA Compliance', description: 'SLA target achievement rates and breach analysis.' },
    { key: 'breach-history', title: 'Breach History', description: 'Complete history of data breach notifications and outcomes.' },
    { key: 'capa-status', title: 'CAPA Status', description: 'Corrective and preventive action tracking and completion rates.' },
    { key: 'impact-analysis', title: 'Impact Analysis', description: 'Financial and operational impact across incidents.' },
  ];
  onViewReport(_key: string) { /* placeholder */ }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-incident-admin',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="settings" [title]="'Incident Admin'" [subtitle]="'Module settings and configuration'" [breadcrumbs]="['Dashboard','Incidents','Admin']" [loading]="false">
      <div class="grid">
        <div class="col-12 md:col-6">
          <p-card header="Module Settings">
            <div class="flex flex-column gap-2">
              <div class="flex justify-content-between align-items-center"><span>Default SLA (hours)</span><strong>{{settings.defaultSlaHours}}</strong></div>
              <div class="flex justify-content-between align-items-center"><span>Auto-Triage</span><app-status-badge [status]="settings.autoTriage ? 'active' : 'inactive'" /></div>
              <div class="flex justify-content-between align-items-center"><span>Breach Notification Required</span><app-status-badge [status]="settings.breachNotification ? 'active' : 'inactive'" /></div>
              <div class="flex justify-content-between align-items-center"><span>CAPA Mandatory</span><app-status-badge [status]="settings.capaMandatory ? 'active' : 'inactive'" /></div>
              <div class="flex justify-content-between align-items-center"><span>Last Reviewed</span><span>{{ lastUpdated | appDate }}</span></div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6">
          <p-card header="SLA Configuration">
            <div class="flex flex-column gap-2">
              <div class="flex justify-content-between align-items-center"><span>Critical</span><strong>4 hrs</strong></div>
              <div class="flex justify-content-between align-items-center"><span>High</span><strong>8 hrs</strong></div>
              <div class="flex justify-content-between align-items-center"><span>Medium</span><strong>24 hrs</strong></div>
              <div class="flex justify-content-between align-items-center"><span>Low</span><strong>72 hrs</strong></div>
            </div>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class IncidentAdminComponent {
  i18n = inject(I18nService);
  lastUpdated = new Date();
  settings = { defaultSlaHours: 24, autoTriage: true, breachNotification: true, capaMandatory: true };
}
