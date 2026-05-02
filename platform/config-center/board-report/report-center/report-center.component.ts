import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ToastService } from '@app/dos/shell/toast.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { devError } from '../../../core/utils/dev-logger';
import {
  ReportFactoryCatalogService,
  AgrcReport, RoleProfile, WorkspaceHub, LifecycleStage
} from '@app/core/services/reporting/report-factory-catalog.service';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

type ViewMode = 'role' | 'workspace' | 'lifecycle';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-report-center',
  standalone: true,
  imports: [
    CommonModule, FormsModule, PageShellComponent,
    ButtonModule, TagModule, DialogModule, DropdownModule, TooltipModule
  ],
  template: `
    <app-page-shell icon="file" [title]="i18n.translate('reportCenter.reportCenter')"
      [subtitle]="isAr()
        ? catalog.getTotalReportCount() + ' تقرير احترافي × 3 صيغ (PDF / Excel / HTML تفاعلي) — مخصص لكل دور ومحور عمل ومرحلة'
        : catalog.getTotalReportCount() + ' professional reports × 3 formats (PDF / Excel / Interactive HTML) — tailored per role, hub & lifecycle'"
      [breadcrumbs]="['Dashboard', 'Reports']" [loading]="false">

      <!-- Stats Bar -->
      <div class="stats-bar">
        <div tabindex="0" role="button" (keyup.enter)="viewMode.set('role')" class="stat-pill" [class.active]="viewMode() === 'role'" (click)="viewMode.set('role')">
          <i class="pi pi-users"></i>
          <span class="stat-num">{{ catalog.getRoleReportCount() }}</span>
          <span class="stat-lbl">{{ i18n.translate('reportCenter.byRole') }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="viewMode.set('workspace')" class="stat-pill" [class.active]="viewMode() === 'workspace'" (click)="viewMode.set('workspace')">
          <i class="pi pi-th-large"></i>
          <span class="stat-num">{{ catalog.getWorkspaceReportCount() }}</span>
          <span class="stat-lbl">{{ i18n.translate('reportCenter.byHub') }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="viewMode.set('lifecycle')" class="stat-pill" [class.active]="viewMode() === 'lifecycle'" (click)="viewMode.set('lifecycle')">
          <i class="pi pi-sync"></i>
          <span class="stat-num">{{ catalog.getLifecycleReportCount() }}</span>
          <span class="stat-lbl">{{ i18n.translate('reportCenter.byStage') }}</span>
        </div>
      </div>

      <!-- Role Filter Chips -->
      @if (viewMode() === 'role') {
        <div class="filter-chips">
          <button class="chip" [class.active]="activeRoleKey() === ''" (click)="activeRoleKey.set('')">
            {{ i18n.translate('reportCenter.all') }} <span class="chip-count">{{ catalog.getRoleReportCount() }}</span>
          </button>
          @for (role of catalog.roles; track role.key) {
            <button class="chip" [class.active]="activeRoleKey() === role.key"
                    [style.--chip-color]="role.color" (click)="activeRoleKey.set(role.key)">
              <i class="pi" [ngClass]="role.icon"></i>
              {{ i18n.localize(role.labelEn, role.labelAr) }}
              <span class="chip-count">{{ catalog.getReportsByRole(role.key).length }}</span>
            </button>
          }
        </div>
      }

      <!-- Workspace Filter Chips -->
      @if (viewMode() === 'workspace') {
        <div class="filter-chips">
          <button class="chip" [class.active]="activeHubKey() === ''" (click)="activeHubKey.set('')">
            {{ i18n.translate('reportCenter.all') }} <span class="chip-count">{{ catalog.getWorkspaceReportCount() }}</span>
          </button>
          @for (hub of catalog.workspaceHubs; track hub.key) {
            <button class="chip" [class.active]="activeHubKey() === hub.key"
                    [style.--chip-color]="hub.color" (click)="activeHubKey.set(hub.key)">
              <i class="pi" [ngClass]="hub.icon"></i>
              {{ i18n.localize(hub.labelEn, hub.labelAr) }}
              <span class="chip-count">{{ catalog.getReportsByWorkspace(hub.key).length }}</span>
            </button>
          }
        </div>
      }

      <!-- Lifecycle Filter Chips -->
      @if (viewMode() === 'lifecycle') {
        <div class="filter-chips">
          <button class="chip" [class.active]="activeStageKey() === ''" (click)="activeStageKey.set('')">
            {{ i18n.translate('reportCenter.all') }} <span class="chip-count">{{ catalog.getLifecycleReportCount() }}</span>
          </button>
          @for (stage of catalog.lifecycleStages; track stage.key) {
            <button class="chip" [class.active]="activeStageKey() === stage.key"
                    [style.--chip-color]="stage.color" (click)="activeStageKey.set(stage.key)">
              <i class="pi" [ngClass]="stage.icon"></i>
              {{ i18n.localize(stage.labelEn, stage.labelAr) }}
              <span class="chip-count">{{ catalog.getReportsByLifecycle(stage.key).length }}</span>
            </button>
          }
        </div>
      }

      <!-- Report Grid -->
      <div class="report-grid">
        @for (report of filteredReports(); track report.id) {
          <div class="report-card">
            <div class="card-gradient" [style.background]="report.gradient">
              <i class="pi" [ngClass]="report.icon" style="font-size: var(--font-size-3xl);color:#fff"></i>
              <div class="card-priority">
                <span class="priority-dot" [ngClass]="'p-' + report.priority"></span>
                {{ report.priority }}
              </div>
            </div>
            <div class="card-body">
              <h3>{{ i18n.localize(report.titleEn, report.titleAr) }}</h3>
              <p>{{ i18n.localize(report.descEn, report.descAr) }}</p>
              <div class="card-meta">
                <span class="meta-item"><i class="pi pi-file"></i> ~{{ report.estimatedPages }} {{ i18n.translate('reportCenter.pages') }}</span>
                <span class="meta-item"><i class="pi pi-clock"></i> {{ report.frequency }}</span>
              </div>
              <div class="card-formats">
                @for (fmt of report.formats; track fmt) {
                  <span class="fmt-tag" [ngClass]="'fmt-' + fmt">{{ fmt.toUpperCase() }}</span>
                }
              </div>
              <div class="card-charts">
                @for (chart of report.charts.slice(0, 4); track chart) {
                  <span class="chart-tag">{{ chart }}</span>
                }
              </div>
            </div>
            <div class="card-actions">
              <button class="gen-btn" (click)="openGenerateDialog(report)">
                <i class="pi pi-download"></i>
                {{ i18n.translate('reportCenter.generate') }}
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Empty state -->
      @if (filteredReports().length === 0) {
        <div class="empty-state">
          <i class="pi pi-inbox" style="font-size:2.5rem;color:var(--surface-400)"></i>
          <p>{{ i18n.translate('reportCenter.noReportsMatchThisFilter') }}</p>
        </div>
      }

      <!-- Format Features -->
      <div class="format-features">
        <h3>{{ i18n.translate('reportCenter.availableExportFormats') }}</h3>
        <div class="format-grid">
          <div class="format-card pdf-card">
            <div class="format-icon"><i class="pi pi-file-pdf"></i></div>
            <h4>PDF</h4>
            <ul>
              <li>{{ i18n.translate('reportCenter.boardreadyFormat') }}</li>
              <li>{{ i18n.translate('reportCenter.arabicRtlSupport') }}</li>
              <li>{{ i18n.translate('reportCenter.orgLogoBranding') }}</li>
              <li>{{ i18n.translate('reportCenter.embeddedCharts') }}</li>
            </ul>
          </div>
          <div class="format-card excel-card">
            <div class="format-icon"><i class="pi pi-file-excel"></i></div>
            <h4>Excel</h4>
            <ul>
              <li>{{ i18n.translate('reportCenter.multisheetWorkbook') }}</li>
              <li>{{ i18n.translate('reportCenter.conditionalFormatting') }}</li>
              <li>{{ i18n.translate('reportCenter.filterableSortable') }}</li>
              <li>{{ i18n.translate('reportCenter.idealForAnalysts') }}</li>
            </ul>
          </div>
          <div class="format-card html-card">
            <div class="format-icon"><i class="pi pi-globe"></i></div>
            <h4>Interactive HTML</h4>
            <ul>
              <li>{{ i18n.translate('reportCenter.worksOffline') }}</li>
              <li>{{ i18n.translate('reportCenter.interactiveCharts') }}</li>
              <li>{{ i18n.translate('reportCenter.arabicenglishToggle') }}</li>
              <li>{{ i18n.translate('reportCenter.sortableTables') }}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Scheduled Reports -->
      <div class="schedules-section">
        <div class="section-header">
          <h3><i class="pi pi-calendar-clock"></i> {{ i18n.translate('reportCenter.scheduledReports') }}</h3>
          <button class="gen-btn" (click)="showScheduleDialog = true">
            <i class="pi pi-plus"></i> {{ i18n.translate('reportCenter.newSchedule') }}
          </button>
        </div>
        @if (schedules.length > 0) {
          <div class="schedule-list">
            @for (s of schedules; track s) {
              <div class="schedule-item">
                <div class="schedule-info">
                  <strong>{{ s.report_type || s.template_key || s.templateKey }}</strong>
                  <code>{{ s.cron_expression || s.cronExpression }}</code>
                </div>
                <p-tag [value]="s.status || 'active'" [severity]="s.status === 'paused' ? 'warning' : 'success'" />
              </div>
            }
          </div>
        } @else {
          <div class="no-schedules">{{ i18n.translate('reportCenter.noScheduledReportsYet') }}</div>
        }
      </div>

      <!-- Schedule Dialog -->
      <p-dialog [(visible)]="showScheduleDialog"
                [header]="i18n.translate('reportCenter.scheduleReport')"
                [style]="{width: '420px'}" [modal]="true">
        <div class="gen-field">
          <label>{{ i18n.translate('reportCenter.reportType') }}</label>
          <p-dropdown [options]="scheduleReportOptions" [(ngModel)]="newSchedule.templateKey" styleClass="w-full" />
        </div>
        <div class="gen-field">
          <label>{{ i18n.translate('reportCenter.cronExpression') }}</label>
          <input pInputText [(ngModel)]="newSchedule.cronExpression" placeholder="0 8 * * 1" aria-label="0 8 * * 1" class="w-full" />
        </div>
        <ng-template pTemplate="footer">
          <p-button [label]="i18n.translate('reportCenter.cancel')" severity="secondary" [text]="true" (onClick)="showScheduleDialog = false" />
          <p-button [label]="i18n.translate('reportCenter.create')" icon="pi pi-check" (onClick)="createSchedule()"
                    [disabled]="!newSchedule.templateKey || !newSchedule.cronExpression" />
        </ng-template>
      </p-dialog>

      <!-- Generate Dialog -->
      <p-dialog [(visible)]="generateDialogVisible"
                [header]="generateDialogTitle"
                [style]="{width: '480px'}" [modal]="true">
        @if (selectedReport) {
          <div class="gen-dialog">
            <div class="gen-field">
              <label>{{ i18n.translate('reportCenter.language') }}</label>
              <p-dropdown [options]="langOptions" [(ngModel)]="exportLang" styleClass="w-full" />
            </div>
            <div class="gen-field">
              <label>{{ i18n.translate('reportCenter.format') }}</label>
              <p-dropdown [options]="formatOptions()" [(ngModel)]="exportFormat"
                          optionLabel="label" optionValue="value" styleClass="w-full" />
            </div>
            <p-button [label]="i18n.translate('reportCenter.download')"
                      icon="pi pi-download" (onClick)="downloadReport()" styleClass="w-full mt-3" />
          </div>
        }
      </p-dialog>
    </app-page-shell>
  `,
  styles: [`
    .stats-bar { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
    .stat-pill {
      display:flex; align-items:center; gap:8px; padding:10px 20px;
      border-radius:var(--radius-lg); border:1.5px solid var(--surface-border,var(--border-subtle));
      background:var(--surface-card,#fff); cursor:pointer; transition:all .2s;
    }
    .stat-pill:hover { border-color:var(--primary-300,#93c5fd); }
    .stat-pill.active { background:var(--primary-50,#eff6ff); border-color:var(--primary-500,var(--primary)); }
    .stat-pill .pi { font-size: var(--font-size-lg); color:var(--primary-500,var(--primary)); }
    .stat-num { font-size: var(--font-size-xl); font-weight:800; color:var(--text-color,#111); }
    .stat-lbl { font-size: var(--font-size-sm); color:var(--text-color-secondary,var(--text-muted)); font-weight:600; }

    .filter-chips { display:flex; gap:6px; margin-bottom:20px; flex-wrap:wrap; }
    .chip {
      display:inline-flex; align-items:center; gap:6px; padding:6px 14px;
      border-radius:var(--radius-pill); border:1.5px solid var(--surface-border,var(--border-subtle));
      background:var(--surface-card,#fff); font-size: var(--font-size-sm); font-weight:600;
      cursor:pointer; transition:all .15s; color:var(--text-color,#334155);
    }
    .chip:hover { border-color:var(--chip-color, var(--primary-300,#93c5fd)); }
    .chip.active { background:var(--chip-color, var(--primary-500,var(--primary))); color:#fff; border-color:transparent; }
    .chip .pi { font-size: var(--font-size-sm); }
    .chip-count { font-size: var(--font-size-xs); opacity:.7; }

    .report-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; margin-bottom:32px; }
    .report-card {
      background:var(--surface-card,#fff); border:1px solid var(--surface-border,var(--border-subtle));
      border-radius:var(--radius-lg); overflow:hidden; display:flex; flex-direction:column;
      transition:all .2s;
    }
    .report-card:hover { box-shadow: var(--shadow-lg); transform:translateY(-3px); }
    .card-gradient {
      padding:20px 24px; display:flex; align-items:center; justify-content:space-between;
    }
    .card-priority { font-size: var(--font-size-xs); font-weight:700; text-transform:uppercase; color:rgba(var(--color-white-rgb), .85); display:flex; align-items:center; gap:4px; }
    .priority-dot { width:8px; height:8px; border-radius:var(--radius-pill); }
    .p-critical { background:#fbbf24; }
    .p-high { background:var(--risk-high); }
    .p-medium { background:#60a5fa; }
    .p-low { background:#a3a3a3; }

    .card-body { padding:16px 20px; flex:1; }
    .card-body h3 { font-size: var(--font-size-base); font-weight:700; margin:0 0 6px; line-height:1.3; }
    .card-body p { font-size: var(--font-size-sm); color:var(--text-color-secondary,var(--text-muted)); line-height:1.6; margin:0 0 10px; }
    .card-meta { display:flex; gap:12px; margin-bottom:8px; }
    .meta-item { font-size: var(--font-size-xs); color:var(--text-color-secondary); display:flex; align-items:center; gap:4px; }
    .meta-item .pi { font-size: var(--font-size-sm); }

    .card-formats { display:flex; gap:4px; margin-bottom:6px; }
    .fmt-tag {
      font-size: var(--font-size-xs); font-weight:700; padding:2px 8px; border-radius:var(--radius-xs);
      letter-spacing:.3px;
    }
    .fmt-pdf { background:var(--status-danger-bg, #fff1f1); color:var(--error); }
    .fmt-excel { background:var(--status-success-bg, #defbe6); color:var(--success); }
    .fmt-html { background:#eff6ff; color:var(--primary); }

    .card-charts { display:flex; gap:4px; flex-wrap:wrap; }
    .chart-tag {
      font-size: var(--font-size-xs); padding:2px 6px; border-radius:var(--radius-xs);
      background:var(--surface-100,var(--surface-ice)); color:var(--text-color-secondary);
      text-transform:capitalize;
    }

    .card-actions { padding:12px 20px; border-top:1px solid var(--surface-border,var(--border-subtle)); }
    .gen-btn {
      width:100%; padding:9px 16px; border-radius:var(--radius); border:none;
      background:var(--primary-600,#2563eb); color:#fff; font-size: var(--font-size-sm); font-weight:600;
      cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;
      transition:all .15s;
    }
    .gen-btn:hover { background:var(--primary-700,#1d4ed8); }

    .empty-state { text-align:center; padding:3rem; color:var(--text-color-secondary); }

    .format-features { margin-bottom:24px; }
    .format-features h3 { font-size: var(--font-size-lg); font-weight:700; margin-bottom:16px; }
    .format-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
    .format-card { padding:24px; border-radius:var(--radius-lg); border:1px solid var(--surface-border); }
    .pdf-card { background:var(--status-danger-bg, #fff1f1); border-color:var(--status-danger-bg, #fff1f1); }
    .excel-card { background:var(--status-success-bg, #defbe6); border-color:#bbf7d0; }
    .html-card { background:#eff6ff; border-color:#bfdbfe; }
    .format-icon { font-size: var(--font-size-3xl); margin-bottom:8px; }
    .pdf-card .format-icon { color:var(--error); }
    .excel-card .format-icon { color:var(--success); }
    .html-card .format-icon { color:var(--primary); }
    .format-card h4 { font-size: var(--font-size-md); font-weight:700; margin:0 0 8px; }
    .format-card ul { list-style:none; padding:0; margin:0; }
    .format-card li { font-size: var(--font-size-sm); color:var(--text-color-secondary); padding:3px 0; display:flex; align-items:center; gap:6px; }
    .format-card li::before { content:'✓'; font-weight:700; }
    .pdf-card li::before { color:var(--error); }
    .excel-card li::before { color:var(--success); }
    .html-card li::before { color:var(--primary); }

    .gen-dialog {}
    .gen-field { margin-bottom:16px; }
    .gen-field label { font-size: var(--font-size-sm); font-weight:600; color:var(--text-color-secondary); display:block; margin-bottom:6px; }
    .w-full { width:100%; }
    .mt-3 { margin-top:12px; }

    .schedules-section { margin-bottom:24px; padding:20px; border-radius:var(--radius-lg); border:1px solid var(--surface-border,var(--border-subtle)); background:var(--surface-card,#fff); }
    .schedules-section .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
    .schedules-section h3 { font-size: var(--font-size-md); font-weight:700; display:flex; align-items:center; gap:8px; margin:0; }
    .schedule-list { display:flex; flex-direction:column; gap:8px; }
    .schedule-item { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-radius:var(--radius-md); background:var(--surface-ground,var(--surface-ice)); border:1px solid var(--surface-border,var(--border-subtle)); }
    .schedule-info { display:flex; align-items:center; gap:12px; }
    .schedule-info code { font-size: var(--font-size-sm); background:var(--border-subtle); padding:3px 8px; border-radius:var(--radius-sm); }
    .no-schedules { text-align:center; color:var(--text-color-secondary); padding:20px; font-size: var(--font-size-sm); }

    @media (max-width:768px) {
      .format-grid { grid-template-columns:1fr; }
      .report-grid { grid-template-columns:1fr; }
    }
  `],
})
export class ReportCenterComponent implements OnInit {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  catalog = inject(ReportFactoryCatalogService);
  i18n = inject(I18nService);
  private toast = inject(ToastService);

