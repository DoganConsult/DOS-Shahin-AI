import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { VendorApiService } from '@app/core/services/vendor-api.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { environment } from '@env/environment';

import { TabViewModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TimelineModule } from 'primeng/timeline';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { GrcRecord } from '@app/core/models/shared.types';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast';

function riskSeverity(level: string | undefined): TagSeverity {
  switch ((level ?? '').toLowerCase()) {
    case 'critical': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'info';
    case 'low': return 'success';
    default: return 'info';
  }
}

function slaSeverity(isMet: boolean | undefined): TagSeverity {
  return isMet ? 'success' : 'danger';
}

function ddStepSeverity(status: string | undefined): TagSeverity {
  switch ((status ?? '').toLowerCase()) {
    case 'completed': return 'success';
    case 'in_progress': return 'info';
    case 'blocked': return 'danger';
    case 'skipped': return 'warning';
    default: return 'info';
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vendor-detail',
  standalone: true,
  imports: [
    CommonModule,
    PageShellComponent,
    StatusBadgeComponent,
    AppDatePipe,
    TabViewModule,
    CardModule,
    TagModule,
    ButtonModule,
    TableModule,
    TimelineModule,
    DialogModule,
    TooltipModule,
  ],
  template: `
    <app-page-shell
      icon="building"
      [title]="vendorName()"
      [subtitle]="'Vendor Detail'"
      [breadcrumbs]="['Dashboard', 'Vendor Risk', 'Vendors', vendorName()]"
      [loading]="loading()">

      <!-- Action toolbar -->
      <div class="vendor-actions" *ngIf="!loading()">
        <p-button label="Run Scorecard" icon="pi pi-chart-bar"
                  severity="info" [outlined]="true"
                  (onClick)="runScorecard()"
                  [loading]="scorecardRunning()"
                  pTooltip="Recalculate vendor risk scorecard" />
        <p-button label="Initiate DD" icon="pi pi-search"
                  severity="warning" [outlined]="true"
                  (onClick)="initiateDueDiligence()"
                  [loading]="ddInitiating()"
                  pTooltip="Start due diligence process" />
        <p-button label="Start Offboarding" icon="pi pi-user-minus"
                  severity="danger" [outlined]="true"
                  (onClick)="showOffboardConfirm = true"
                  pTooltip="Begin vendor offboarding" />
        <p-button label="Propagate Risk" icon="pi pi-share-alt"
                  severity="secondary" [outlined]="true"
                  (onClick)="propagateRisk()"
                  pTooltip="Cross-agent risk propagation" />
      </div>

      <p-tabView *ngIf="!loading()" styleClass="vendor-tabs">

        <!-- Tab 0: Profile -->
        <p-tabPanel header="Profile" leftIcon="pi pi-user">
          <div class="profile-grid">
            <p-card header="General Information" styleClass="profile-card">
              <div class="detail-list">
                <div class="detail-row">
                  <span class="detail-label">Vendor Name</span>
                  <span class="detail-value">{{ vendor()?.name ?? vendor()?.vendor_name ?? '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Category</span>
                  <span class="detail-value">{{ vendor()?.category ?? '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status</span>
                  <span class="detail-value"><app-status-badge [status]="vendor()?.status ?? 'any'" /></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Risk Rating</span>
                  <span class="detail-value">
                    <p-tag [value]="vendor()?.risk_rating ?? vendor()?.risk_tier ?? vendor()?.risk_level ?? 'unrated'"
                           [severity]="riskSev(vendor()?.risk_rating ?? vendor()?.risk_tier ?? vendor()?.risk_level)" />
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Risk Score</span>
                  <span class="detail-value">{{ vendor()?.risk_score ?? '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Criticality</span>
                  <span class="detail-value">
                    <p-tag [value]="vendor()?.criticality ?? 'standard'"
                           [severity]="riskSev(vendor()?.criticality)" />
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Data Classification</span>
                  <span class="detail-value">{{ vendor()?.data_classification ?? '\u2014' }}</span>
                </div>
              </div>
            </p-card>

            <p-card header="Contract & Contact" styleClass="profile-card">
              <div class="detail-list">
                <div class="detail-row">
                  <span class="detail-label">Contact Email</span>
                  <span class="detail-value">{{ vendor()?.contact_email ?? '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contact Name</span>
                  <span class="detail-value">{{ vendor()?.contact_name ?? '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contact Phone</span>
                  <span class="detail-value">{{ vendor()?.contact_phone ?? '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contract Start</span>
                  <span class="detail-value">{{ vendor()?.contract_start | appDate }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contract Expiry</span>
                  <span class="detail-value">{{ vendor()?.contract_expiry ?? vendor()?.contract_end | appDate }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contract Value</span>
                  <span class="detail-value">{{ vendor()?.contract_value ? ('$' + vendor()?.contract_value) : '\u2014' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Description</span>
                  <span class="detail-value">{{ vendor()?.description ?? '\u2014' }}</span>
                </div>
              </div>
            </p-card>
          </div>
        </p-tabPanel>

        <!-- Tab 1: Assessments -->
        <p-tabPanel header="Assessments" leftIcon="pi pi-check-square">
          <p-table [value]="assessments()" [paginator]="assessments().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Completion %</th>
                <th>Assessed At</th>
                <th>Assessor</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-a>
              <tr>
                <td>{{ a.assessment_type ?? a.type ?? '\u2014' }}</td>
                <td><app-status-badge [status]="a.status ?? 'pending'" /></td>
                <td>
                  <div class="progress-cell">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="a.completion_pct ?? a.score ?? 0"></div>
                    </div>
                    <span>{{ a.completion_pct ?? a.score ?? 0 }}%</span>
                  </div>
                </td>
                <td>{{ a.assessed_at ?? a.created_at | appDate }}</td>
                <td>{{ a.assessor ?? a.assessor_name ?? '\u2014' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="empty-msg">No assessments found</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 2: Documents -->
        <p-tabPanel header="Documents" leftIcon="pi pi-file">
          <p-table [value]="documents()" [paginator]="documents().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Document Type</th>
                <th>Status</th>
                <th>Expiry Date</th>
                <th>Upload</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-d>
              <tr>
                <td>{{ d.document_type ?? d.type ?? '\u2014' }}</td>
                <td><app-status-badge [status]="d.status ?? 'pending'" /></td>
                <td>{{ d.expiry_date ?? d.expires_at | appDate }}</td>
                <td>
                  <a *ngIf="d.download_url || d.file_url" [href]="d.download_url ?? d.file_url"
                     target="_blank" class="doc-link">
                    <i class="pi pi-download"></i> Download
                  </a>
                  <span *ngIf="!d.download_url && !d.file_url" class="text-muted">\u2014</span>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="empty-msg">No documents found</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 3: Findings -->
        <p-tabPanel header="Findings" leftIcon="pi pi-exclamation-triangle">
          <p-table [value]="findings()" [paginator]="findings().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-f>
              <tr>
                <td><strong>{{ f.title ?? f.finding_title ?? '\u2014' }}</strong></td>
                <td>
                  <p-tag [value]="f.severity ?? 'info'"
                         [severity]="riskSev(f.severity)" />
                </td>
                <td><app-status-badge [status]="f.status ?? 'open'" /></td>
                <td>{{ f.created_at | appDate }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="empty-msg">No findings recorded</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 4: SLA -->
        <p-tabPanel header="SLA" leftIcon="pi pi-clock">
          <h4 class="section-heading">SLA Measurements</h4>
          <p-table [value]="slaMeasurements()" [paginator]="slaMeasurements().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Metric</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Met</th>
                <th>Period End</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-s>
              <tr>
                <td>{{ s.metric_name ?? s.metric_code ?? '\u2014' }}</td>
                <td>{{ s.target_value ?? '\u2014' }}</td>
                <td>{{ s.actual_value ?? '\u2014' }}</td>
                <td>
                  <p-tag [value]="s.is_met ? 'Met' : 'Not Met'"
                         [severity]="s.is_met ? 'success' : 'danger'" />
                </td>
                <td>{{ s.period_end ?? s.measurement_date | appDate }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="5" class="empty-msg">No SLA measurements</td></tr>
            </ng-template>
          </p-table>

          <h4 class="section-heading mt-3">Breach Log</h4>
          <p-table [value]="slaBreaches()" [paginator]="slaBreaches().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Metric</th>
                <th>Breach Type</th>
                <th>Remediation Status</th>
                <th>Created</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-b>
              <tr>
                <td>{{ b.metric_name ?? b.metric_code ?? '\u2014' }}</td>
                <td>{{ b.breach_type ?? '\u2014' }}</td>
                <td><app-status-badge [status]="b.remediation_status ?? 'open'" /></td>
                <td>{{ b.created_at | appDate }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="empty-msg">No SLA breaches recorded</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 5: Shared Responsibility -->
        <p-tabPanel header="Shared Responsibility" leftIcon="pi pi-sitemap">
          <p-table [value]="sharedResponsibility()" [paginator]="sharedResponsibility().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Control ID</th>
                <th>Ownership</th>
                <th>Framework</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-sr>
              <tr>
                <td><code>{{ sr.control_id ?? '\u2014' }}</code></td>
                <td>
                  <p-tag [value]="sr.ownership ?? 'shared'"
                         [severity]="sr.ownership === 'vendor' ? 'warning' : sr.ownership === 'customer' ? 'info' : 'success'" />
                </td>
                <td>{{ sr.framework_code ?? '\u2014' }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="3" class="empty-msg">No shared responsibility mappings</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 6: Due Diligence -->
        <p-tabPanel header="Due Diligence" leftIcon="pi pi-list">
          <div class="dd-progress-bar" *ngIf="ddSteps().length > 0">
            <span class="dd-progress-label">
              {{ ddCompletedCount() }} / {{ ddSteps().length }} steps completed
            </span>
            <div class="progress-bar lg">
              <div class="progress-fill" [style.width.%]="ddProgressPct()"></div>
            </div>
          </div>
          <p-table [value]="ddSteps()" [paginator]="ddSteps().length > 10" [rows]="10"
                   styleClass="p-datatable-sm p-datatable-striped" [loading]="loading()">
            <ng-template pTemplate="header">
              <tr>
                <th>Step Type</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Completed At</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-step>
              <tr>
                <td>{{ step.step_type ?? step.step_name ?? '\u2014' }}</td>
                <td>
                  <p-tag [value]="step.status ?? 'pending'"
                         [severity]="ddStepSev(step.status)" />
                </td>
                <td>{{ step.assignee ?? step.assigned_to ?? '\u2014' }}</td>
                <td>{{ step.completed_at | appDate }}</td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="4" class="empty-msg">No due diligence steps. Use "Initiate DD" to start.</td></tr>
            </ng-template>
          </p-table>
        </p-tabPanel>

        <!-- Tab 7: Timeline -->
        <p-tabPanel header="Timeline" leftIcon="pi pi-history">
          <div *ngIf="auditLog().length > 0" class="timeline-container">
            <p-timeline [value]="auditLog()" align="left">
              <ng-template pTemplate="content" let-entry>
                <div class="timeline-entry">
                  <div class="timeline-header">
                    <strong>{{ entry.action ?? entry.event_type ?? 'Activity' }}</strong>
                    <span class="timeline-date">{{ entry.created_at ?? entry.timestamp | appDate }}</span>
                  </div>
                  <p class="timeline-detail">{{ entry.details ?? entry.description ?? entry.summary ?? '' }}</p>
                  <span class="timeline-actor" *ngIf="entry.actor ?? entry.performed_by">
                    <i class="pi pi-user"></i> {{ entry.actor ?? entry.performed_by }}
                  </span>
                </div>
              </ng-template>
              <ng-template pTemplate="opposite" let-entry>
                <span class="timeline-ts">{{ entry.created_at ?? entry.timestamp | appDate }}</span>
              </ng-template>
            </p-timeline>
          </div>
          <div *ngIf="auditLog().length === 0" class="empty-state">
            <i class="pi pi-history empty-icon"></i>
            <p>No activity recorded for this vendor</p>
          </div>
        </p-tabPanel>

      </p-tabView>

      <!-- Offboarding confirmation dialog -->
      <p-dialog header="Confirm Offboarding" [(visible)]="showOffboardConfirm"
                [modal]="true" [style]="{width:'440px'}">
        <p>Are you sure you want to start the offboarding process for
          <strong>{{ vendorName() }}</strong>? This will trigger data access revocation
          and contract termination workflows.</p>
        <ng-template pTemplate="footer">
          <p-button label="Cancel" severity="secondary" [text]="true"
                    (onClick)="showOffboardConfirm = false" />
          <p-button label="Start Offboarding" icon="pi pi-user-minus"
                    severity="danger" (onClick)="startOffboarding()"
                    [loading]="offboardingStarting()" />
        </ng-template>
      </p-dialog>

    </app-page-shell>
  `,
  styles: [`
    /* Action toolbar */
    .vendor-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: var(--space-lg, 24px);
    }

    /* Profile grid */
    .profile-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-lg, 24px);
    }
    @media (max-width: 768px) {
      .profile-grid { grid-template-columns: 1fr; }
    }

    .detail-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid var(--surface-border, #e5e7eb);
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-label {
      font-size: var(--font-size-sm, 13px);
      font-weight: 600;
      color: var(--text-color-secondary, #6b7280);
      min-width: 140px;
    }
    .detail-value {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-color, #1f2937);
      text-align: right;
    }

    /* Progress bars */
    .progress-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .progress-bar {
      flex: 1;
      height: 6px;
      background: var(--surface-border, #e5e7eb);
      border-radius: 3px;
      overflow: hidden;
      min-width: 60px;
      max-width: 120px;
    }
    .progress-bar.lg {
      height: 10px;
      border-radius: 5px;
      max-width: 100%;
    }
    .progress-fill {
      height: 100%;
      background: var(--primary-500, #3b82f6);
      border-radius: inherit;
      transition: width 300ms ease;
    }

    /* DD progress header */
    .dd-progress-bar {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: var(--space-md, 16px);
    }
    .dd-progress-label {
      font-size: var(--font-size-sm, 13px);
      font-weight: 600;
      color: var(--text-color-secondary, #6b7280);
    }

    /* Section headings */
    .section-heading {
      font-size: var(--font-size-base, 14px);
      font-weight: 700;
      color: var(--text-color, #1f2937);
      margin: 0 0 var(--space-sm, 8px) 0;
    }
    .mt-3 { margin-top: var(--space-lg, 24px); }

    /* Timeline */
    .timeline-container {
      padding: var(--space-md, 16px) 0;
    }
    .timeline-entry {
      background: var(--surface-card, #fff);
      border: 1px solid var(--surface-border, #e5e7eb);
      border-radius: var(--radius-md, 8px);
      padding: 12px 16px;
      margin-bottom: 4px;
    }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .timeline-date {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-color-secondary, #9ca3af);
    }
    .timeline-detail {
      font-size: var(--font-size-sm, 13px);
      color: var(--text-color-secondary, #6b7280);
      margin: 4px 0;
    }
    .timeline-actor {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-color-secondary, #9ca3af);
    }
    .timeline-ts {
      font-size: var(--font-size-xs, 11px);
      color: var(--text-color-secondary, #9ca3af);
    }

    /* Empty states */
    .empty-msg {
      text-align: center;
      color: var(--text-color-secondary, #9ca3af);
      padding: var(--space-xl, 32px);
    }
    .empty-state {
      text-align: center;
      padding: var(--space-2xl, 48px);
      color: var(--text-color-secondary, #9ca3af);
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--space-md, 16px);
      display: block;
    }

    /* Document link */
    .doc-link {
      color: var(--primary-500, #3b82f6);
      text-decoration: none;
      font-size: var(--font-size-sm, 13px);
    }
    .doc-link:hover { text-decoration: underline; }
    .text-muted { color: var(--text-color-secondary, #9ca3af); }

    code {
      font-size: var(--font-size-sm, 13px);
      background: var(--surface-ground, #f3f4f6);
      padding: 2px 6px;
      border-radius: var(--radius-sm, 4px);
    }

    :host ::ng-deep .vendor-tabs .p-tabview-nav {
      border-bottom: 2px solid var(--surface-border, #e5e7eb);
    }
    :host ::ng-deep .vendor-tabs .p-tabview-panels {
      padding: var(--space-lg, 24px) 0;
    }
  `]
})
export class VendorDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly vendorApi = inject(VendorApiService);
  readonly i18n = inject(I18nService);

  private readonly base = environment.apiUrl;

  /** Route param */
  vendorId = '';

  /** Loading state */
  loading = signal(true);

  /** Vendor profile data */
  vendor = signal<GrcRecord | null>(null);

  /** Derived vendor name for breadcrumbs/title */
  vendorName = computed(() => {
    const v = this.vendor();
    return v?.name ?? v?.vendor_name ?? 'Vendor Detail';
  });

  /** Tab data signals */
  assessments = signal<GrcRecord[]>([]);
  documents = signal<GrcRecord[]>([]);
  findings = signal<GrcRecord[]>([]);
  slaMeasurements = signal<GrcRecord[]>([]);
  slaBreaches = signal<GrcRecord[]>([]);
  sharedResponsibility = signal<GrcRecord[]>([]);
  ddSteps = signal<GrcRecord[]>([]);
  auditLog = signal<GrcRecord[]>([]);

  /** DD progress computed values */
  ddCompletedCount = computed(() =>
    this.ddSteps().filter(s => (s.status ?? '').toLowerCase() === 'completed').length
  );
  ddProgressPct = computed(() => {
    const total = this.ddSteps().length;
    return total > 0 ? Math.round((this.ddCompletedCount() / total) * 100) : 0;
  });

  /** Action button loading states */
  scorecardRunning = signal(false);
  ddInitiating = signal(false);
  offboardingStarting = signal(false);

  /** Offboarding confirmation dialog */
  showOffboardConfirm = false;

  /** Helper methods exposed to the template */
  riskSev = riskSeverity;
  ddStepSev = ddStepSeverity;

  ngOnInit(): void {
    this.vendorId = this.route.snapshot.paramMap.get('vendorId') ?? '';
    if (!this.vendorId) {
      this.loading.set(false);
      return;
    }
    this.loadAllData();
  }

  /**
   * Load all vendor data in parallel using forkJoin.
   * Each stream is wrapped with catchError so a single failure
   * does not block the rest of the view from rendering.
   */
  private loadAllData(): void {
    forkJoin({
      profile: this.http.get<unknown>(`${this.base}/vendors/${this.vendorId}`).pipe(
        catchError(() => of(null))
      ),
      ddSteps: this.vendorApi.getDueDiligenceStatus(this.vendorId).pipe(
        catchError(() => of([]))
      ),
      subVendors: this.vendorApi.getSubVendors(this.vendorId).pipe(
        catchError(() => of([]))
      ),
      slaBreaches: this.vendorApi.getSLABreaches(this.vendorId).pipe(
        catchError(() => of([]))
      ),
      monitoring: this.vendorApi.getMonitoringSignals(this.vendorId).pipe(
        catchError(() => of([]))
      ),
    }).subscribe({
      next: (results) => {
        /* --- Profile --- */
        const profile = results.profile;
        if (profile) {
          const vendorData = profile.vendor ?? profile;
          this.vendor.set(vendorData);

          /* Extract nested collections from the profile response if present */
          this.assessments.set(
            vendorData.assessments ?? vendorData.vendor_assessments ?? []
          );
          this.documents.set(
            vendorData.documents ?? vendorData.vendor_documents ?? []
          );
          this.findings.set(
            vendorData.findings ?? vendorData.vendor_findings ?? []
          );
          this.slaMeasurements.set(
            vendorData.sla_measurements ?? vendorData.vendor_sla_measurements ?? []
          );
          this.sharedResponsibility.set(
            vendorData.shared_responsibility ?? vendorData.vendor_shared_responsibility ?? []
          );
          this.auditLog.set(
            vendorData.audit_log ?? vendorData.vendor_audit_log ?? vendorData.timeline ?? []
          );
        }

        /* --- Due Diligence steps --- */
        const ddRaw = results.ddSteps;
        const ddList = Array.isArray(ddRaw) ? ddRaw : (ddRaw as GrcRecord)?.steps ?? [];
        this.ddSteps.set(ddList);

        /* --- SLA breaches --- */
        const breachRaw = results.slaBreaches;
        const breachList = Array.isArray(breachRaw) ? breachRaw : (breachRaw as GrcRecord)?.breaches ?? [];
        this.slaBreaches.set(breachList);

        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Run the vendor scorecard calculation */
  runScorecard(): void {
    this.scorecardRunning.set(true);
    this.http.post<unknown>(`${this.base}/vendors/${this.vendorId}/score`, {}).subscribe({
      next: (res) => {
        if (res?.risk_score !== undefined) {
          const current = this.vendor();
          this.vendor.set({ ...current, risk_score: res.risk_score, risk_rating: res.risk_rating });
        }
        this.scorecardRunning.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.scorecardRunning.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Initiate a due diligence process for this vendor */
  initiateDueDiligence(): void {
    this.ddInitiating.set(true);
    this.vendorApi.initiateDueDiligence({ vendor_id: this.vendorId }).subscribe({
      next: () => {
        this.ddInitiating.set(false);
        /* Reload DD steps after initiation */
        this.vendorApi.getDueDiligenceStatus(this.vendorId).pipe(
          catchError(() => of([]))
        ).subscribe((ddRaw) => {
          const ddList = Array.isArray(ddRaw) ? ddRaw : (ddRaw as GrcRecord)?.steps ?? [];
          this.ddSteps.set(ddList);
          this.cdr.markForCheck();
        });
        this.cdr.markForCheck();
      },
      error: () => {
        this.ddInitiating.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Start the offboarding workflow */
  startOffboarding(): void {
    this.offboardingStarting.set(true);
    this.vendorApi.initiateOffboarding({ vendor_id: this.vendorId }).subscribe({
      next: () => {
        this.showOffboardConfirm = false;
        this.offboardingStarting.set(false);
        /* Update local status to reflect offboarding */
        const current = this.vendor();
        this.vendor.set({ ...current, status: 'offboarding' });
        this.cdr.markForCheck();
      },
      error: () => {
        this.offboardingStarting.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** Propagate risk via cross-agent routing -- navigates to vendor risk workspace */
  propagateRisk(): void {
    this.router.navigate(['/vendor-risk', 'risk-profile'], {
      queryParams: { vendorId: this.vendorId },
    });
  }
}
