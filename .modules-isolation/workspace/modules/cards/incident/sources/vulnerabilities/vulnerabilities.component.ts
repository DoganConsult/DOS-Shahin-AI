import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { GrcLiveService } from '../../core/services/grc-live.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { devError } from '../../core/utils/dev-logger';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiClientService } from "@app/core/services/api-client.service";

interface Vulnerability {
  vulnerability_id: string;
  title: string;
  description: string;
  cve_id: string | null;
  source: string;
  severity: string;
  cvss_score: number | null;
  status: string;
  affected_asset_ids: string[];
  affected_control_ids: string[];
  assigned_to: string | null;
  remediation_plan: string | null;
  remediation_due: string | null;
  detected_at: string;
  resolved_at: string | null;
  created_at: string;
}

interface VulnSummary {
  total: number; open: number; in_progress: number; resolved: number;
  critical: number; high: number; medium: number; low: number; overdue: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vulnerabilities',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <p-confirmDialog />
    <section class="page-shell">
      <header class="page-header">
        <div class="header-row">
          <div>
            <h2>{{ i18n.translate('Vulnerabilities') }}</h2>
            <p class="text-muted">{{ i18n.translate('Track, assess, and remediate vulnerabilities across your organization') }}</p>
          </div>
          <button class="btn-primary" (click)="showForm = !showForm">
            <i class="pi pi-plus"></i> {{ i18n.translate('New Vulnerability') }}
          </button>
        </div>
      </header>

      <!-- Summary Cards -->
      @if (!loading()) {
        <div class="summary-grid">
          <div class="summary-card">
            <span class="sc-value">{{ summary().total }}</span>
            <span class="sc-label">{{ i18n.translate('Total') }}</span>
          </div>
          <div class="summary-card sc-red">
            <span class="sc-value">{{ summary().open }}</span>
            <span class="sc-label">{{ i18n.translate('Open') }}</span>
          </div>
          <div class="summary-card sc-amber">
            <span class="sc-value">{{ summary().in_progress }}</span>
            <span class="sc-label">{{ i18n.translate('In Progress') }}</span>
          </div>
          <div class="summary-card sc-green">
            <span class="sc-value">{{ summary().resolved }}</span>
            <span class="sc-label">{{ i18n.translate('Resolved') }}</span>
          </div>
          <div class="summary-card sc-red">
            <span class="sc-value">{{ summary().critical }}</span>
            <span class="sc-label">{{ i18n.translate('Critical') }}</span>
          </div>
          <div class="summary-card sc-amber">
            <span class="sc-value">{{ summary().overdue }}</span>
            <span class="sc-label">{{ i18n.translate('Overdue') }}</span>
          </div>
        </div>

        <!-- Severity Breakdown Bar -->
        <div class="severity-bar-container" *ngIf="summary().total > 0">
          <div class="severity-bar">
            <div class="sb-seg sb-critical" [style.width.%]="(summary().critical / summary().total) * 100" *ngIf="summary().critical"></div>
            <div class="sb-seg sb-high" [style.width.%]="(summary().high / summary().total) * 100" *ngIf="summary().high"></div>
            <div class="sb-seg sb-medium" [style.width.%]="(summary().medium / summary().total) * 100" *ngIf="summary().medium"></div>
            <div class="sb-seg sb-low" [style.width.%]="(summary().low / summary().total) * 100" *ngIf="summary().low"></div>
          </div>
          <div class="severity-legend">
            <span><i class="dot dot-critical"></i> {{ i18n.translate('Critical') }} ({{ summary().critical }})</span>
            <span><i class="dot dot-high"></i> {{ i18n.translate('High') }} ({{ summary().high }})</span>
            <span><i class="dot dot-medium"></i> {{ i18n.translate('Medium') }} ({{ summary().medium }})</span>
            <span><i class="dot dot-low"></i> {{ i18n.translate('Low') }} ({{ summary().low }})</span>
          </div>
        </div>
      }