  // Backend has 10 real report generators — map catalog IDs to their template keys
  private readonly BACKEND_TEMPLATE_KEYS = [
    'risk_posture', 'audit_readiness', 'vendor_risk_summary', 'incident_trend',
    'evidence_coverage', 'maturity_assessment', 'executive_summary',
    'regulatory_change_impact', 'kpi_trend', 'remediation_progress',
  ] as const;

  private readonly catalogToTemplate: Record<string, string> = {
    // CEO
    'ceo-01': 'executive_summary', 'ceo-02': 'risk_posture', 'ceo-03': 'maturity_assessment',
    'ceo-06': 'executive_summary', 'ceo-07': 'executive_summary',
    // CISO
    'ciso-01': 'risk_posture', 'ciso-04': 'incident_trend', 'ciso-05': 'evidence_coverage',
    'ciso-07': 'vendor_risk_summary',
    // Compliance
    'comp-01': 'maturity_assessment', 'comp-02': 'evidence_coverage',
    'comp-04': 'regulatory_change_impact', 'comp-05': 'audit_readiness',
    'comp-06': 'evidence_coverage', 'comp-07': 'remediation_progress',
    'comp-10': 'kpi_trend',
    // Risk Manager
    'risk-01': 'risk_posture', 'risk-02': 'risk_posture', 'risk-03': 'risk_posture',
    'risk-07': 'vendor_risk_summary',
    // Auditor
    'aud-01': 'audit_readiness', 'aud-02': 'audit_readiness', 'aud-06': 'remediation_progress',
    // Control Owner
    'co-01': 'evidence_coverage', 'co-02': 'evidence_coverage', 'co-03': 'remediation_progress',
  };

