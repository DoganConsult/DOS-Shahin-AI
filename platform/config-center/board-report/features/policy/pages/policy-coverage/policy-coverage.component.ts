/**
 * Policy Coverage & Linkage Page
 *
 * Coverage analysis page with 4 tabs:
 * 1. Obligation Coverage — linked obligations and uncovered gaps
 * 2. Control Coverage — linked controls and uncovered gaps
 * 3. Risk Coverage — linked risks and uncovered gaps
 * 4. Gap Analysis — summary KPI cards and detail tables with link actions
 */
import {
  Component, OnInit, inject, DestroyRef,
  ChangeDetectionStrategy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/select';
import { CalendarModule } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { GrcDataTableComponent } from '@app/shared/components';
import { PolicyApiService } from '../../services/policy-api.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

/** Obligation coverage item */
export interface ObligationCoverage {
  id: string;
  title: string;
  framework: string;
  linkedPolicies: number;
  status: 'covered' | 'uncovered';
}

/** Control coverage item */
export interface ControlCoverage {
  id: string;
  controlId: string;
  title: string;
  framework: string;
  linkedPolicies: number;
  status: 'covered' | 'uncovered';
}

/** Risk coverage item */
export interface RiskCoverage {
  id: string;
  title: string;
  severity: string;
  linkedPolicies: number;
  status: 'covered' | 'uncovered';
}

interface GapItem {
  id: string;
  title: string;
  framework?: string;
  controlId?: string;
  severity?: string;
  [key: string]: unknown;
}

export interface CoverageGaps {
  uncoveredObligations: GapItem[];
  uncoveredControls: GapItem[];
  uncoveredRisks: GapItem[];
  policiesWithoutControls: GapItem[];
  policiesWithoutRisks: GapItem[];
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-policy-coverage',
    imports: [
        CommonModule, FormsModule, GrcDataTableComponent, PageHeaderComponent,
        ButtonModule, TableModule, TagModule, DialogModule, TabViewModule,
        TooltipModule, ProgressBarModule, InputTextModule, DropdownModule,
        CalendarModule, ConfirmDialogModule, ToastModule,
    ],
    providers: [MessageService, ConfirmationService],
    templateUrl: './policy-coverage.component.html',
    styleUrls: ['./policy-coverage.component.scss']
})
export class PolicyCoverageComponent implements OnInit {
  private api = inject(PolicyApiService);
  private msgService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  public i18n = inject(I18nService);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed(() => this.i18n.direction() as 'ltr' | 'rtl');

  readonly headerActions: PageHeaderAction[] = [];

  // -- Loading states --
  loadingObligations = signal(true);
  loadingControls = signal(true);
  loadingRisks = signal(true);
  loadingGaps = signal(true);

  // -- Data --
  obligations = signal<ObligationCoverage[]>([]);
  controls = signal<ControlCoverage[]>([]);
  risks = signal<RiskCoverage[]>([]);
  gaps = signal<CoverageGaps>({
    uncoveredObligations: [],
    uncoveredControls: [],
    uncoveredRisks: [],
    policiesWithoutControls: [],
    policiesWithoutRisks: [],
  });

  // Gap KPIs
  gapKpiUncoveredObligations = computed(() => this.gaps().uncoveredObligations.length);
  gapKpiUncoveredControls = computed(() => this.gaps().uncoveredControls.length);
  gapKpiUncoveredRisks = computed(() => this.gaps().uncoveredRisks.length);
  gapKpiPoliciesWithoutControls = computed(() => this.gaps().policiesWithoutControls.length);
  gapKpiPoliciesWithoutRisks = computed(() => this.gaps().policiesWithoutRisks.length);

  // -- Link dialog --
  showLinkDialog = signal(false);
  linkTarget = signal<{ type: string; id: string; title: string } | null>(null);
  linkPolicyId = '';
  policies = signal<{ label: string; value: string }[]>([]);

  activeTab = 0;

  ngOnInit(): void {
    this.loadObligationCoverage();
    this.loadControlCoverage();
    this.loadRiskCoverage();
    this.loadGapAnalysis();
    this.loadPolicies();
  }

