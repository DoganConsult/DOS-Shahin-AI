// @ts-nocheck
import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import type { ObligationDetailDto, ObligationRowDto } from '../../../models/compliance.models';
import type { ObligationPolicyLinkDto } from '../../../services/compliance-api.types';
import { ButtonModule, ModalModule, NotificationModule, PlaceholderModule, ProgressIndicatorModule, TableModule, TabsModule, TagModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    selector: 'app-obligation-detail-page',
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [],
    imports: [
        CommonModule, RouterModule, TabsModule, TagModule, ButtonModule,
        TableModule, PlaceholderModule, ProgressIndicatorModule, ModalModule,
        NotificationModule, EmptyStateComponent,
    ],
    template: `
    <!-- Loading -->
    @if (loading()) {
      <div class="skeleton-wrap">
        <cds-placeholder></cds-placeholder>
        <cds-placeholder></cds-placeholder>
        <cds-placeholder></cds-placeholder>
      </div>
    }

    <!-- Error -->
    @if (!loading() && error()) {
      <app-empty-state variant="error" titleEn="Failed to load obligation" titleAr="فشل تحميل الالتزام">
        <button cdsButton label="Retry" icon="" (click)="load()" class=""></button>
      </app-empty-state>
    }

    <!-- Content -->
    @if (!loading() && !error() && detail()) {
      <!-- Sticky Header -->
      <header class="obl-header">
        <div class="obl-header__top">
          <button cdsButton icon="" class=" " (click)="goBack()"></button>
          <span class="obl-code">{{ detail()!.obligation.code }}</span>
          <h2 class="obl-title">{{ isAr() ? detail()!.obligation.titleAr : detail()!.obligation.titleEn }}</h2>
          <cds-tag *ngIf="detail()!.obligation.priority" [value]="detail()!.obligation.priority"
                 [severity]="detail()!.obligation.priority === 'critical' || detail()!.obligation.priority === 'high' ? 'danger' : 'info'" />
        </div>
        <div class="obl-header__meta">
          <span class="meta-item"><i class=""></i> {{ detail()!.obligation.frameworkName }}</span>
          <span *ngIf="detail()!.obligation.domainName" class="meta-item"><i class=""></i> {{ isAr() ? detail()!.obligation.domainNameAr : detail()!.obligation.domainName }}</span>
          <span *ngIf="detail()!.obligation.owner" class="meta-item"><i class=""></i> {{ detail()!.obligation.owner }}</span>
          <span class="meta-item"><i class="" [attr.data-status]="detail()!.obligation.status"></i> {{ formatStatus(detail()!.obligation.status) }}</span>
          <span *ngIf="detail()!.obligation.dueDate" class="meta-item"><i class=""></i> {{ detail()!.obligation.dueDate | date:'mediumDate' }}</span>
        </div>
      </header>

      <!-- Summary Strip -->
      <section class="summary-strip">
        <div class="summary-card" (click)="activeTab = 3">
          <span class="summary-value">{{ detail()!.controls?.length || 0 }}</span>
          <span class="summary-label">Controls Linked</span>
        </div>
        <div class="summary-card" (click)="activeTab = 4">
          <span class="summary-value">{{ policies().length }}</span>
          <span class="summary-label">Policies Linked</span>
        </div>
        <div class="summary-card" (click)="activeTab = 5">
          <span class="summary-value">{{ detail()!.evidence?.length || 0 }}</span>
          <span class="summary-label">Evidence Items</span>
        </div>
        <div class="summary-card">
          <span class="summary-value">{{ detail()!.obligation.assessmentResult || '—' }}</span>
          <span class="summary-label">Last Assessment</span>
        </div>
        <div class="summary-card" (click)="activeTab = 7">
          <span class="summary-value">{{ detail()!.findings?.length || 0 }}</span>
          <span class="summary-label">Open Issues</span>
        </div>
        <div class="summary-card" (click)="activeTab = 8">
          <span class="summary-value">{{ regulatoryChanges().length }}</span>
          <span class="summary-label">Active Changes</span>
        </div>
      </section>

      <!-- Tabbed Content -->
      <cds-tabs [(activeIndex)]="activeTab" [scrollable]="true">
        <!-- Tab 0: Overview -->
        <cds-tab header="Overview" leftIcon="">
          <div class="overview-grid">
            <div class="overview-field">
              <label>Obligation Code</label>
              <span>{{ detail()!.obligation.code }}</span>
            </div>
            <div class="overview-field">
              <label>Framework</label>
              <span>{{ detail()!.obligation.frameworkName }}</span>
            </div>
            <div class="overview-field">
              <label>Priority</label>
              <span>{{ detail()!.obligation.priority }}</span>
            </div>
            <div class="overview-field">
              <label>Status</label>
              <span>{{ formatStatus(detail()!.obligation.status) }}</span>
            </div>
            <div class="overview-field">
              <label>Control Coverage</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <cds-progress-bar [value]="detail()!.obligation.controlCoverage" [showValue]="false" style="flex:1; height:8px;" />
                <span>{{ detail()!.obligation.controlCoverage }}%</span>
              </div>
            </div>
            <div class="overview-field">
              <label>Evidence Coverage</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <cds-progress-bar [value]="detail()!.obligation.evidenceCoverage" [showValue]="false" style="flex:1; height:8px;" />
                <span>{{ detail()!.obligation.evidenceCoverage }}%</span>
              </div>
            </div>
            <div *ngIf="detail()!.obligation.owner" class="overview-field">
              <label>Owner</label>
              <span>{{ detail()!.obligation.owner }}</span>
            </div>
            <div *ngIf="detail()!.obligation.dueDate" class="overview-field">
              <label>Next Review</label>
              <span>{{ detail()!.obligation.dueDate | date:'mediumDate' }}</span>
            </div>
          </div>
        </cds-tab>

        <!-- Tab 1: Requirement Text -->
        <cds-tab header="Requirement Text" leftIcon="">
          <div class="req-text-section">
            <h4>Original Text</h4>
            <p class="req-text">{{ isAr() ? detail()!.obligation.descriptionAr : detail()!.obligation.descriptionEn }}</p>
          </div>
          @if (detail()!.obligation.evidenceTypes?.length) {
            <div class="req-text-section">
              <h4>Required Evidence Types</h4>
              <div class="chip-list">
                @for (et of detail()!.obligation.evidenceTypes!; track et) {
                  <span class="chip">{{ et }}</span>
                }
              </div>
            </div>
          }
        </cds-tab>

        <!-- Tab 2: Applicability -->
        <cds-tab header="Applicability" leftIcon="">
          <div class="applicability-section">
            <div class="overview-field">
              <label>Applicability Status</label>
              <span>{{ formatStatus(detail()!.obligation.status) }}</span>
            </div>
            <p class="text-muted">Applicability scope and rules for this obligation will be displayed here when configured.</p>
          </div>
        </cds-tab>

        <!-- Tab 3: Controls -->
        <cds-tab header="Controls" leftIcon="">
          @if (detail()!.controls?.length) {
            <table cdsTable [value]="detail()!.controls" [paginator]="detail()!.controls.length > 20" [rows]="20"
                     [rowsPerPageOptions]="[10, 20, 50]" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Test Status</th>
                  <th>Mapping Type</th>
                  <th>Coverage</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-c>
                <tr>
                  <td>{{ c.title || c.control_id }}</td>
                  <td><cds-tag [value]="c.status || 'unknown'" [severity]="c.status === 'implemented' ? 'success' : 'warning'" /></td>
                  <td>{{ c.test_status || '—' }}</td>
                  <td>{{ c.mapping_type || c.mappingType || 'direct' }}</td>
                  <td>{{ c.coverage_percent || c.coveragePercent || '—' }}%</td>
                </tr>
              </ng-template>
            </table>
          } @else {
            <app-empty-state variant="info" titleEn="No controls linked" titleAr="لا توجد ضوابط مرتبطة" />
          }
          <div class="tab-actions">
            <button cdsButton label="Map Control" icon="" class=" " (click)="onMapControl()"></button>
          </div>
        </cds-tab>

        <!-- Tab 4: Policies -->
        <cds-tab header="Policies" leftIcon="">
          @if (policiesLoading()) {
            <cds-placeholder></cds-placeholder>
          } @else if (policies().length) {
            <table cdsTable [value]="policies()" [paginator]="policies().length > 20" [rows]="20" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>Policy</th>
                  <th>Status</th>
                  <th>Link Type</th>
                  <th>Relevance</th>
                  <th>Actions</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-p>
                <tr>
                  <td>{{ p.policyTitle || p.policyId }}</td>
                  <td><cds-tag [value]="p.policyStatus || 'unknown'" [severity]="p.policyStatus === 'approved' ? 'success' : 'warning'" /></td>
                  <td>{{ p.linkType }}</td>
                  <td>{{ p.relevanceScore }}%</td>
                  <td>
                    <button cdsButton icon="" class="  "
                            (click)="unlinkPolicy(p.policyId)"></button>
                  </td>
                </tr>
              </ng-template>
            </table>
          } @else {
            <app-empty-state variant="info" titleEn="No policies linked" titleAr="لا توجد سياسات مرتبطة" />
          }
          <div class="tab-actions">
            <button cdsButton label="Link Policy" icon="" class=" " (click)="onLinkPolicy()"></button>
          </div>
        </cds-tab>

        <!-- Tab 5: Evidence -->
        <cds-tab header="Evidence" leftIcon="">
          @if (detail()!.evidence?.length) {
            <table cdsTable [value]="detail()!.evidence" [paginator]="detail()!.evidence.length > 20" [rows]="20" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr>
                  <th>Title</th>
                  <th>Verified</th>
                  <th>Expiry</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-e>
                <tr>
                  <td>{{ e.title || e.evidence_id }}</td>
                  <td><i [class]="e.verified ? ' text-success' : ' text-muted'"></i></td>
                  <td>{{ e.expiry_date ? (e.expiry_date | date:'mediumDate') : '—' }}</td>
                </tr>
              </ng-template>
            </table>
          } @else {
            <app-empty-state variant="info" titleEn="No evidence linked" titleAr="لا توجد أدلة مرتبطة" />
          }
          <div class="tab-actions">
            <button cdsButton label="Link Evidence" icon="" class=" " (click)="onMapEvidence()"></button>
          </div>
        </cds-tab>

        <!-- Tab 6: Assessments -->
        <cds-tab header="Assessments" leftIcon="">
          @if (assessments().length) {
            <table cdsTable [value]="assessments()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr><th>Assessment</th><th>Status</th><th>Score</th><th>Date</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-a>
                <tr>
                  <td>{{ a.title || a.assessmentId }}</td>
                  <td><cds-tag [value]="a.status" /></td>
                  <td>{{ a.score ?? '—' }}</td>
                  <td>{{ a.createdAt | date:'mediumDate' }}</td>
                </tr>
              </ng-template>
            </table>
          } @else {
            <app-empty-state variant="info" titleEn="No assessments recorded" titleAr="لا توجد تقييمات" />
          }
        </cds-tab>

        <!-- Tab 7: Issues & Actions -->
        <cds-tab header="Issues & Actions" leftIcon="">
          @if (detail()!.findings?.length) {
            <table cdsTable [value]="detail()!.findings" [paginator]="detail()!.findings.length > 20" [rows]="20" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr><th>Title</th><th>Severity</th><th>Status</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-f>
                <tr>
                  <td>{{ f.title || f.finding_id?.slice(0, 8) }}</td>
                  <td><cds-tag [value]="f.severity" [severity]="f.severity === 'critical' ? 'danger' : 'warning'" /></td>
                  <td>{{ f.status }}</td>
                </tr>
              </ng-template>
            </table>
          } @else {
            <app-empty-state variant="info" titleEn="No issues found" titleAr="لا توجد مشكلات" />
          }
          @if (detail()!.remediationTasks?.length) {
            <h4 style="margin-top:16px;">Remediation Tasks</h4>
            <div class="task-list">
              @for (t of detail()!.remediationTasks; track t.task_id || $index) {
                <div class="task-row">
                  <span>{{ t.title || t.task_id }}</span>
                  <cds-tag [value]="t.status" />
                </div>
              }
            </div>
          }
        </cds-tab>

        <!-- Tab 8: Regulatory Changes -->
        <cds-tab header="Regulatory Changes" leftIcon="">
          @if (regulatoryChanges().length) {
            <table cdsTable [value]="regulatoryChanges()" styleClass="p-datatable-sm">
              <ng-template pTemplate="header">
                <tr><th>Title</th><th>Severity</th><th>Status</th><th>Effective Date</th></tr>
              </ng-template>
              <ng-template pTemplate="body" let-rc>
                <tr>
                  <td>{{ rc.title }}</td>
                  <td><cds-tag [value]="rc.severity || 'info'" /></td>
                  <td>{{ rc.status }}</td>
                  <td>{{ rc.effectiveDate | date:'mediumDate' }}</td>
                </tr>
              </ng-template>
            </table>
          } @else {
            <app-empty-state variant="info" titleEn="No regulatory changes affecting this obligation" titleAr="لا توجد تغييرات تنظيمية" />
          }
        </cds-tab>

        <!-- Tab 9: Activity -->
        <cds-tab header="Activity" leftIcon="">
          @if (activityLog().length) {
            <div class="activity-timeline">
              @for (entry of activityLog(); track entry.id || $index) {
                <div class="activity-entry">
                  <div class="activity-dot"></div>
                  <div class="activity-content">
                    <span class="activity-action">{{ entry.action }}</span>
                    <span class="activity-actor">{{ entry.actor }}</span>
                    <span class="activity-time">{{ entry.timestamp | date:'medium' }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <app-empty-state variant="info" titleEn="No activity recorded" titleAr="لا يوجد نشاط مسجل" />
          }
        </cds-tab>
      </cds-tabs>
    }

    <cds-notification></cds-notification>
  `,
    styles: [`
    :host { display: block; padding: 0 16px 24px; }

    .skeleton-wrap { padding: 24px 0; display: flex; flex-direction: column; gap: 12px; }

    .obl-header {
      position: sticky; top: 0; z-index: var(--z-elevated, 10);
      background: var(--bg-0, #fff); padding: 16px 0 12px;
      border-bottom: 1px solid var(--border, #e2e8f0);
    }
    .obl-header__top { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .obl-code {
      font-family: monospace; font-size: var(--font-size-tag); padding: 2px 8px;
      background: var(--primary, #3b82f6); color: #fff; border-radius: var(--radius-xs);
    }
    .obl-title { margin: 0; font-size: var(--font-size-xl); font-weight: 600; color: var(--text-body, #1e293b); }
    .obl-header__meta { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
    .meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-tag); color: var(--text-muted, #64748b); }
    .meta-item i { font-size: var(--font-size-caption); }
    [data-status="covered"] { color: var(--success, #16a34a); }
    [data-status="partially_covered"] { color: var(--warning, #d97706); }
    [data-status="uncovered"] { color: var(--error, #dc2626); }
    [data-status="not_assessed"] { color: var(--text-muted, #94a3b8); }

    .summary-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px; margin: 16px 0;
    }
    .summary-card {
      background: var(--bg-0, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: var(--radius); padding: 12px; text-align: center; cursor: pointer;
      transition: border-color 0.15s;
    }
    .summary-card:hover { border-color: var(--primary, #3b82f6); }
    .summary-value { display: block; font-size: var(--font-size-2xl); font-weight: 700; color: var(--text-body, #1e293b); }
    .summary-label { display: block; font-size: var(--font-size-sm); color: var(--text-muted, #64748b); margin-top: 4px; }

    .overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; padding: 16px 0; }
    .overview-field label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-muted, #64748b); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .overview-field span { font-size: var(--font-size-body-sm); color: var(--text-body, #1e293b); }

    .req-text-section { margin-bottom: 20px; }
    .req-text-section h4 { font-size: var(--font-size-body-sm); color: var(--text-muted, #64748b); margin-bottom: 8px; }
    .req-text { white-space: pre-wrap; line-height: 1.7; color: var(--text-body, #1e293b); }

    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-block; padding: 2px 10px; font-size: var(--font-size-caption);
      background: var(--primary, #3b82f6); color: #fff; border-radius: var(--radius-lg);
    }

    .applicability-section { padding: 16px 0; }
    .text-muted { color: var(--text-muted, #64748b); font-style: italic; }
    .text-success { color: var(--success, #16a34a); }

    .tab-actions { margin-top: 12px; display: flex; gap: 8px; }

    .task-list { display: flex; flex-direction: column; gap: 8px; }
    .task-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-0, #f8fafc); border-radius: var(--radius-sm); }

    .activity-timeline { display: flex; flex-direction: column; gap: 0; padding: 16px 0; }
    .activity-entry { display: flex; gap: 12px; padding: 8px 0; border-left: 2px solid var(--border, #e2e8f0); margin-left: 8px; padding-left: 16px; position: relative; }
    .activity-dot { position: absolute; left: -6px; top: 12px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary, #3b82f6); }
    .activity-content { display: flex; flex-direction: column; gap: 2px; }
    .activity-action { font-weight: 600; font-size: var(--font-size-body-sm); color: var(--text-body, #1e293b); }
    .activity-actor { font-size: var(--font-size-caption); color: var(--text-muted, #64748b); }
    .activity-time { font-size: var(--font-size-sm); color: var(--text-muted, #94a3b8); }
  `]
})
export class ObligationDetailPageComponent implements OnInit {
  private msg = inject(MessageService);

