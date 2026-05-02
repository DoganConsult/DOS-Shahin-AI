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

const SHARED_IMPORTS = [CommonModule, PageShellComponent, StatusBadgeComponent, TableModule, CardModule, ButtonModule, TagModule, AppDatePipe];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-overview',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="bell" [title]="i18n.translate('nav.incidents')" [subtitle]="'Overview'" [breadcrumbs]="['Dashboard','Incidents','Overview']" [loading]="loading">
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
  kpis: { label: string; value: number }[] = [];
  ngOnInit() {
    this.http.get<unknown>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        const open = data.filter((d: Record<string, unknown>) => d.status === 'open').length;
        const resolved = data.filter((d: Record<string, unknown>) => d.status === 'resolved').length;
        this.kpis = [
          { label: 'Total Incidents', value: data.length },
          { label: 'Open', value: open },
          { label: 'Resolved', value: resolved },
          { label: 'Investigation', value: data.filter((d: Record<string, unknown>) => d.status === 'investigating').length },
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
  standalone: true,
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
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/incidents-advanced/near-miss`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-pir',
  standalone: true,
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
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/incidents-advanced/pir`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-trends',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="trending-up" [title]="'Trends & Analytics'" [subtitle]="'Incident trend analysis and recurring patterns'" [breadcrumbs]="['Dashboard','Incidents','Trends']" [loading]="loading">
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
  trends: Record<string, unknown> | null = null;
  patterns: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown>(`${environment.apiUrl}/incidents-advanced/trends`).subscribe({
      next: (d) => { this.trends = d; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<unknown[]>(`${environment.apiUrl}/incidents-advanced/patterns`).subscribe({
      next: (d) => { this.patterns = d; this.cdr.markForCheck(); },
      error: () => {}
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-regulatory',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="file-text" [title]="'Regulatory Reporting'" [subtitle]="'NCA/SAMA regulatory notifications'" [breadcrumbs]="['Dashboard','Incidents','Regulatory']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Incident</th><th>Authority</th><th>Status</th><th>Due Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.incident_id}}</td>
          <td>{{r.authority || 'N/A'}}</td>
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
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/incidents-advanced/regulatory`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-taxonomy',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="git-branch" [title]="'Incident Taxonomy'" [subtitle]="'Classification tree for incidents'" [breadcrumbs]="['Dashboard','Incidents','Taxonomy']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="15" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Code</th><th>Name</th><th>Type</th><th>Severity Hint</th><th>Regulatory</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.code}}</code></td>
          <td>{{r.name_en}}</td>
          <td><p-tag [value]="r.node_type" /></td>
          <td><app-status-badge [status]="r.severity_hint" /></td>
          <td><i [class]="r.regulatory_flag ? 'pi pi-check text-green-500' : 'pi pi-minus text-color-secondary'"></i></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No taxonomy nodes</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class IncidentTaxonomyComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/incidents-advanced/taxonomy`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-incident-lessons',
  standalone: true,
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
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        this.items = data.filter((d: Record<string, unknown>) => d.lessons_learned);
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
  standalone: true,
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
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown>(`${environment.apiUrl}/incidents`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.incidents || []);
        this.items = data.filter((d: Record<string, unknown>) => d.status === 'investigating');
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
  standalone: true,
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
  items: Record<string, unknown>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/cooperative-workflows/war-rooms`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}