  /** Load obligation coverage data */
  loadObligationCoverage(): void {
    this.loadingObligations.set(true);
    this.api.getObligationCoverage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, unknown>) => {
          const raw = Array.isArray(res) ? res : ((res['data'] || res['obligations'] || []) as Record<string, unknown>[]);
          this.obligations.set(raw.map((o: Record<string, unknown>) => this.normalizeObligation(o)));
          this.loadingObligations.set(false);
        },
        error: () => {
          this.obligations.set([]);
          this.loadingObligations.set(false);
        },
      });
  }

  loadControlCoverage(): void {
    this.loadingControls.set(true);
    this.api.getControlCoverage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, unknown>) => {
          const raw = Array.isArray(res) ? res : ((res['data'] || res['controls'] || []) as Record<string, unknown>[]);
          this.controls.set(raw.map((c: Record<string, unknown>) => this.normalizeControl(c)));
          this.loadingControls.set(false);
        },
        error: () => {
          this.controls.set([]);
          this.loadingControls.set(false);
        },
      });
  }

  loadRiskCoverage(): void {
    this.loadingRisks.set(true);
    this.api.getRiskCoverage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, unknown>) => {
          const raw = Array.isArray(res) ? res : ((res['data'] || res['risks'] || []) as Record<string, unknown>[]);
          this.risks.set(raw.map((r: Record<string, unknown>) => this.normalizeRisk(r)));
          this.loadingRisks.set(false);
        },
        error: () => {
          this.risks.set([]);
          this.loadingRisks.set(false);
        },
      });
  }

  loadGapAnalysis(): void {
    this.loadingGaps.set(true);
    this.api.getCoverageGaps()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: Record<string, unknown>) => {
          this.gaps.set({
            uncoveredObligations: (res['uncoveredObligations'] || res['uncovered_obligations'] || []) as GapItem[],
            uncoveredControls: (res['uncoveredControls'] || res['uncovered_controls'] || []) as GapItem[],
            uncoveredRisks: (res['uncoveredRisks'] || res['uncovered_risks'] || []) as GapItem[],
            policiesWithoutControls: (res['policiesWithoutControls'] || res['policies_without_controls'] || []) as GapItem[],
            policiesWithoutRisks: (res['policiesWithoutRisks'] || res['policies_without_risks'] || []) as GapItem[],
          });
          this.loadingGaps.set(false);
        },
        error: () => {
          this.loadingGaps.set(false);
        },
      });
  }

  /** Load policy dropdown options for link dialog */
  loadPolicies(): void {
    this.api.list({ limit: 500 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.policies.set(
            (res.data || []).map((p) => ({ label: p.title, value: p.id }))
          );
        },
        error: () => this.policies.set([]),
      });
  }

  /** Open link dialog for an uncovered item */
  openLinkDialog(type: string, item: GapItem): void {
    this.linkTarget.set({
      type,
      id: item.id || '',
      title: item.title || '',
    });
    this.linkPolicyId = '';
    this.showLinkDialog.set(true);
  }

  /** Submit link between policy and entity */
  submitLink(): void {
    const target = this.linkTarget();
    if (!target || !this.linkPolicyId) return;
    this.api.createLink({
      policyId: this.linkPolicyId,
      entityType: target.type,
      entityId: target.id,
    }).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.showLinkDialog.set(false);
          this.msgService.add({ severity: 'success', summary: 'Link created', life: 3000 });
          // Reload affected data
          if (target.type === 'obligation') this.loadObligationCoverage();
          else if (target.type === 'control') this.loadControlCoverage();
          else if (target.type === 'risk') this.loadRiskCoverage();
          this.loadGapAnalysis();
        },
        error: () => {
          this.msgService.add({ severity: 'error', summary: 'Failed to create link', life: 4000 });
        },
      });
  }

  /** Map coverage status to PrimeNG severity */
  coverageSeverity(status: string): 'success' | 'danger' {
    return status === 'covered' ? 'success' : 'danger';
  }

  /** Map risk severity to PrimeNG tag severity */
  riskSeverity(severity: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'info';
    }
  }

  // -- Normalizers --
  private normalizeObligation(raw: Record<string, unknown>): ObligationCoverage {
    const count = (raw['linkedPolicies'] || raw['linked_policies'] || raw['policy_count'] || 0) as number;
    return {
      id: (raw['id'] || raw['obligation_id'] || '') as string,
      title: (raw['title'] || raw['obligation_title'] || '') as string,
      framework: (raw['framework'] || raw['framework_code'] || '') as string,
      linkedPolicies: count,
      status: count > 0 ? 'covered' : 'uncovered',
    };
  }

  private normalizeControl(raw: Record<string, unknown>): ControlCoverage {
    const count = (raw['linkedPolicies'] || raw['linked_policies'] || raw['policy_count'] || 0) as number;
    return {
      id: (raw['id'] || raw['control_id'] || '') as string,
      controlId: (raw['controlId'] || raw['control_code'] || raw['control_id'] || '') as string,
      title: (raw['title'] || raw['control_title'] || '') as string,
      framework: (raw['framework'] || raw['framework_code'] || '') as string,
      linkedPolicies: count,
      status: count > 0 ? 'covered' : 'uncovered',
    };
  }

  private normalizeRisk(raw: Record<string, unknown>): RiskCoverage {
    const count = (raw['linkedPolicies'] || raw['linked_policies'] || raw['policy_count'] || 0) as number;
    return {
      id: (raw['id'] || raw['risk_id'] || '') as string,
      title: (raw['title'] || raw['risk_title'] || '') as string,
      severity: (raw['severity'] || raw['risk_severity'] || 'medium') as string,
      linkedPolicies: count,
      status: count > 0 ? 'covered' : 'uncovered',
    };
  }
}