  viewMode = signal<ViewMode>('role');
  activeRoleKey = signal<string>('');
  activeHubKey = signal<string>('');
  activeStageKey = signal<string>('');

  filteredReports = computed(() => {
    const mode = this.viewMode();
    if (mode === 'role') {
      const key = this.activeRoleKey();
      return key ? this.catalog.getReportsByRole(key) : this.catalog.getAllRoleReports();
    }
    if (mode === 'workspace') {
      const key = this.activeHubKey();
      return key ? this.catalog.getReportsByWorkspace(key) : this.catalog.getAllWorkspaceReports();
    }
    const key = this.activeStageKey();
    return key ? this.catalog.getReportsByLifecycle(key) : this.catalog.getAllLifecycleReports();
  });

  generateDialogVisible = false;
  generateDialogTitle = '';
  selectedReport: AgrcReport | null = null;
  exportLang = 'en';
  exportFormat: 'pdf' | 'excel' | 'html' = 'pdf';

  langOptions = [
    { label: 'English', value: 'en' },
    { label: 'العربية', value: 'ar' },
    { label: 'Bilingual / ثنائي', value: 'bilingual' },
  ];

  schedules: Record<string, unknown>[] = [];
  showScheduleDialog = false;
  newSchedule = { templateKey: '', cronExpression: '' };

