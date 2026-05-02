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
  selector: 'app-training-overview',
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="graduation-cap" [title]="'Training & Awareness'" [subtitle]="'Overview'" [breadcrumbs]="['Dashboard','Training','Overview']" [loading]="loading">
      <div class="grid">
        <div class="col-12 md:col-3" *ngFor="let kpi of kpis">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{kpi.value}}</div><div class="text-sm text-color-secondary mt-1">{{kpi.label}}</div></div></p-card>
        </div>
      </div>
    </app-page-shell>
  `
})
export class TrainingOverviewComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  kpis: { label: string; value: number | string }[] = [];
  ngOnInit() {
    this.http.get<Record<string, any>>(`${environment.apiUrl}/training-advanced/compliance-snapshot`).subscribe({
      next: (data) => {
        this.kpis = [
          { label: 'Total Campaigns', value: (data['totalCampaigns'] as number) ?? 0 },
          { label: 'Completion Rate', value: `${(data['completionRate'] as number) ?? 0}%` },
          { label: 'Overdue', value: (data['overdueCount'] as number) ?? 0 },
          { label: 'Certifications', value: (data['activeCerts'] as number) ?? 0 },
        ];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.kpis = [
          { label: 'Total Campaigns', value: 0 },
          { label: 'Completion Rate', value: '\u2014' },
          { label: 'Overdue', value: 0 },
          { label: 'Certifications', value: 0 },
        ];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-campaigns',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="megaphone" [title]="'Training Campaigns'" [subtitle]="'Create and manage awareness campaigns'" [breadcrumbs]="['Dashboard','Training','Campaigns']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Title</th><th>Type</th><th>Status</th><th>Completion</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.campaign_type" /></td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.actual_completion_pct || 0}}%</td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No campaigns found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class TrainingCampaignsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<Record<string, any>[]>(`${environment.apiUrl}/training-advanced/campaigns`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-assignments',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="clipboard-list" [title]="'Training Assignments'" [subtitle]="'Track user training assignments'" [breadcrumbs]="['Dashboard','Training','Assignments']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Content</th><th>User</th><th>Status</th><th>Score</th><th>Due</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.content_title || r.content_id}}</td>
          <td>{{r.user_id | slice:0:8}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.score ?? '\u2014'}}</td>
          <td>{{r.due_date | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No assignments found</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class TrainingAssignmentsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<Record<string, any>[]>(`${environment.apiUrl}/training-advanced/assignments`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-content-lib',
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="book" [title]="'Content Library'" [subtitle]="'Training content management'" [breadcrumbs]="['Dashboard','Training','Content']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Code</th><th>Title</th><th>Type</th><th>Category</th><th>Mandatory</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td><code>{{r.code}}</code></td>
          <td>{{r.title}}</td>
          <td><p-tag [value]="r.content_type" /></td>
          <td>{{r.category}}</td>
          <td><i [class]="r.is_mandatory ? 'pi pi-check text-green-500' : 'pi pi-minus text-color-secondary'"></i></td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No training content</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class TrainingContentLibComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<Record<string, any>[]>(`${environment.apiUrl}/training-advanced/content`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-certifications',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="award" [title]="'Certifications'" [subtitle]="'User certification tracking'" [breadcrumbs]="['Dashboard','Training','Certifications']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>User</th><th>Content</th><th>Status</th><th>Issued</th><th>Expires</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.user_id | slice:0:8}}</td>
          <td>{{r.content_id | slice:0:8}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.issued_at | appDate}}</td>
          <td>{{r.expires_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No certifications</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class TrainingCertificationsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<Record<string, any>[]>(`${environment.apiUrl}/training-advanced/certifications`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-phishing',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="mail" [title]="'Phishing Simulations'" [subtitle]="'Phishing campaign management'" [breadcrumbs]="['Dashboard','Training','Phishing']" [loading]="loading">
      <p-table [value]="items" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Campaign</th><th>Template</th><th>Status</th><th>Created</th></tr></ng-template>
        <ng-template pTemplate="body" let-r><tr>
          <td>{{r.campaign_name || r.phishing_id}}</td>
          <td>{{r.template_name || '\u2014'}}</td>
          <td><app-status-badge [status]="r.status" /></td>
          <td>{{r.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="4" class="text-center p-4">No phishing campaigns</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class TrainingPhishingComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  items: Record<string, any>[] = [];
  ngOnInit() {
    this.http.get<Record<string, any>[]>(`${environment.apiUrl}/training-advanced/phishing`).subscribe({
      next: (data) => { this.items = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-compliance',
  standalone: true,
  imports: [CommonModule, PageShellComponent, TableModule, CardModule, ButtonModule, TagModule],
  template: `
    <app-page-shell icon="check-square" [title]="'Compliance Tracker'" [subtitle]="'Training compliance overview'" [breadcrumbs]="['Dashboard','Training','Compliance']" [loading]="loading">
      <p-card header="Compliance Snapshot"><pre class="text-sm">{{snapshot | json}}</pre></p-card>
      <p-card header="Overdue Assignments" styleClass="mt-3"><p class="text-color-secondary">{{overdueCount}} overdue assignment(s)</p></p-card>
    </app-page-shell>
  `
})
export class TrainingComplianceComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  snapshot: Record<string, any> | null = null;
  overdueCount = 0;
  ngOnInit() {
    this.http.get<Record<string, any>>(`${environment.apiUrl}/training-advanced/compliance-snapshot`).subscribe({
      next: (data) => { this.snapshot = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<Record<string, any>>(`${environment.apiUrl}/training-advanced/overdue`).subscribe({
      next: (data) => { this.overdueCount = typeof data === 'number' ? data : ((data as Record<string, any>)['count'] as number) ?? 0; this.cdr.markForCheck(); },
      error: () => {}
    });
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-training-reports',
  standalone: true,
  imports: SHARED_IMPORTS,
  template: `
    <app-page-shell icon="file-text" [title]="'Training Reports'" [subtitle]="'Training compliance and campaign analytics'" [breadcrumbs]="['Dashboard','Training','Reports']" [loading]="loading">
      <div class="grid mb-3" *ngIf="snapshot">
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{snapshot.total_assigned || 0}}</div><div class="text-sm text-color-secondary mt-1">Total Assigned</div></div></p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{snapshot.completed || 0}}</div><div class="text-sm text-color-secondary mt-1">Completed</div></div></p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold text-orange-500">{{overdueCount}}</div><div class="text-sm text-color-secondary mt-1">Overdue</div></div></p-card>
        </div>
        <div class="col-12 md:col-3">
          <p-card><div class="text-center"><div class="text-3xl font-bold">{{expiringCount}}</div><div class="text-sm text-color-secondary mt-1">Expiring Certs</div></div></p-card>
        </div>
      </div>
      <p-table [value]="campaigns" [paginator]="true" [rows]="10" styleClass="p-datatable-sm" [loading]="loading">
        <ng-template pTemplate="header"><tr><th>Campaign</th><th>Status</th><th>Assigned</th><th>Completed</th><th>Launched</th></tr></ng-template>
        <ng-template pTemplate="body" let-c><tr>
          <td>{{c.title || c.campaign_name || c.campaign_id | slice:0:8}}</td>
          <td><app-status-badge [status]="c.status" /></td>
          <td>{{c.assigned_count || 0}}</td>
          <td>{{c.completed_count || 0}}</td>
          <td>{{c.launched_at || c.created_at | appDate}}</td>
        </tr></ng-template>
        <ng-template pTemplate="emptymessage"><tr><td colspan="5" class="text-center p-4">No campaigns yet</td></tr></ng-template>
      </p-table>
    </app-page-shell>
  `
})
export class TrainingReportsComponent implements OnInit {
  i18n = inject(I18nService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  loading = true;
  snapshot: Record<string, any> | null = null;
  campaigns: Record<string, any>[] = [];
  overdueCount = 0;
  expiringCount = 0;
  ngOnInit() {
    this.http.get<Record<string, any>>(`${environment.apiUrl}/training-advanced/compliance-snapshot`).subscribe({
      next: (data) => { this.snapshot = data; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.http.get<Record<string, any>[]>(`${environment.apiUrl}/training-advanced/campaigns`).subscribe({
      next: (data) => { this.campaigns = Array.isArray(data) ? data : []; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
    this.http.get<Record<string, any>>(`${environment.apiUrl}/training-advanced/overdue`).subscribe({
      next: (data) => { this.overdueCount = typeof data === 'number' ? data : ((data as Record<string, any>)['count'] as number) ?? 0; this.cdr.markForCheck(); },
      error: () => {}
    });
    this.http.get<Record<string, any>>(`${environment.apiUrl}/training-advanced/expiring-certs`).subscribe({
      next: (data) => { this.expiringCount = Array.isArray(data) ? data.length : ((data as Record<string, any>)['count'] as number) ?? 0; this.cdr.markForCheck(); },
      error: () => {}
    });
  }
}
