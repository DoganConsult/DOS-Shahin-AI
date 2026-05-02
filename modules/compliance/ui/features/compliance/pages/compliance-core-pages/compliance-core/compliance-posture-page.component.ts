/**
 * Compliance Posture Page
 * Shows readiness/posture by framework and domain, derived from
 * audit-readiness + overview data. No fake KPIs — all from real data.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { catchError, of, forkJoin } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { AuditReadinessDto, FrameworkSummaryDto, DomainSummaryDto, AssessmentRunDto, DomainDetailDto } from '../../../models/compliance.models';
import { DomainDetailDrawerComponent } from '../../../drawers/domain-detail-drawer.component';
import { COMPLIANCE_EN } from '../../../config/compliance.labels.en';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-posture-page',
    imports: [CommonModule, AppDatePipe, FormsModule, RouterModule, ExportButtonComponent, DomainDetailDrawerComponent],
    template: `
    <div class="posture-page" [dir]="i18n.direction()">
      <div class="page-toolbar">
        <h2>{{ i18n.translate('common.compliancePosture') }}</h2>
        <div class="toolbar-actions">
          <select class="filter-select" [(ngModel)]="frameworkFilter" (ngModelChange)="loadDomains()">
            <option value="">{{ i18n.translate('common.allFrameworks') }}</option>
            @for (fw of frameworks(); track fw.frameworkId) {
              <option [value]="fw.frameworkId">{{ i18n.localize(fw.nameEn, fw.nameAr) }}</option>
            }
          </select>
          <app-export-button module="compliance-posture" [label]="i18n.translate('common.export')" [data]="exportData()" />
        </div>
      </div>

      @if (loadError()) {
        <div class="load-error-banner" role="alert">
          <i class=""></i>
          <span>{{ loadError() }}</span>
          <button type="button" class="retry-btn" (click)="loadError.set(null); load()">{{ i18n.translate('common.retry') }}</button>
        </div>
      }

      @if (loading()) {
        <div class="loading-state" aria-live="polite"><i class=" pi-spinner"></i> {{ i18n.translate('common.loading') }}</div>
      }

      @if (!loading() && !loadError()) {
        <!-- Readiness Overview -->
        <div class="readiness-section">
          <h3>{{ i18n.translate('common.auditReadiness') }}</h3>
          <div class="readiness-cards">
            <div class="readiness-card">
              <div class="readiness-score" [class.good]="readiness()!.readinessScore >= 70" [class.warn]="readiness()!.readinessScore >= 40 && readiness()!.readinessScore < 70" [class.bad]="readiness()!.readinessScore < 40">
                {{ readiness()!.readinessScore }}%
              </div>
              <div class="readiness-label">{{ i18n.translate('common.overallReadiness') }}</div>
            </div>
            <div class="readiness-card">
              <div class="readiness-metric">{{ readiness()!.implementedPct }}%</div>
              <div class="readiness-label">{{ i18n.translate('common.implemented') }}</div>
              <div class="readiness-sub">{{ readiness()!.implemented }}/{{ readiness()!.totalControls }}</div>
            </div>
            <div class="readiness-card">
              <div class="readiness-metric">{{ readiness()!.testedPct }}%</div>
              <div class="readiness-label">{{ i18n.translate('common.tested') }}</div>
              <div class="readiness-sub">{{ readiness()!.tested }}/{{ readiness()!.totalControls }}</div>
            </div>
            <div class="readiness-card">
              <div class="readiness-metric">{{ readiness()!.evidencePct }}%</div>
              <div class="readiness-label">{{ i18n.translate('common.withEvidence') }}</div>
              <div class="readiness-sub">{{ readiness()!.withEvidence }}/{{ readiness()!.totalControls }}</div>
            </div>
            <div class="readiness-card">
              <div class="readiness-metric">{{ readiness()!.fullyReady }}</div>
              <div class="readiness-label">{{ i18n.translate('common.fullyReady') }}</div>
              <div class="readiness-sub">{{ i18n.translate('common.fullyReadySub') }}</div>
            </div>
          </div>
        </div>

        <!-- Framework Posture -->
        <div class="frameworks-section">
          <h3>{{ i18n.translate('common.postureByFramework') }}</h3>
          @if (frameworks().length === 0) {
            <div class="empty-state"><p>{{ i18n.translate('common.noActiveFrameworks') }}</p></div>
          }
          <div class="fw-grid">
            @for (fw of frameworks(); track fw.frameworkId) {
              <div class="fw-card" [routerLink]="['/compliance/frameworks']" [queryParams]="{ frameworkId: fw.frameworkId }">
                <div class="fw-name">{{ i18n.localize(fw.nameEn, fw.nameAr) }}</div>
                <div class="fw-bar-row">
                  <div class="fw-bar">
                    <div class="fw-bar-fill" [style.width.%]="fw.score"></div>
                  </div>
                  <span class="fw-score">{{ fw.score }}%</span>
                </div>
                <div class="fw-meta">
                  <span>{{ fw.totalControls }} {{ i18n.translate('common.controlsUnit') }}</span>
                  <span>{{ fw.evidenceCoverage }}% {{ i18n.translate('common.evidenceUnit') }}</span>
                  @if (fw.openGaps) {
                    <span class="fw-gaps">{{ fw.openGaps }} {{ i18n.translate('common.gapsUnit') }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Domain Posture -->
        @if (domains().length > 0) {
          <div class="domains-section">
            <h3>{{ i18n.translate('common.postureByDomain') }}</h3>
            <div class="domain-grid">
              @for (d of domains(); track d.nodeId) {
                <div class="domain-card" (click)="openDomainDetail(d.nodeId)" style="cursor: pointer;">
                  <div class="domain-header">
                    <span class="domain-code">{{ d.code }}</span>
                    <span class="domain-score" [class.good]="d.score >= 70" [class.warn]="d.score >= 40 && d.score < 70" [class.bad]="d.score < 40">{{ d.score }}%</span>
                  </div>
                  <div class="domain-name">{{ i18n.localize(d.titleEn, d.titleAr) }}</div>
                  <div class="domain-meta">
                    <span>{{ d.obligationsCount }} {{ i18n.translate('common.obligationsUnit') }}</span>
                    <span>{{ d.controlsMapped }} {{ i18n.translate('common.controlsUnit') }}</span>
                    @if (d.openGaps) {
                      <span class="domain-gaps" [routerLink]="['/compliance/gaps']" [queryParams]="{ frameworkId: d.frameworkId }" (click)="$event.stopPropagation()">{{ d.openGaps }} {{ i18n.translate('common.gapsUnit') }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (assessmentHistory().length > 0) {
          <div class="trend-section">
            <h3>{{ i18n.translate('common.assessmentTrend') }}</h3>
            <div class="trend-strip">
              @for (a of assessmentHistory(); track a.assessmentId) {
                <div class="trend-point">
                  <div class="trend-bar" [style.height.%]="a.score || 0"></div>
                  <span class="trend-score">{{ a.score != null ? a.score + '%' : '—' }}</span>
                  <span class="trend-date">{{ a.createdAt | appDate:'short' }}</span>
                </div>
              }
            </div>
          </div>
        }

        <!-- Vendor Health Impact on Compliance -->
        @if (vendorPosture().totalVendors > 0) {
          <div class="vendor-health-section">
            <h3>{{ i18n.translate('common.vendorHealthImpact') || 'Third-Party Risk Impact on Compliance' }}</h3>
            <div class="readiness-cards">
              <div class="readiness-card">
                <div class="readiness-score" [class.good]="vendorPosture().avgScore >= 70" [class.warn]="vendorPosture().avgScore >= 40 && vendorPosture().avgScore < 70" [class.bad]="vendorPosture().avgScore < 40">
                  {{ vendorPosture().avgScore }}%
                </div>
                <div class="readiness-label">{{ i18n.translate('common.vendorHealth') || 'Vendor Health Score' }}</div>
              </div>
              <div class="readiness-card">
                <div class="readiness-metric">{{ vendorPosture().totalVendors }}</div>
                <div class="readiness-label">{{ i18n.translate('common.activeVendors') || 'Active Vendors' }}</div>
              </div>
              <div class="readiness-card">
                <div class="readiness-metric" [style.color]="vendorPosture().highRiskCount > 0 ? 'var(--error)' : 'var(--text-color)'">{{ vendorPosture().highRiskCount }}</div>
                <div class="readiness-label">{{ i18n.translate('common.highRiskVendors') || 'High/Critical Risk' }}</div>
              </div>
              <div class="readiness-card">
                <div class="readiness-metric">{{ vendorPosture().vendorControlPct }}%</div>
                <div class="readiness-label">{{ i18n.translate('common.vendorControlExposure') || 'Control Exposure' }}</div>
                <div class="readiness-sub">{{ i18n.translate('common.vendorControlExposureSub') || 'Controls dependent on vendors' }}</div>
              </div>
              <div class="readiness-card">
                <div class="readiness-metric" [style.color]="vendorPosture().openFindings > 0 ? 'var(--warning-color, #d97706)' : 'var(--text-color)'">{{ vendorPosture().openFindings }}</div>
                <div class="readiness-label">{{ i18n.translate('common.vendorFindings') || 'Open Vendor Findings' }}</div>
              </div>
            </div>
          </div>
        }

        <div class="orgunit-section">
          <h3>{{ i18n.translate('common.postureByOrgUnit') || 'Posture by Org Unit' }}</h3>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <select class="filter-select" [(ngModel)]="orgGroupBy" (ngModelChange)="loadOrgPosture()">
              <option value="department">{{ i18n.translate('common.department') || 'Department' }}</option>
              <option value="business_unit">{{ i18n.translate('common.businessUnit') || 'Business Unit' }}</option>
            </select>
          </div>
          @if (orgPosture().length > 0) {
            <div class="fw-grid">
              @for (unit of orgPosture(); track unit.unit_id) {
                <div class="fw-card">
                  <div class="fw-name">{{ unit.unit_name || 'Unassigned' }}</div>
                  <div class="fw-bar-row">
                    <div class="fw-bar"><div class="fw-bar-fill" [style.width.%]="unit.total_controls ? (unit.implemented / unit.total_controls * 100) : 0"></div></div>
                    <span class="fw-score">{{ unit.total_controls ? (unit.implemented / unit.total_controls * 100 | number:'1.0-0') : 0 }}%</span>
                  </div>
                  <div class="fw-meta">
                    <span>{{ unit.total_controls }} controls</span>
                    <span>{{ unit.implemented }} implemented</span>
                    @if (unit.open_gaps) { <span class="fw-gaps">{{ unit.open_gaps }} open gaps</span> }
                    @if (unit.critical_gaps) { <span class="fw-gaps">{{ unit.critical_gaps }} critical</span> }
                  </div>
                </div>
              }
            </div>
          }
          @if (orgPosture().length === 0) {
            <div class="empty-state"><p>{{ i18n.translate('common.noOrgData') || 'No org-unit data available. Assign departments/BUs to controls and findings.' }}</p></div>
          }
        </div>

        <div class="derived-note">
          <i class=""></i>
          {{ i18n.translate('common.readinessDerived') }}
        </div>

        <div class="cross-links">
          <a class="cross-link-btn" [routerLink]="['/compliance/controls']"><i class=""></i> Controls</a>
          <a class="cross-link-btn" [routerLink]="['/compliance/gaps']"><i class=""></i> Gaps</a>
          <a class="cross-link-btn" [routerLink]="['/compliance/assessments']"><i class=""></i> Assessments</a>
          <a class="cross-link-btn" [routerLink]="['/risk/home']"><i class=""></i> Risk Module</a>
          <a class="cross-link-btn" [routerLink]="['/audit/overview']"><i class=""></i> Audit Module</a>
          <a class="cross-link-btn" [routerLink]="['/governance/overview']"><i class=""></i> Governance</a>
          <a class="cross-link-btn" [routerLink]="['/foundation/evidence']"><i class=""></i> Evidence</a>
        </div>
      }

      <!-- Domain Detail Drawer -->
      <compliance-domain-drawer
        [detail]="selectedDomainDetail()"
        [visible]="domainDetailDrawerVisible()"
        [isAr]="i18n.isAr()"
        [L]="COMPLIANCE_EN"
        (closed)="closeDomainDetail()" />
    </div>
  `,
    styles: [`
    .posture-page { padding: 20px 28px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .page-toolbar h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card, #fff); }

    .loading-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary); }
    .empty-state { text-align: center; padding: 24px; color: var(--text-color-secondary); }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }

    h3 { font-size: var(--font-size-md); font-weight: 600; margin: 0 0 12px; }

    .readiness-section { margin-bottom: 28px; }
    .readiness-cards { display: flex; gap: 16px; flex-wrap: wrap; }
    .readiness-card { flex: 1; min-width: 140px; padding: 16px; border-radius: var(--radius-md); background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); text-align: center; }
    .readiness-score { font-size: 36px; font-weight: 800; }
    .readiness-score.good { color: #15803d; }
    .readiness-score.warn { color: #a16207; }
    .readiness-score.bad { color: #b91c1c; }
    .readiness-metric { font-size: var(--font-size-3xl); font-weight: 700; color: var(--text-heading, #111); }
    .readiness-label { font-size: var(--font-size-sm); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); margin-top: 4px; }
    .readiness-sub { font-size: var(--font-size-xs); color: var(--text-color-secondary); margin-top: 2px; }

    .frameworks-section, .domains-section, .orgunit-section { margin-bottom: 28px; }
    .fw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .fw-card { padding: 16px; border-radius: var(--radius-md); background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: box-shadow .15s; text-decoration: none; color: inherit; display: block; }
    .fw-card:hover { box-shadow: var(--shadow-card); }
    .fw-name { font-size: var(--font-size-base); font-weight: 600; margin-bottom: 8px; }
    .fw-bar-row { display: flex; align-items: center; gap: 8px; }
    .fw-bar { flex: 1; height: 8px; border-radius: var(--radius-xs); background: var(--surface-200, var(--border-subtle)); overflow: hidden; }
    .fw-bar-fill { height: 100%; border-radius: var(--radius-xs); background: linear-gradient(90deg, var(--primary), var(--success)); transition: width .3s; }
    .fw-score { font-size: var(--font-size-base); font-weight: 700; min-width: 40px; text-align: end; }
    .fw-meta { display: flex; gap: 12px; margin-top: 8px; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .fw-gaps { color: #b91c1c; font-weight: 600; }

    .domain-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .domain-card { padding: 14px; border-radius: var(--radius); background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .domain-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .domain-code { font-family: monospace; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .domain-score { font-size: var(--font-size-base); font-weight: 700; }
    .domain-score.good { color: #15803d; }
    .domain-score.warn { color: #a16207; }
    .domain-score.bad { color: #b91c1c; }
    .domain-name { font-size: var(--font-size-sm); font-weight: 600; margin-bottom: 6px; }
    .domain-meta { display: flex; gap: 10px; font-size: var(--font-size-xs); color: var(--text-color-secondary); }
    .domain-gaps { color: #b91c1c; cursor: pointer; text-decoration: underline; }

    .trend-section { margin-bottom: 28px; }
    .trend-strip { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 12px 0; }
    .trend-point { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
    .trend-bar { width: 24px; border-radius: var(--radius-xs) 4px 0 0; background: linear-gradient(180deg, var(--primary), var(--success)); min-height: 4px; transition: height .3s; }
    .trend-score { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-heading); }
    .trend-date { font-size: var(--font-size-xs); color: var(--text-color-secondary); }

    .derived-note { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: var(--radius); background: #eff6ff; color: #1e40af; font-size: var(--font-size-sm); margin-top: 8px; }
    .derived-note i { font-size: var(--font-size-base); }

    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; text-decoration: none; color: inherit; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class CompliancePosturePageComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly COMPLIANCE_EN = COMPLIANCE_EN;

  loading = signal(true);
  readiness = signal<AuditReadinessDto>({ totalControls: 0, implemented: 0, tested: 0, withEvidence: 0, fullyReady: 0, readinessScore: 0, implementedPct: 0, testedPct: 0, evidencePct: 0 });
  frameworks = signal<FrameworkSummaryDto[]>([]);
  domains = signal<DomainSummaryDto[]>([]);
  assessmentHistory = signal<AssessmentRunDto[]>([]);
  orgPosture = signal<GrcRecord[]>([]);
  vendorPosture = signal<{ avgScore: number; totalVendors: number; highRiskCount: number; vendorControlPct: number; openFindings: number }>({
    avgScore: 0, totalVendors: 0, highRiskCount: 0, vendorControlPct: 0, openFindings: 0,
  });
  frameworkFilter = '';
  orgGroupBy: 'department' | 'business_unit' = 'department';

  // Domain detail drawer state
  selectedDomainDetail = signal<DomainDetailDto | null>(null);
  domainDetailDrawerVisible = signal(false);
  domainDetailLoading = signal(false);

  exportData = computed(() => {
    return this.frameworks().map(fw => ({
      framework: fw.nameEn,
      score: fw.score,
      controls: fw.totalControls,
      implemented: fw.implementedControls,
      evidence: fw.evidenceCoverage,
      gaps: fw.openGaps ?? 0,
    }));
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    if (qp['frameworkId']) this.frameworkFilter = qp['frameworkId'];
    this.load();
  }

  /** Set when load fails so we show "Failed to load" + retry */
  loadError = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const failMsg = this.i18n.translate('common.failedToLoad') || 'Failed to load';
    forkJoin({
      readiness: this.api.getAuditReadiness().pipe(catchError(() => { this.loadError.set(failMsg); return of(this.readiness()); })),
      frameworks: this.api.getFrameworks().pipe(catchError(() => { this.loadError.set(failMsg); return of([]); })),
      domains: this.api.getDomains(this.frameworkFilter || undefined).pipe(catchError(() => { this.loadError.set(failMsg); return of([]); })),
      history: this.api.getAssessmentHistory().pipe(catchError(() => { this.loadError.set(failMsg); return of([]); })),
    }).subscribe(res => {
      this.readiness.set(res.readiness);
      this.frameworks.set(Array.isArray(res.frameworks) ? res.frameworks : []);
      this.domains.set(Array.isArray(res.domains) ? res.domains : []);
      this.assessmentHistory.set(Array.isArray(res.history) ? res.history : []);
      this.loading.set(false);
      this.loadOrgPosture();
      this.loadVendorPosture();
    });
  }

  loadDomains(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { frameworkId: this.frameworkFilter || null },
      queryParamsHandling: 'merge',
    });
    this.load();
  }

  loadOrgPosture(): void {
    this.api.getPostureByOrg(this.orgGroupBy).pipe(catchError(() => of([]))).subscribe(data => {
      this.orgPosture.set(Array.isArray(data) ? data : []);
    });
  }

  loadVendorPosture(): void {
    this.api.getVendorPosture().pipe(catchError(() => of(null))).subscribe((data) => {
      if (data) {
        const d = data as any;
        this.vendorPosture.set({
          avgScore: d.avgScore ?? 0,
          totalVendors: d.totalVendors ?? 0,
          highRiskCount: d.highRiskCount ?? 0,
          vendorControlPct: d.vendorControlPct ?? 0,
          openFindings: d.openFindings ?? 0,
        });
      }
    });
  }

  openDomainDetail(nodeId: string): void {
    this.domainDetailLoading.set(true);
    this.domainDetailDrawerVisible.set(true);
    this.api.getDomainDetail(nodeId).pipe(
      catchError((err) => {
        this.loadError.set(this.i18n.translate('common.failedToLoad') || 'Failed to load domain details');
        this.domainDetailLoading.set(false);
        this.domainDetailDrawerVisible.set(false);
        return of(null);
      })
    ).subscribe((detail) => {
      this.domainDetailLoading.set(false);
      if (detail) {
        this.selectedDomainDetail.set(detail);
      } else {
        this.domainDetailDrawerVisible.set(false);
      }
    });
  }

  closeDomainDetail(): void {
    this.domainDetailDrawerVisible.set(false);
    this.selectedDomainDetail.set(null);
  }
}
