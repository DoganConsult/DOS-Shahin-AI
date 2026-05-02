import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { AuditApiService } from '../../services/audit-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { GrcRecord } from '@app/core/models/shared.types';
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-audit-finding-trends',
    imports: [CommonModule, FormsModule, PageShellComponent, StatusBadgeComponent,
        ToastModule, TableModule, ButtonModule, ToolbarModule, DialogModule, InputTextModule,
        DropdownModule, CalendarModule, TagModule],
    providers: [MessageService],
    template: `
    <app-page-shell icon="chart-line"
      [title]="i18n.translate('audit.auditFindingTrends')"
      [subtitle]="i18n.translate('audit.analyticsAndDistributionOfAuditFindings')"
      [loading]="loading()">
      <p-toast />

      <p-toolbar styleClass="mb-3">
        <ng-template pTemplate="start">
          <div style="display:flex;align-items:center;gap:12px">
            <label style="font-weight:600">{{ i18n.translate('audit.from') }}</label>
            <p-calendar [(ngModel)]="startDate" dateFormat="yy-mm-dd" [showIcon]="true" />
            <label style="font-weight:600">{{ i18n.translate('audit.to') }}</label>
            <p-calendar [(ngModel)]="endDate" dateFormat="yy-mm-dd" [showIcon]="true" />
            <p-button [label]="i18n.translate('audit.apply')" icon="pi pi-filter" (onClick)="loadAll()" />
          </div>
        </ng-template>
      </p-toolbar>

      <!-- Severity Distribution -->
      <h3 style="margin:16px 0 8px">{{ i18n.translate('audit.severityDistribution') }}</h3>
      <div class="severity-cards">
        <div class="sev-card sev-critical">
          <span class="sev-count">{{ severityData()?.critical || 0 }}</span>
          <span class="sev-label">{{ i18n.translate('audit.critical') }}</span>
        </div>
        <div class="sev-card sev-high">
          <span class="sev-count">{{ severityData()?.high || 0 }}</span>
          <span class="sev-label">{{ i18n.translate('audit.high') }}</span>
        </div>
        <div class="sev-card sev-medium">
          <span class="sev-count">{{ severityData()?.medium || 0 }}</span>
          <span class="sev-label">{{ i18n.translate('audit.medium') }}</span>
        </div>
        <div class="sev-card sev-low">
          <span class="sev-count">{{ severityData()?.low || 0 }}</span>
          <span class="sev-label">{{ i18n.translate('audit.low') }}</span>
        </div>
      </div>

      <!-- Aging Analysis -->
      <h3 style="margin:24px 0 8px">{{ i18n.translate('audit.agingAnalysis') }}</h3>
      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="agingData()" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ i18n.translate('audit.bucket') }}</th>
            <th>{{ i18n.translate('audit.count') }}</th>
            <th>{{ i18n.translate('audit.percentage') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-semibold">{{ row.bucket }}</td>
            <td>{{ row.count }}</td>
            <td>{{ row.percentage }}%</td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="3" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noDataYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Top Recurring Findings -->
      <h3 style="margin:24px 0 8px">{{ i18n.translate('audit.topRecurringFindings') }}</h3>
      <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" aria-label="Data table" [value]="recurringData()" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="title">{{ i18n.translate('audit.titleLabel') }} <p-sortIcon field="title" /></th>
            <th pSortableColumn="occurrence_count">{{ i18n.translate('audit.occurrences') }} <p-sortIcon field="occurrence_count" /></th>
            <th>{{ i18n.translate('audit.severity') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-semibold">{{ row.title }}</td>
            <td>{{ row.occurrence_count }}</td>
            <td><app-status-badge [status]="row.severity" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="3" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noDataYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Monthly Trends -->
      <h3 style="margin:24px 0 8px">{{ i18n.translate('audit.monthlyTrends') }}</h3>
      <p-table aria-label="Data table" [value]="trendsData()" [paginator]="true" [rows]="12" styleClass="p-datatable-striped">
        <ng-template pTemplate="header">
          <tr>
            <th pSortableColumn="month">{{ i18n.translate('audit.month') }} <p-sortIcon field="month" /></th>
            <th pSortableColumn="total">{{ i18n.translate('audit.total') }} <p-sortIcon field="total" /></th>
            <th>{{ i18n.translate('audit.critical') }}</th>
            <th>{{ i18n.translate('audit.high') }}</th>
            <th>{{ i18n.translate('audit.medium') }}</th>
            <th>{{ i18n.translate('audit.low') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-semibold">{{ row.month }}</td>
            <td>{{ row.total }}</td>
            <td><p-tag [value]="'' + (row.critical || 0)" severity="danger" /></td>
            <td><p-tag [value]="'' + (row.high || 0)" severity="warning" /></td>
            <td><p-tag [value]="'' + (row.medium || 0)" severity="info" /></td>
            <td><p-tag [value]="'' + (row.low || 0)" severity="success" /></td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="6" class="text-center p-4">
            <i class="pi pi-inbox" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="color:var(--text-muted);margin-top:8px">{{ i18n.translate('audit.noDataYet') }}</p>
          </td></tr>
        </ng-template>
      </p-table>

      <!-- Cross-Module Navigation -->
      <div class="cross-links">
        <button class="cross-link-btn" (click)="router.navigate(['/audit/findings'])"><i class="pi pi-search"></i> {{ i18n.translate('audit.allFindings') }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/audit/repeat-findings'])"><i class="pi pi-refresh"></i> {{ i18n.translate('audit.repeatFindings') }}</button>
        <button class="cross-link-btn" (click)="router.navigate(['/risk/register'])"><i class="pi pi-shield"></i> {{ i18n.translate('audit.riskRegister') }}</button>
      </div>
    </app-page-shell>
  `,
    styles: [`
    .font-semibold { font-weight: 600; }
    .severity-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .sev-card { border-radius: var(--radius-lg); padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; }
    .sev-count { font-size: var(--font-size-4xl); font-weight: 700; color: #fff; }
    .sev-label { font-size: var(--font-size-base); font-weight: 600; color: rgba(var(--color-white-rgb), 0.85); }
    .sev-critical { background: var(--error); }
    .sev-high { background: #ea580c; }
    .sev-medium { background: #ca8a04; }
    .sev-low { background: var(--success); }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class AuditFindingTrendsComponent implements OnInit {
  private api = inject(AuditApiService);
  readonly i18n = inject(I18nService);
  private msg = inject(MessageService);
  readonly router = inject(Router);

  loading = signal(true);
  severityData = signal<GrcRecord>({});
  agingData = signal<GrcRecord[]>([]);
  recurringData = signal<GrcRecord[]>([]);
  trendsData = signal<GrcRecord[]>([]);
  startDate: Date | null = null;
  endDate: Date | null = null;

  ngOnInit() {
    const now = new Date();
    this.endDate = now;
    this.startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    const sd = this.startDate ? this.startDate.toISOString().slice(0, 10) : undefined;
    const ed = this.endDate ? this.endDate.toISOString().slice(0, 10) : undefined;

    this.api.getFindingSeverityDist().subscribe({
      next: r => this.severityData.set(r),
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadSeverityData') })
    });

    this.api.getFindingAging().subscribe({
      next: r => this.agingData.set(Array.isArray(r?.buckets) ? r.buckets : Array.isArray(r) ? r : []),
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadAgingData') })
    });

    this.api.getRecurringFindings(10).subscribe({
      next: r => this.recurringData.set(Array.isArray((r as any)?.findings) ? (r as any).findings : Array.isArray(r) ? r : []),
      error: () => this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadRecurringFindings') })
    });

    this.api.getFindingTrends(sd, ed).subscribe({
      next: r => { this.trendsData.set(Array.isArray((r as any)?.months) ? (r as any).months : Array.isArray(r) ? r : []); this.loading.set(false); },
      error: () => { this.loading.set(false); this.msg.add({ severity: 'error', summary: this.i18n.translate('common.error'), detail: this.i18n.translate('audit.failedToLoadTrends') }); }
    });
  }
}