      <!-- Create/Edit Form -->
      @if (showForm) {
        <div class="card form-card">
          <h3 class="card-title">{{ editingId ? i18n.translate('Edit Vulnerability') : i18n.translate('New Vulnerability') }}</h3>
          <div class="form-grid">
            <div class="form-group col-2">
              <label>{{ i18n.translate('Title') }} *</label>
              <input [(ngModel)]="form.title" placeholder="e.g. CVE-2024-1234 — OpenSSL Buffer Overflow" aria-label="e.g. CVE-2024-1234 — OpenSSL Buffer Overflow" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('CVE ID') }}</label>
              <input [(ngModel)]="form.cve_id" placeholder="CVE-2024-XXXX" aria-label="CVE-2024-XXXX" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Source') }}</label>
              <select [(ngModel)]="form.source">
                <option value="manual">Manual</option>
                <option value="scan">Scan</option>
                <option value="pen_test">Pen Test</option>
                <option value="bug_bounty">Bug Bounty</option>
                <option value="vendor">Vendor Advisory</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Severity') }}</label>
              <select [(ngModel)]="form.severity">
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('CVSS Score') }}</label>
              <input type="number" [(ngModel)]="form.cvss_score" min="0" max="10" step="0.1" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Assigned To') }}</label>
              <input [(ngModel)]="form.assigned_to" placeholder="user ID" aria-label="user ID" />
            </div>
            <div class="form-group">
              <label>{{ i18n.translate('Remediation Due') }}</label>
              <input type="date" [(ngModel)]="form.remediation_due" />
            </div>
            <div class="form-group col-2">
              <label>{{ i18n.translate('Description') }}</label>
              <textarea [(ngModel)]="form.description" rows="3"></textarea>
            </div>
            <div class="form-group col-2">
              <label>{{ i18n.translate('Remediation Plan') }}</label>
              <textarea [(ngModel)]="form.remediation_plan" rows="2"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" (click)="resetForm()">{{ i18n.translate('Cancel') }}</button>
            <button class="btn-primary" (click)="save()" [disabled]="!form.title">
              {{ editingId ? i18n.translate('Update') : i18n.translate('Create') }}
            </button>
          </div>
        </div>
      }

      <!-- Filter Row -->
      @if (!loading() && vulns().length > 0) {
        <div class="filter-row">
          <select [(ngModel)]="filterSeverity" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('All Severities') }}</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('All Statuses') }}</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <span class="filter-count">{{ filtered().length }} / {{ vulns().length }}</span>
        </div>
      }

      <!-- Vulnerabilities Table -->
      <div class="page-body">
        @if (loading()) { <div class="card"><p>{{ i18n.translate('Loading...') }}</p></div> }
        @else if (filtered().length === 0) {
          <div class="card empty-state">
            <i class="pi pi-shield"></i>
            <p>{{ i18n.translate('No vulnerabilities found') }}</p>
          </div>
        }
        @else {
          <div class="table-wrapper">
            <table aria-label="Data Table table" class="data-table">
              <thead>
                <tr>
                  <th>{{ i18n.translate('Title') }}</th>
                  <th>{{ i18n.translate('CVE') }}</th>
                  <th>{{ i18n.translate('Severity') }}</th>
                  <th>{{ i18n.translate('CVSS') }}</th>
                  <th>{{ i18n.translate('Status') }}</th>
                  <th>{{ i18n.translate('Assigned') }}</th>
                  <th>{{ i18n.translate('Due') }}</th>
                  <th>{{ i18n.translate('Actions') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (v of filtered(); track v.vulnerability_id) {
                  <tr>
                    <td class="td-title">{{ v.title }}</td>
                    <td><code *ngIf="v.cve_id">{{ v.cve_id }}</code></td>
                    <td><span class="badge badge-{{ v.severity }}">{{ v.severity }}</span></td>
                    <td>{{ v.cvss_score ?? '—' }}</td>
                    <td><span class="status-pill status-{{ v.status }}">{{ v.status }}</span></td>
                    <td>{{ v.assigned_to || '—' }}</td>
                    <td [class.overdue]="isOverdue(v)">{{ v.remediation_due || '—' }}</td>
                    <td class="td-actions">
                      <button aria-label="Edit" class="btn-icon" (click)="edit(v)" title="Edit"><i class="pi pi-pencil"></i></button>
                      <button aria-label="Start" class="btn-icon" (click)="updateStatus(v, 'in_progress')" *ngIf="v.status === 'open'" title="Start"><i class="pi pi-play"></i></button>
                      <button aria-label="Resolve" class="btn-icon" (click)="updateStatus(v, 'resolved')" *ngIf="v.status !== 'resolved'" title="Resolve"><i class="pi pi-check-circle"></i></button>
                      <button aria-label="Delete" class="btn-icon btn-danger" (click)="remove(v)" title="Delete"><i class="pi pi-trash"></i></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
    <p-confirmDialog />
  `,
  styles: [`
    .page-shell { padding: 24px; max-width: 1400px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h2 { font-size: var(--font-size-3xl); font-weight: 300; color: var(--text-heading); margin: 0; }
    .text-muted { color: var(--text-muted); margin-top: 4px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .btn-primary { background: var(--primary, #2563eb); color: #fff; border: none; padding: 10px 20px; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-base); display: flex; align-items: center; gap: 6px; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: var(--surface-200, var(--border-subtle)); color: var(--text-heading); border: none; padding: 10px 20px; border-radius: var(--radius); cursor: pointer; }
    .btn-icon { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: var(--radius-xs); color: var(--text-muted); }
    .btn-icon:hover { background: var(--surface-100, var(--surface-ice)); color: var(--primary, #2563eb); }
    .btn-danger:hover { color: var(--error); }

    .summary-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
    .summary-card { background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 16px; text-align: center; border: 1px solid var(--surface-200, var(--border-subtle)); }
    .sc-value { display: block; font-size: var(--font-size-3xl); font-weight: 600; color: var(--text-heading); }
    .sc-label { font-size: var(--font-size-sm); color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; }
    .sc-red .sc-value { color: var(--error); } .sc-amber .sc-value { color: var(--warning); } .sc-green .sc-value { color: var(--success); }

    .severity-bar-container { margin-bottom: 20px; }
    .severity-bar { display: flex; height: 10px; border-radius: var(--radius-sm); overflow: hidden; background: var(--surface-200, var(--border-subtle)); }
    .sb-seg { min-width: 4px; } .sb-critical { background: var(--error); } .sb-high { background: #ea580c; } .sb-medium { background: var(--warning); } .sb-low { background: var(--success); }
    .severity-legend { display: flex; gap: 16px; margin-top: 8px; font-size: var(--font-size-sm); color: var(--text-muted); }
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: var(--radius-pill); margin-inline-end: 4px; }
    .dot-critical { background: var(--error); } .dot-high { background: #ea580c; } .dot-medium { background: var(--warning); } .dot-low { background: var(--success); }

    .form-card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--surface-200, var(--border-subtle)); margin-bottom: 20px; }
    .card-title { margin: 0 0 16px; font-size: var(--font-size-lg); font-weight: 500; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group label { font-size: var(--font-size-sm); font-weight: 500; color: var(--text-muted); }
    .form-group input, .form-group select, .form-group textarea { padding: 8px 12px; border: 1px solid var(--surface-300, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-base); }
    .col-2 { grid-column: span 2; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

    .filter-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
    .filter-row select { padding: 6px 12px; border: 1px solid var(--surface-300, var(--border-subtle)); border-radius: var(--radius-sm); }
    .filter-count { margin-inline-start: auto; font-size: var(--font-size-sm); color: var(--text-muted); }

    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; background: var(--surface-card, #fff); border-radius: var(--radius-lg); overflow: hidden; }
    .data-table th { padding: 12px 16px; text-align: start; font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text-muted); background: var(--surface-50, #f9fafb); border-bottom: 1px solid var(--surface-200, var(--border-subtle)); }
    .data-table td { padding: 12px 16px; font-size: var(--font-size-base); border-bottom: 1px solid var(--surface-100, var(--surface-ice)); }
    .td-title { font-weight: 500; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-actions { display: flex; gap: 4px; }

    .badge { padding: 2px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; }
    .badge-critical { background: var(--status-danger-bg, #fff1f1); color: var(--error); } .badge-high { background: var(--status-warning-bg, #fcf4d6); color: var(--warning); }
    .badge-medium { background: #fffbeb; color: var(--warning); } .badge-low { background: var(--status-success-bg, #defbe6); color: var(--success); }

    .status-pill { padding: 2px 10px; border-radius: var(--radius-xl); font-size: var(--font-size-xs); font-weight: 500; }
    .status-open { background: var(--status-danger-bg, #fff1f1); color: var(--error); } .status-in_progress { background: #eff6ff; color: var(--primary); } .status-resolved { background: var(--status-success-bg, #defbe6); color: var(--success); }

    .overdue { color: var(--error); font-weight: 600; }
    code { background: var(--surface-100, var(--surface-ice)); padding: 2px 6px; border-radius: var(--radius-xs); font-size: var(--font-size-sm); }
    .empty-state { text-align: center; padding: 48px; color: var(--text-muted); }
    .empty-state i { font-size: 48px; margin-bottom: 12px; display: block; }
    .card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 24px; border: 1px solid var(--surface-200, var(--border-subtle)); }

    @media (max-width: 768px) {
      .summary-grid { grid-template-columns: repeat(3, 1fr); }
      .form-grid { grid-template-columns: 1fr; }
      .col-2 { grid-column: span 1; }
    }
  `]
})
export class VulnerabilitiesComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
  private destroyRef = inject(DestroyRef);
  i18n = inject(I18nService);
  private confirmSvc = inject(ConfirmationService);
  private live = inject(GrcLiveService);
  private subs: Subscription[] = [];

  loading = signal(true);
  vulns = signal<Vulnerability[]>([]);
  filtered = signal<Vulnerability[]>([]);
  summary = signal<VulnSummary>({ total: 0, open: 0, in_progress: 0, resolved: 0, critical: 0, high: 0, medium: 0, low: 0, overdue: 0 });

  showForm = false;
  editingId: string | null = null;
  filterSeverity = '';
  filterStatus = '';

  form: Record<string, unknown> = { title: '', description: '', cve_id: '', source: 'manual', severity: 'medium', cvss_score: null, assigned_to: '', remediation_plan: '', remediation_due: '' };

  ngOnInit(): void {
    this.loadVulns();
    this.subs.push(this.live.debounced(800).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadVulns()));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  loadVulns(): void {
    this.apiclientSvc.get('/vulnerabilities').subscribe({
      next: (res: Record<string, unknown>) => {
        this.vulns.set(res?.vulnerabilities ?? []);
        this.summary.set(res?.summary ?? { total: 0, open: 0, in_progress: 0, resolved: 0, critical: 0, high: 0, medium: 0, low: 0, overdue: 0 });
        this.applyFilters();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters(): void {
    let list = this.vulns();
    if (this.filterSeverity) list = list.filter(v => v.severity === this.filterSeverity);
    if (this.filterStatus) list = list.filter(v => v.status === this.filterStatus);
    this.filtered.set(list);
  }

  save(): void {
    if (!this.form.title) return;
    const payload = { ...this.form, cvss_score: this.form.cvss_score ? parseFloat(this.form.cvss_score) : null };
    const obs = this.editingId
      ? this.apiclientSvc.put(`/vulnerabilities/${this.editingId}`, payload)
      : this.apiclientSvc.post('/vulnerabilities', payload);
    obs.subscribe({ next: () => { this.resetForm(); this.loadVulns(); }, error: (e: unknown) => devError(e) });
  }

  edit(v: Vulnerability): void {
    this.editingId = v.vulnerability_id;
    this.form = { title: v.title, description: v.description, cve_id: v.cve_id || '', source: v.source, severity: v.severity, cvss_score: v.cvss_score, assigned_to: v.assigned_to || '', remediation_plan: v.remediation_plan || '', remediation_due: v.remediation_due?.split('T')[0] || '' };
    this.showForm = true;
  }

  updateStatus(v: Vulnerability, status: string): void {
    this.apiclientSvc.put(`/vulnerabilities/${v.vulnerability_id}`, { status }).subscribe({ next: () => this.loadVulns() });
  }

  remove(v: Vulnerability): void {
    this.confirmSvc.confirm({
      message: this.i18n.translate('Delete this vulnerability?'),
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.apiclientSvc.del(`/vulnerabilities/${v.vulnerability_id}`).subscribe({ next: () => this.loadVulns() });
      }
    });
  }

  resetForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form = { title: '', description: '', cve_id: '', source: 'manual', severity: 'medium', cvss_score: null, assigned_to: '', remediation_plan: '', remediation_due: '' };
  }

  isOverdue(v: Vulnerability): boolean {
    return v.status !== 'resolved' && !!v.remediation_due && new Date(v.remediation_due) < new Date();
  }
}