  private readonly i18n = inject(I18nService);
  private readonly http = inject(HttpClient);
  private readonly api = inject(ComplianceFeatureApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly msg = inject(MessageService);

  loading = signal(true);
  error = signal(false);
  detail = signal<ObligationDetailDto | null>(null);
  policies = signal<ObligationPolicyLinkDto[]>([]);
  policiesLoading = signal(false);
  regulatoryChanges = signal<any[]>([]);
  assessments = signal<any[]>([]);
  activityLog = signal<any[]>([]);

  activeTab = 0;
  isAr = computed(() => this.i18n.currentLang() === 'ar');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  load(id?: string): void {
    const obligationId = id || this.route.snapshot.paramMap.get('id');
    if (!obligationId) return;

    this.loading.set(true);
    this.error.set(false);

    // Load obligation detail
    this.api.getObligationDetail(obligationId).subscribe({
      next: (data) => {
        this.detail.set(data);
        this.loading.set(false);
        // Load additional data in parallel
        this.loadPolicies(obligationId);
        this.loadRegulatoryChanges(data.obligation.frameworkId);
        this.loadAssessments();
        this.loadActivity(obligationId);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadPolicies(obligationId: string): void {
    this.policiesLoading.set(true);
    this.api.getObligationPolicies(obligationId).subscribe({
      next: (data) => { this.policies.set(data.policies || []); this.policiesLoading.set(false); },
      error: () => { this.policies.set([]); this.policiesLoading.set(false); }
    });
  }

  private loadRegulatoryChanges(frameworkId?: string): void {
    if (!frameworkId) { this.regulatoryChanges.set([]); return; }
    this.api.getRegulatoryChanges().subscribe({
      next: (data) => {
        const items = (Array.isArray(data) ? data : []).filter(
          (rc: any) => !frameworkId || rc.regulatorCode === frameworkId || rc.frameworkId === frameworkId
        );
        this.regulatoryChanges.set(items);
      },
      error: () => this.regulatoryChanges.set([])
    });
  }

  private loadAssessments(): void {
    this.api.getAssessmentHistory().subscribe({
      next: (data) => this.assessments.set(data || []),
      error: () => this.assessments.set([])
    });
  }

  private loadActivity(entityId: string): void {
    this.http.get<any[]>(`/api/compliance-ext/obligations/${entityId}/activity`).subscribe({
      next: (data) => this.activityLog.set(data || []),
      error: () => this.activityLog.set([])
    });
  }

  unlinkPolicy(policyId: string): void {
    const obligationId = this.detail()?.obligation?.nodeId;
    if (!obligationId) return;
    this.api.unlinkPolicyFromObligation(obligationId, policyId).subscribe({
      next: () => {
        this.msg.add({ severity: 'success', summary: 'Policy unlinked' });
        this.loadPolicies(obligationId);
      },
      error: () => this.msg.add({ severity: 'error', summary: 'Failed to unlink policy' })
    });
  }

  onMapControl(): void {
    this.router.navigate(['/compliance/controls'], {
      queryParams: { action: 'map', obligationId: this.detail()?.obligation?.nodeId }
    });
  }

  onMapEvidence(): void {
    this.router.navigate(['/foundation/evidence'], {
      queryParams: { action: 'link', obligationId: this.detail()?.obligation?.nodeId }
    });
  }

  onLinkPolicy(): void {
    // Navigate to policy selection or open policy picker dialog
    this.msg.add({ severity: 'info', summary: 'Select a policy to link from the policy module' });
  }

  goBack(): void {
    this.router.navigate(['/compliance/obligations']);
  }

  formatStatus(s: string): string {
    return s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
  }
}
