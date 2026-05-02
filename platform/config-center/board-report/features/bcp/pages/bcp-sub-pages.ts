import { Component, inject, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { environment } from '@env/environment';

const SHARED_IMPORTS_BASE = [CommonModule, FormsModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule, InputTextModule];
const SHARED_IMPORTS = [...SHARED_IMPORTS_BASE, StatusBadgeComponent];

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-overview',
    imports: SHARED_IMPORTS_BASE,
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/bia`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-exercises',
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/exercises`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-crisis-comm',
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/crisis-comm`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-recovery',
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/recovery-strategies`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-activation',
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/activations`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-dependencies',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="git-merge" [title]="'Dependency Maps'" [subtitle]="'Service and process dependency mapping'" [breadcrumbs]="['Dashboard','BCP','Dependencies']" [loading]="loading">
      <p-table [value]="biaItems" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>BIA</th><th>Process</th><th>Criticality</th><th>RTO</th><th>Status</th></tr></ng-template>
        <ng-template pTemplate="body" let-b><tr>
          <td>{{b.bia_id | slice:0:8}}</td>
          <td>{{b.process_name || b.name || '\u2014'}}</td>
          <td><p-tag [value]="(b.criticality_level || b.criticality) | displayValue" /></td>
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/bia`).subscribe({
      next: (data) => { this.biaItems = Array.isArray(data) ? data : []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-maturity',
    imports: SHARED_IMPORTS_BASE,
    template: `
    <app-page-shell icon="award" [title]="'BCM Maturity Assessment'" [subtitle]="'Track BCM program maturity over time'" [breadcrumbs]="['Dashboard','BCP','Maturity']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Assessment</th><th>Overall Score</th><th>Level</th><th>Date</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.assessment_id | slice:0:8}}</td>
          <td>{{r.overall_score || '\u2014'}}</td>
          <td><p-tag [value]="r.maturity_level | displayValue" /></td>
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
    this.http.get<any[]>(`${environment.apiUrl}/bcm-advanced/maturity/history`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Enterprise Uplift Pages — Crisis Room, Findings, Recovery Metrics, Reports, Admin
// ════════════════════════════════════════════════════════════════════════════

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-crisis-room',
    imports: [...SHARED_IMPORTS, DialogModule],
    template: `
    <app-page-shell icon="alert-triangle" [title]="'Crisis Room'" [subtitle]="'Live crisis management and response'" [breadcrumbs]="['Dashboard','BCP','Crisis Room']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold" [style.color]="activeCrises > 0 ? 'var(--severity-critical)' : 'var(--success)'">{{activeCrises}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">Active Crises</div></div></p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{dashboard.totalEvents || 0}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">Total Events</div></div></p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{dashboard.avgResolutionHours || '\u2014'}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">Avg Resolution (hrs)</div></div></p-card>
        </div>
        <div class="col-12 md:col-3 flex align-items-center justify-content-center">
          <button pButton label="Declare Crisis" icon="pi pi-exclamation-triangle" class="p-button-danger" (click)="showDeclareDialog = true"></button>
        </div>
      </div>
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Severity</th><th>Status</th><th>Declared</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.crisis_type | displayValue" /></td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.declared_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No crisis events recorded</td></tr></ng-template>
      </p-table>
      <p-dialog header="Declare Crisis" [(visible)]="showDeclareDialog" [modal]="true" [style]="{width: '500px'}">
        <div class="flex flex-column gap-3">
          <div><label class="block mb-1">Title</label><input pInputText [(ngModel)]="newCrisis.title" class="w-full" /></div>
          <div><label class="block mb-1">Type</label>
            <select [(ngModel)]="newCrisis.crisis_type" class="w-full p-inputtext"><option *ngFor="let t of crisisTypes" [value]="t">{{t}}</option></select>
          </div>
          <div><label class="block mb-1">Severity</label>
            <select [(ngModel)]="newCrisis.severity" class="w-full p-inputtext"><option *ngFor="let s of severities" [value]="s">{{s}}</option></select>
          </div>
          <div><label class="block mb-1">Description</label><textarea pInputTextarea [(ngModel)]="newCrisis.description" class="w-full" rows="3"></textarea></div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton label="Cancel" class="p-button-text" (click)="showDeclareDialog = false"></button>
          <button pButton label="Declare" class="p-button-danger" (click)="onDeclare()" [disabled]="!newCrisis.title"></button>
        </ng-template>
      </p-dialog>
    </app-page-shell>
  `
})
export class BcpCrisisRoomComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  dashboard: Record<string, any> = {};
  activeCrises = 0;
  showDeclareDialog = false;
  newCrisis: Record<string, any> = { title: '', crisis_type: 'operational', severity: 'high', description: '' };
  crisisTypes = ['cyber', 'natural_disaster', 'operational', 'reputational', 'regulatory', 'pandemic', 'supply_chain', 'infrastructure'];
  severities = ['critical', 'high', 'medium', 'low'];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/crisis-events/dashboard`).subscribe({
      next: (d) => { this.dashboard = d; this.activeCrises = d.activeCrises || 0; this.cdr.markForCheck(); },
      error: () => this.cdr.markForCheck()
    });
    this.http.get<any>(`${environment.apiUrl}/crisis-events`).subscribe({
      next: (res) => { this.items = res?.events || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
  onDeclare() {
    this.http.post<any>(`${environment.apiUrl}/crisis-events`, this.newCrisis).subscribe({
      next: (crisis) => { this.items = [crisis, ...this.items]; this.activeCrises++; this.showDeclareDialog = false; this.newCrisis = { title: '', crisis_type: 'operational', severity: 'high', description: '' }; this.cdr.markForCheck(); },
      error: () => this.cdr.markForCheck()
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-findings',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="clipboard" [title]="'Findings & Improvements'" [subtitle]="'Track findings from exercises, activations, and audits'" [breadcrumbs]="['Dashboard','BCP','Findings']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold" [style.color]="kpi.color">{{kpi.value}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Source</th><th>Type</th><th>Severity</th><th>Status</th><th>Due</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.source_type | displayValue" /></td>
          <td>{{r.finding_type || '\u2014'}}</td>
          <td><app-status-badge [status]="r.severity" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.due_date | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center p-4">No findings recorded</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpFindingsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  kpis: { label: string; value: number; color: string }[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/bcm-findings/summary`).subscribe({
      next: (s) => {
        this.kpis = [
          { label: 'Open', value: s.open || 0, color: 'var(--warning)' },
          { label: 'In Progress', value: s.inProgress || 0, color: 'var(--info)' },
          { label: 'Overdue', value: s.overdue || 0, color: 'var(--severity-critical)' },
          { label: 'Closed', value: s.closed || 0, color: 'var(--success)' },
        ];
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
    this.http.get<any>(`${environment.apiUrl}/bcm-findings`).subscribe({
      next: (res) => { this.items = res?.findings || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-recovery-metrics',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="trending-up" [title]="'Recovery Metrics'" [subtitle]="'RTO/RPO achievement, exercise effectiveness, service resilience'" [breadcrumbs]="['Dashboard','BCP','Recovery Metrics']" [loading]="loading">
      <div class="grid mb-3">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{kpi.value}}{{kpi.suffix}}</div><div class="text-sm mt-1" style="color: var(--text-muted)">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
      <h3 style="color: var(--text-body)" class="mt-4 mb-2">Service Resilience Scores</h3>
      <p-table [value]="resilienceScores" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Service</th><th>Criticality</th><th>Has BIA</th><th>Has Strategy</th><th>Exercises</th><th>Score</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.serviceName}}</td>
          <td><app-status-badge [status]="r.criticality" /></td>
          <td>{{r.hasBia ? 'Yes' : 'No'}}</td>
          <td>{{r.hasRecoveryStrategy ? 'Yes' : 'No'}}</td>
          <td>{{r.exerciseCount}}</td>
          <td><strong>{{r.resilienceScore}}%</strong></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="6" class="text-center p-4">No business services registered</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class BcpRecoveryMetricsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  kpis: { label: string; value: number; suffix: string }[] = [];
  resilienceScores: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/bcm-metrics/recovery`).subscribe({
      next: (m) => {
        this.kpis = [
          { label: 'Readiness Score', value: m.readinessScore || 0, suffix: '%' },
          { label: 'RTO Achievement', value: m.rtoAchievementPct || 0, suffix: '%' },
          { label: 'RPO Achievement', value: m.rpoAchievementPct || 0, suffix: '%' },
          { label: 'Exercise Pass Rate', value: m.exercisePassRate || 0, suffix: '%' },
        ];
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
    this.http.get<any[]>(`${environment.apiUrl}/bcm-metrics/service-resilience`).subscribe({
      next: (data) => { this.resilienceScores = data || []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-reports',
    imports: SHARED_IMPORTS_BASE,
    template: `
    <app-page-shell icon="file-text" [title]="'BCM Reports'" [subtitle]="'Generate and view BCM reports'" [breadcrumbs]="['Dashboard','BCP','Reports']" [loading]="false">
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
export class BcpReportsComponent {
  i18n = inject(I18nService);
  reports = [
    { key: 'readiness', title: 'BCP Readiness Report', description: 'Overall readiness score, plan coverage, and exercise status.' },
    { key: 'exercise-summary', title: 'Exercise Summary', description: 'Summary of all exercises with pass/fail rates and trends.' },
    { key: 'crisis-history', title: 'Crisis Event History', description: 'Complete history of crisis events with resolution timelines.' },
    { key: 'maturity-trend', title: 'Maturity Trend', description: 'BCM program maturity scores over time.' },
    { key: 'findings-status', title: 'Findings Status', description: 'Open, remediated, and overdue findings by severity.' },
    { key: 'service-resilience', title: 'Service Resilience', description: 'Per-service resilience scores and dependency analysis.' },
  ];
  onViewReport(key: string) {
    /* placeholder — will navigate to report detail or trigger export */
  }
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-bcp-admin',
    imports: SHARED_IMPORTS,
    template: `
    <app-page-shell icon="settings" [title]="'BCM Admin'" [subtitle]="'Module settings and configuration'" [breadcrumbs]="['Dashboard','BCP','Admin']" [loading]="loading">
      <div class="grid">
        <div class="col-12 md:col-6">
          <p-card header="Module Settings">
            <div class="flex flex-column gap-2">
              <div class="flex justify-content-between align-items-center"><span>Default Review Frequency (days)</span><strong>{{settings.reviewFrequencyDays || 180}}</strong></div>
              <div class="flex justify-content-between align-items-center"><span>Default Exercise Cadence (days)</span><strong>{{settings.exerciseCadenceDays || 90}}</strong></div>
              <div class="flex justify-content-between align-items-center"><span>Proactive Monitoring</span><app-status-badge [status]="settings.proactiveEnabled ? 'active' : 'inactive'" /></div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6">
          <p-card header="Audit Log">
            <p-table [value]="auditLog" [paginator]="true" [rows]="5" styleClass="p-datatable-sm" [loading]="loading">
              <ng-template pTemplate="header"><tr><th>Action</th><th>Entity</th><th>Time</th></tr></ng-template>
              <ng-template pTemplate="body" let-r><tr>
                <td>{{r.action}}</td>
                <td>{{r.entity_type}}</td>
                <td>{{r.created_at | appDate}}</td>
              </tr></ng-template>
              <ng-template pTemplate="emptymessage"><tr><td colspan="3" class="text-center p-4">No audit entries</td></tr></ng-template>
            </p-table>
          </p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class BcpAdminComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  settings: Record<string, any> = { reviewFrequencyDays: 180, exerciseCadenceDays: 90, proactiveEnabled: true };
  auditLog: Record<string, any>[] = [];
  ngOnInit() {
    this.loading = false;
    this.cdr.markForCheck();
  }
}
