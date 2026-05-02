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
  selector: 'app-bcp-overview',
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="shield" [title]="i18n.translate('nav.bcp')" [subtitle]="'Overview'" [breadcrumbs]="['Dashboard','BCP','Overview']" [loading]="loading">
      <div class="grid">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{kpi.value}}</div><div class="text-sm text-color-secondary mt-1">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class BcpOverviewComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  kpis: { label: string; value: number }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/bcp`).subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res?.plans || []);
        this.kpis = [
          { label: 'Total Plans', value: data.length },
          { label: 'Approved', value: data.filter((d: Record<string, any>) => d.status === 'approved').length },
          { label: 'Draft', value: data.filter((d: Record<string, any>) => d.status === 'draft').length },
          { label: 'Active', value: data.filter((d: Record<string, any>) => d.status === 'active').length },
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
  selector: 'app-bcp-bia',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="bar-chart-2" [title]="'Business Impact Analysis'" [subtitle]="'BIA wizard and assessments'" [breadcrumbs]="['Dashboard','BCP','BIA']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Status</th><th>Criticality</th><th>RTO (hrs)</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td><app-status-badge [status]="r.criticality_rating" /></td>
          <td>{{r.rto_hours || '\u2014'}}</td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No BIA assessments found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpBiaComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/bia`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bcp-exercises',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="activity" [title]="'Exercises & DR Tests'" [subtitle]="'BCP exercise management'" [breadcrumbs]="['Dashboard','BCP','Exercises']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Status</th><th>Scheduled</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.exercise_type" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.scheduled_date | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No exercises found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpExercisesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/exercises`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bcp-crisis-comm',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="phone" [title]="'Crisis Communication'" [subtitle]="'Crisis communication plans and notification trees'" [breadcrumbs]="['Dashboard','BCP','Crisis Comm']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Status</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center p-4">No crisis communication plans</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpCrisisCommComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/crisis-comm`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bcp-recovery',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="refresh-cw" [title]="'Recovery Strategies'" [subtitle]="'Define and manage recovery approaches'" [breadcrumbs]="['Dashboard','BCP','Recovery']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Name</th><th>Type</th><th>Status</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.strategy_name || r.title}}</td>
          <td><p-tag [value]="r.strategy_type || 'standard'" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No recovery strategies</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpRecoveryComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/recovery-strategies`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bcp-activation',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="zap" [title]="'Plan Activation'" [subtitle]="'Active BCP plan activations'" [breadcrumbs]="['Dashboard','BCP','Activation']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Activation ID</th><th>Status</th><th>Reason</th><th>Activated</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.activation_id | slice:0:8}}</code></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.activation_reason || '\u2014'}}</td>
          <td>{{r.activated_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No plan activations</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpActivationComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/activations`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bcp-dependencies',
  standalone: true,
  imports: [CommonModule, PageShellComponent, StatusBadgeComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="git-merge" [title]="'Dependency Maps'" [subtitle]="'Service and process dependency mapping'" [breadcrumbs]="['Dashboard','BCP','Dependencies']" [loading]="loading">
      <p-table [value]="biaItems" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>BIA</th><th>Process</th><th>Criticality</th><th>RTO</th><th>Status</th></tr></ng-template>
        <ng-template pTemplate="body" let-b><tr>
          <td>{{b.bia_id | slice:0:8}}</td>
          <td>{{b.process_name || b.name || '\u2014'}}</td>
          <td><p-tag [value]="b.criticality_level || b.criticality || 'N/A'" /></td>
          <td>{{b.rto_hours ? b.rto_hours + 'h' : '\u2014'}}</td>
          <td><app-status-badge [status]="b.status || 'draft'" /></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No BIA assessments. Create a BIA to map dependencies.</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpDependenciesComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  biaItems: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/bia`).subscribe({
      next: (data) => { this.biaItems = Array.isArray(data) ? data : []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-bcp-maturity',
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule, AppDatePipe],
  template: `
    <app-page-shell icon="award" [title]="'BCM Maturity Assessment'" [subtitle]="'Track BCM program maturity over time'" [breadcrumbs]="['Dashboard','BCP','Maturity']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Assessment</th><th>Overall Score</th><th>Level</th><th>Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.assessment_id | slice:0:8}}</td>
          <td>{{r.overall_score || '\u2014'}}</td>
          <td><p-tag [value]="r.maturity_level || 'N/A'" /></td>
          <td>{{r.assessed_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No maturity assessments</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpMaturityComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<unknown[]>(`${environment.apiUrl}/bcm-advanced/maturity/history`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}