  scheduleReportOptions: { label: string; value: string }[] = [];

  isAr(): boolean { return this.i18n.currentLang() === 'ar'; }

  formatOptions = computed(() => {
    if (!this.selectedReport) return [];
    return this.selectedReport.formats.map(f => ({ label: f.toUpperCase(), value: f }));
  });

  private readonly SCHEDULE_LABELS: Record<string, { en: string; ar: string }> = {
    risk_posture: { en: 'Risk Posture Report', ar: 'تقرير وضع المخاطر' },
    audit_readiness: { en: 'Audit Readiness Report', ar: 'تقرير جاهزية التدقيق' },
    vendor_risk_summary: { en: 'Vendor Risk Summary', ar: 'ملخص مخاطر الموردين' },
    incident_trend: { en: 'Incident Trend Report', ar: 'تقرير اتجاه الحوادث' },
    evidence_coverage: { en: 'Evidence Coverage Report', ar: 'تقرير تغطية الأدلة' },
    maturity_assessment: { en: 'Maturity Assessment', ar: 'تقييم النضج' },
    executive_summary: { en: 'Executive Summary', ar: 'الملخص التنفيذي' },
    regulatory_change_impact: { en: 'Regulatory Change Impact', ar: 'أثر التغيير التنظيمي' },
    kpi_trend: { en: 'KPI Trend Report', ar: 'تقرير اتجاه المؤشرات' },
    remediation_progress: { en: 'Remediation Progress', ar: 'تقدم المعالجة' },
  };

  ngOnInit(): void {
    // Only show the 10 backend-supported generator templates for scheduling
    this.scheduleReportOptions = this.BACKEND_TEMPLATE_KEYS.map(key => ({
      label: this.isAr()
        ? (this.SCHEDULE_LABELS[key]?.ar || key)
        : (this.SCHEDULE_LABELS[key]?.en || key),
      value: key,
    }));
    this.loadSchedules();
  }

  openGenerateDialog(report: AgrcReport): void {
    this.selectedReport = report;
    this.generateDialogTitle = this.i18n.localize(report.titleEn, report.titleAr);
    this.exportFormat = report.formats[0] ?? 'pdf';
    this.generateDialogVisible = true;
  }

  async downloadReport(): Promise<void> {
    this.generateDialogVisible = false;
    if (!this.selectedReport) return;
    const rpt = this.selectedReport;
    const fmt = this.exportFormat;
    const lang = this.exportLang;

    if (fmt === 'html') {
      const url = `/api/public/sample-reports/executive-grc`;
      this.fetchAndDownload(url, `${rpt.id}-report.html`);
      return;
    }

    // Map catalog ID → backend template key for real data generation
    const templateKey = this.catalogToTemplate[rpt.id];
    if (templateKey) {
      // Generate real report via report-center, then download via report.routes format endpoint
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
      this.operationsSvc.generateReportCenter(templateKey, { language: lang } as any).subscribe({
        next: () => {
          const url = `/api/reports/generate/${templateKey}/${fmt}?lang=${lang}`;
          this.fetchAndDownload(url, `${rpt.id}-report.${ext}`);
        },
        error: () => {
          // Fallback to direct download
          const url = `/api/reports/generate/${templateKey}/${fmt}?lang=${lang}`;
          this.fetchAndDownload(url, `${rpt.id}-report.${ext}`);
        },
      });
      return;
    }

    // Unmapped reports — try direct download
    const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
    const url = `/api/reports/generate/${rpt.id}/${fmt}?lang=${lang}`;
    this.fetchAndDownload(url, `${rpt.id}-report.${ext}`);
  }

  private fetchAndDownload(url: string, filename: string): void {
    this.apiclientSvc.getBlob(url.replace('/api', '')).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      },
      error: (err) => this.toast.error('Download failed: ' + (err.message || 'Unknown error')),
    });
  }

  loadSchedules(): void {
    this.operationsSvc.getReportCenterSchedules().subscribe({
      next: (d: Record<string, unknown>) => { this.schedules = Array.isArray(d) ? d : (d.schedules || []); },
      error: (e: unknown) => devError("[API]", e),
    });
  }

  createSchedule(): void {
    this.operationsSvc.createReportSchedule({
      templateKey: this.newSchedule.templateKey,
      cronExpression: this.newSchedule.cronExpression,
    } as any).subscribe({
      next: () => {
        this.showScheduleDialog = false;
        this.newSchedule = { templateKey: '', cronExpression: '' };
        this.loadSchedules();
      },
      error: (e: unknown) => devError("[API]", e),
    });
  }
}
