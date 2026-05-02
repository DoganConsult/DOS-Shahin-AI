import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { of, catchError } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';
import { ExportButtonComponent } from '@app/shared/components/data-ops/export-button.component';
import { FrameworkSummaryDto } from '../../../models/compliance.models';
import { DropdownModule, NotificationModule, TooltipModule } from 'carbon-components-angular';
import { MessageService } from '@app/services/toast.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'compliance-frameworks-page',
    imports: [CommonModule, FormsModule, RouterModule, ExportButtonComponent, NotificationModule, DropdownModule, TooltipModule],
    providers: [],
    template: `
    <cds-notification></cds-notification>
    <div class="fw-page" [dir]="i18n.direction()">
      <div class="page-toolbar">
        <h2>{{ i18n.translate('Compliance Frameworks') }}</h2>
        <div class="toolbar-actions">
          <!-- KSA Frameworks Quick Filter Button (Prominent) -->
          <button type="button" class="ksa-filter-btn" [class.active]="regulatorFilter === 'ksa'" (click)="toggleKsaFilter()">
            <i class=""></i>
            {{ i18n.translate('KSA Frameworks') }}
          </button>
          <select class="filter-select regulator-filter" [(ngModel)]="regulatorFilter" (ngModelChange)="onRegulatorFilterChange()">
            <option value="">{{ i18n.translate('All Frameworks') }}</option>
            <option value="ksa">{{ i18n.translate('KSA Frameworks') }}</option>
            <option value="NCA">NCA</option>
            <option value="SAMA">SAMA</option>
            <option value="SDAIA">SDAIA</option>
            <option value="PDPL">PDPL</option>
            <option value="CST">CST</option>
          </select>
          <select class="filter-select" [(ngModel)]="categoryFilter" (ngModelChange)="applyFilters()">
            <option value="">{{ i18n.translate('All Categories') }}</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
          <button type="button" class="audit-pkg-btn" [disabled]="auditPackageLoading()" (click)="downloadAuditPackage()">
            <i class="pi" [ngClass]="auditPackageLoading() ? 'pi-spin pi-spinner' : 'pi-file-export'"></i>
            {{ i18n.translate('Download audit package') }}
          </button>
          <cds-dropdown [options]="exportFormatOptions" [(ngModel)]="selectedExportFormat" (onChange)="onExportFormatChange()"
            [placeholder]="i18n.translate('Export as')" [style]="{'min-width':'140px'}" appendTo="body" styleClass="p-inputtext-sm" />
          <app-export-button module="compliance-frameworks" [label]="i18n.translate('Export')" [data]="filtered()" />
        </div>
      </div>

      <div class="health-strip">
        <div tabindex="0" role="button" (keyup.enter)="categoryFilter = ''; applyFilters()" class="hs-card" (click)="categoryFilter = ''; applyFilters()">
          <span class="hs-num">{{ allFrameworks().length }}</span>
          <span class="hs-label">{{ i18n.translate('Total') }}</span>
        </div>
        <div class="hs-card active">
          <span class="hs-num">{{ avgScore() }}%</span>
          <span class="hs-label">{{ i18n.translate('Avg Compliance') }}</span>
        </div>
        <div class="hs-card controls">
          <span class="hs-num">{{ totalControls() }}</span>
          <span class="hs-label">{{ i18n.translate('Total Controls') }}</span>
        </div>
        <div class="hs-card gaps">
          <span class="hs-num">{{ totalGaps() }}</span>
          <span class="hs-label">{{ i18n.translate('Open Gaps') }}</span>
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
        <div class="loading-state" aria-live="polite"><i class=" pi-spinner"></i> {{ i18n.translate('Loading...') }}</div>
      }

      @if (!loading() && !loadError() && filtered().length === 0) {
        <div class="empty-state"><i class=""></i><p>{{ i18n.translate('No frameworks found') }}</p></div>
      }

      @if (!loading() && !loadError() && filtered().length > 0) {
        <div class="fw-grid">
          @for (fw of filtered(); track fw.frameworkId) {
            <div tabindex="0" role="button" (keyup.enter)="openDetail(fw)" class="fw-card" 
                 [class.ksa-framework]="isKsaFramework(fw)" 
                 [class.first-class-regulator]="isFirstClassRegulator(fw)"
                 (click)="openDetail(fw)">
              <div class="fw-header">
                <div class="fw-name-row">
                  <div class="fw-name">{{ i18n.localize(fw.nameEn, fw.nameAr) }}</div>
                  @if (fw.regulatorId) {
                    <span class="fw-regulator-badge" [attr.data-regulator]="getRegulatorCode(fw.regulatorId)">
                      {{ getRegulatorDisplay(fw.regulatorId) }}
                    </span>
                  }
                </div>
                <div class="fw-header-right">
                  <span class="fw-category">{{ fw.category }}</span>
                  @if (isFirstClassRegulator(fw)) {
                    <span class="fw-first-class-badge" [cdsTooltip]="i18n.translate('First-class KSA framework')" [cdsTooltipPosition]="top">
                      <i class=""></i>
                    </span>
                  }
                </div>
              </div>
              <div class="fw-bar-row">
                <div class="fw-bar"><div class="fw-bar-fill" [style.width.%]="fw.score"></div></div>
                <span class="fw-score">{{ fw.score }}%</span>
              </div>
              <div class="fw-meta">
                <span>{{ fw.totalControls }} {{ i18n.translate('controls') }}</span>
                <span>{{ fw.implementedControls }} {{ i18n.translate('implemented') }}</span>
                <span>{{ fw.evidenceCoverage }}% {{ i18n.translate('evidence') }}</span>
                @if (fw.openGaps) {
                  <span class="fw-gap-count" [routerLink]="['/compliance/gaps']" [queryParams]="{ frameworkId: fw.frameworkId }" (click)="$event.stopPropagation()">
                    {{ fw.openGaps }} {{ i18n.translate('gaps') }}
                  </span>
                }
              </div>
              <div class="fw-links">
                <a [routerLink]="['/compliance/controls']" [queryParams]="{ frameworkId: fw.frameworkId }" (click)="$event.stopPropagation()">
                  <i class=""></i> {{ i18n.translate('Controls') }}
                </a>
                <a [routerLink]="['/compliance/obligations']" [queryParams]="{ frameworkId: fw.frameworkId }" (click)="$event.stopPropagation()">
                  <i class=""></i> {{ i18n.translate('Obligations') }}
                </a>
                <a [routerLink]="['/compliance/assessments']" [queryParams]="{ frameworkId: fw.frameworkId }" (click)="$event.stopPropagation()">
                  <i class=""></i> {{ i18n.translate('Assessments') }}
                </a>
              </div>
            </div>
          }
        </div>
      }

      @if (selectedFw()) {
        <div tabindex="0" role="button" (keyup.enter)="closeDetail()" class="drawer-overlay" (click)="closeDetail()"></div>
        <aside class="detail-drawer" [dir]="i18n.direction()">
          <div class="drawer-header">
            <h3>{{ i18n.localize(selectedFw()!.nameEn, selectedFw()!.nameAr) }}</h3>
            <button aria-label="Close" class="close-btn" (click)="closeDetail()"><i class=""></i></button>
          </div>
          <div class="drawer-body">
            <div class="detail-section">
              <label>{{ i18n.translate('Description') }}</label>
              <p>{{ i18n.localize(selectedFw()!.description ?? '', selectedFw()!.descriptionAr ?? '') }}</p>
            </div>
            <div class="detail-row">
              <div class="detail-section half">
                <label>{{ i18n.translate('Score') }}</label>
                <p class="score-big">{{ selectedFw()!.score }}%</p>
              </div>
              <div class="detail-section half">
                <label>{{ i18n.translate('Status') }}</label>
                <span class="status-badge" [attr.data-status]="selectedFw()!.status">{{ selectedFw()!.status }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-section half">
                <label>{{ i18n.translate('Controls') }}</label>
                <p>{{ selectedFw()!.implementedControls }}/{{ selectedFw()!.totalControls }}</p>
              </div>
              <div class="detail-section half">
                <label>{{ i18n.translate('Evidence Coverage') }}</label>
                <p>{{ selectedFw()!.evidenceCoverage }}%</p>
              </div>
            </div>
            <div class="drawer-actions">
              <a class="action-link" [routerLink]="['/compliance/controls']" [queryParams]="{ frameworkId: selectedFw()!.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.translate('View Controls') }}
              </a>
              <a class="action-link" [routerLink]="['/compliance/obligations']" [queryParams]="{ frameworkId: selectedFw()!.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.translate('View Obligations') }}
              </a>
              <a class="action-link" [routerLink]="['/compliance/gaps']" [queryParams]="{ frameworkId: selectedFw()!.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.translate('View Gaps') }}
              </a>
              <a class="action-link" [routerLink]="['/compliance/posture']" [queryParams]="{ frameworkId: selectedFw()!.frameworkId }" (click)="closeDetail()">
                <i class=""></i> {{ i18n.translate('Framework Posture') }}
              </a>
            </div>
            <div class="cross-links">
              <a class="cross-link-btn" [routerLink]="['/risk/register']" (click)="closeDetail()"><i class=""></i> Risk Register</a>
              <a class="cross-link-btn" [routerLink]="['/audit/overview']" (click)="closeDetail()"><i class=""></i> Audit Module</a>
              <a class="cross-link-btn" [routerLink]="['/governance/overview']" (click)="closeDetail()"><i class=""></i> Governance</a>
              <a class="cross-link-btn" [routerLink]="['/foundation/evidence']" (click)="closeDetail()"><i class=""></i> Evidence</a>
              <a class="cross-link-btn" (click)="viewAuditLog()"><i class=""></i> Audit Trail</a>
            </div>
          </div>
        </aside>
      }
    </div>
  `,
    styles: [`
    .fw-page { padding: 20px 28px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    .page-toolbar h2 { margin: 0; font-size: var(--font-size-lg); font-weight: 600; }
    .toolbar-actions { display: flex; gap: 8px; align-items: center; }
    .filter-select { padding: 6px 10px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius-sm); font-size: var(--font-size-sm); background: var(--surface-card, #fff); }
    .ksa-filter-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 2px solid var(--primary-500, #3b82f6); border-radius: var(--radius-md); background: var(--primary-50, #eff6ff); font-size: var(--font-size-sm); font-weight: 600; color: var(--primary-700, #1e40af); cursor: pointer; transition: all 0.2s; }
    .ksa-filter-btn:hover { background: var(--primary-100, #dbeafe); border-color: var(--primary-600, #2563eb); }
    .ksa-filter-btn.active { background: var(--primary-600, #2563eb); color: #fff; border-color: var(--primary-700, #1e40af); }
    .ksa-filter-btn.active i { color: #fff; }
    .audit-pkg-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 1px solid var(--surface-border); border-radius: var(--radius-sm); background: var(--surface-card); font-size: var(--font-size-sm); cursor: pointer; }
    .audit-pkg-btn:hover:not(:disabled) { background: var(--surface-hover); }
    .audit-pkg-btn:disabled { opacity: .7; cursor: not-allowed; }

    .health-strip { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .hs-card { flex: 1; min-width: 100px; padding: 12px 16px; border-radius: var(--radius); text-align: center; cursor: pointer; background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); transition: box-shadow .15s; }
    .hs-card:hover { box-shadow: var(--shadow-card); }
    .hs-card .hs-num { display: block; font-size: var(--font-size-2xl); font-weight: 700; }
    .hs-card .hs-label { font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); }
    .hs-card.active { border-inline-start: 3px solid var(--primary); }
    .hs-card.active .hs-num { color: #1d4ed8; }
    .hs-card.controls { border-inline-start: 3px solid var(--secondary, #8b5cf6); }
    .hs-card.controls .hs-num { color: #7c3aed; }
    .hs-card.gaps { border-inline-start: 3px solid var(--error); }
    .hs-card.gaps .hs-num { color: #b91c1c; }

    .loading-state, .empty-state { text-align: center; padding: 48px 20px; color: var(--text-color-secondary); }
    .empty-state i { font-size: 40px; margin-bottom: 12px; display: block; opacity: .4; }

    .fw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
    .fw-card { padding: 16px; border-radius: var(--radius-md); background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle)); cursor: pointer; transition: all .15s; }
    .fw-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .fw-card.ksa-framework { border-left: 3px solid var(--primary-500, #3b82f6); }
    .fw-card.first-class-regulator { border-left: 4px solid var(--primary-600, #2563eb); background: linear-gradient(to right, var(--primary-50, #eff6ff) 0%, var(--surface-card, #fff) 8px); }
    .fw-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
    .fw-name-row { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .fw-name { font-size: var(--font-size-base); font-weight: 600; }
    .fw-regulator-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; align-self: flex-start; }
    .fw-regulator-badge[data-regulator="NCA"] { background: #dbeafe; color: #1e40af; }
    .fw-regulator-badge[data-regulator="SAMA"] { background: #dcfce7; color: #166534; }
    .fw-regulator-badge[data-regulator="PDPL"] { background: #fef3c7; color: #92400e; }
    .fw-regulator-badge[data-regulator="SDAIA"] { background: #e0e7ff; color: #3730a3; }
    .fw-regulator-badge[data-regulator="CST"] { background: #fce7f3; color: #9f1239; }
    .fw-regulator-badge:not([data-regulator="NCA"]):not([data-regulator="SAMA"]):not([data-regulator="PDPL"]):not([data-regulator="SDAIA"]):not([data-regulator="CST"]) { background: var(--surface-200, var(--border-subtle)); color: var(--text-muted, var(--text-muted)); }
    .fw-header-right { display: flex; align-items: center; gap: 6px; }
    .fw-category { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-md); background: #dbeafe; color: #1d4ed8; font-weight: 600; text-transform: capitalize; }
    .fw-first-class-badge { display: inline-flex; align-items: center; color: var(--primary-600, #2563eb); font-size: var(--font-size-sm); }
    .fw-first-class-badge i { color: #fbbf24; }
    .fw-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .fw-bar { flex: 1; height: 8px; border-radius: var(--radius-xs); background: var(--surface-200, var(--border-subtle)); overflow: hidden; }
    .fw-bar-fill { height: 100%; border-radius: var(--radius-xs); background: linear-gradient(90deg, var(--primary), var(--success)); transition: width .3s; }
    .fw-score { font-size: var(--font-size-base); font-weight: 700; min-width: 40px; text-align: end; }
    .fw-meta { display: flex; gap: 10px; font-size: var(--font-size-xs); color: var(--text-color-secondary); flex-wrap: wrap; margin-bottom: 10px; }
    .fw-gap-count { color: #b91c1c; font-weight: 600; cursor: pointer; text-decoration: underline; }
    .fw-links { display: flex; gap: 12px; padding-top: 10px; border-top: 1px solid var(--surface-50, #f9fafb); }
    .fw-links a { display: inline-flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); color: var(--primary-500, var(--primary)); text-decoration: none; font-weight: 600; }
    .fw-links a:hover { text-decoration: underline; }

    .drawer-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), .3); z-index: var(--z-modal-backdrop); }
    .detail-drawer { position: fixed; top: 0; right: 0; width: 480px; max-width: 90vw; height: 100vh; background: var(--surface-card, #fff); z-index: var(--z-modal); box-shadow: -4px 0 20px rgba(var(--color-black-rgb), .15); overflow-y: auto; }
    [dir="rtl"] .detail-drawer { right: auto; left: 0; box-shadow: 4px 0 20px rgba(var(--color-black-rgb), .15); }
    .drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--surface-border); }
    .drawer-header h3 { margin: 0; font-size: var(--font-size-md); font-weight: 600; }
    .close-btn { background: none; border: none; cursor: pointer; font-size: var(--font-size-lg); color: var(--text-color-secondary); }
    .drawer-body { padding: 20px; }
    .detail-section { margin-bottom: 16px; }
    .detail-section.half { flex: 1; }
    .detail-row { display: flex; gap: 16px; }
    .detail-section label { display: block; font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--text-color-secondary); margin-bottom: 4px; }
    .detail-section p { margin: 0; font-size: var(--font-size-base); }
    .score-big { font-size: var(--font-size-3xl); font-weight: 800; color: var(--primary-500, var(--primary)); }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-md); font-size: var(--font-size-xs); font-weight: 600; text-transform: capitalize; }
    .status-badge[data-status="active"] { background: #dcfce7; color: #15803d; }
    .status-badge[data-status="not_started"] { background: var(--surface-200); color: var(--text-color-secondary); }
    .status-badge[data-status="in_progress"] { background: #dbeafe; color: #1d4ed8; }
    .drawer-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--surface-border); }
    .action-link { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm); color: var(--primary-500, var(--primary)); text-decoration: none; font-weight: 600; cursor: pointer; }
    .action-link:hover { text-decoration: underline; }

    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; text-decoration: none; color: inherit; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--red-50, #fef2f2); border: 1px solid var(--red-200, #fecaca); border-radius: var(--radius); margin-bottom: 16px; }
    .load-error-banner .pi { color: var(--red-600, #dc2626); }
    .load-error-banner .retry-btn { margin-left: auto; padding: 6px 14px; border-radius: var(--radius-sm); border: 1px solid var(--primary); background: var(--primary); color: white; cursor: pointer; font-size: var(--font-size-sm); }
  `]
})
export class ComplianceFrameworksPageComponent implements OnInit {
  i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private msg = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  loading = signal(true);
  allFrameworks = signal<FrameworkSummaryDto[]>([]);
  selectedFw = signal<FrameworkSummaryDto | null>(null);
  categoryFilter = '';
  /** Regulator/scope filter: '' = all, 'ksa' = KSA preset, or regulator code (NCA, SAMA, etc.) */
  regulatorFilter = '';

  categories = computed(() => {
    const cats = new Set<string>();
    this.allFrameworks().forEach(fw => { if (fw.category) cats.add(fw.category); });
    return Array.from(cats);
  });

  filtered = computed(() => {
    let list = this.allFrameworks();
    if (this.categoryFilter) list = list.filter(fw => fw.category === this.categoryFilter);
    return list;
  });

  avgScore = computed(() => {
    const fws = this.allFrameworks();
    if (!fws.length) return 0;
    return Math.round(fws.reduce((s, fw) => s + fw.score, 0) / fws.length);
  });

  totalControls = computed(() => this.allFrameworks().reduce((s, fw) => s + fw.totalControls, 0));
  totalGaps = computed(() => this.allFrameworks().reduce((s, fw) => s + (fw.openGaps || 0), 0));

  /** Set when a load fails so we show "Failed to load" + retry instead of only empty state */
  loadError = signal<string | null>(null);

  auditPackageLoading = signal(false);

  /** Export format dropdown: PDF, Excel, ZIP (JSON is the main "Download audit package" button) */
  exportFormatOptions = [
    { label: 'PDF', value: 'pdf' },
    { label: 'Excel', value: 'xlsx' },
    { label: 'ZIP', value: 'zip' },
  ];
  selectedExportFormat: { label: string; value: string } | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    const preset = this.regulatorFilter === 'ksa' ? 'ksa' : undefined;
    const regulator = this.regulatorFilter && this.regulatorFilter !== 'ksa' ? this.regulatorFilter : undefined;
    this.api.getFrameworks(regulator, preset).pipe(
      catchError(() => {
        this.loadError.set(this.i18n.translate('common.failedToLoad'));
        return of([]);
      })
    ).subscribe(data => {
      this.allFrameworks.set(Array.isArray(data) ? data : []);
      this.loading.set(false);
    });
  }

  onRegulatorFilterChange(): void {
    this.load();
  }

  toggleKsaFilter(): void {
    if (this.regulatorFilter === 'ksa') {
      this.regulatorFilter = '';
    } else {
      this.regulatorFilter = 'ksa';
    }
    this.load();
  }

  /** Check if framework belongs to a KSA regulator */
  isKsaFramework(fw: FrameworkSummaryDto): boolean {
    if (!fw.regulatorId) return false;
    const ksaRegulators = ['NCA', 'SAMA', 'SDAIA', 'PDPL', 'CST', 'MOH', 'CMA', 'NDMO', 'SFDA',
      'REG-KSA-NCA', 'REG-KSA-SAMA', 'REG-KSA-SDAIA', 'REG-KSA-CST', 'REG-KSA-MOH',
      'REG-KSA-CMA', 'REG-KSA-NDMO', 'REG-KSA-SFDA'];
    return ksaRegulators.includes(fw.regulatorId);
  }

  /** Check if framework is a first-class KSA framework (NCA ECC, SAMA CSF, PDPL) */
  isFirstClassRegulator(fw: FrameworkSummaryDto): boolean {
    if (!fw.regulatorId) return false;
    const firstClass = ['NCA', 'SAMA', 'PDPL', 'REG-KSA-NCA', 'REG-KSA-SAMA', 'REG-KSA-PDPL'];
    return firstClass.includes(fw.regulatorId);
  }

  /** Extract regulator code from regulatorId (handles both short and REG-KSA-* formats) */
  getRegulatorCode(regulatorId: string): string {
    if (regulatorId.startsWith('REG-KSA-')) {
      return regulatorId.replace('REG-KSA-', '');
    }
    return regulatorId;
  }

  /** Get display name for regulator */
  getRegulatorDisplay(regulatorId: string): string {
    const code = this.getRegulatorCode(regulatorId);
    const names: Record<string, string> = {
      'NCA': 'NCA',
      'SAMA': 'SAMA',
      'SDAIA': 'SDAIA',
      'PDPL': 'PDPL',
      'CST': 'CST',
      'MOH': 'MOH',
      'CMA': 'CMA',
      'NDMO': 'NDMO',
      'SFDA': 'SFDA',
    };
    return names[code] || code;
  }

  applyFilters(): void {}

  openDetail(fw: FrameworkSummaryDto): void {
    this.selectedFw.set(fw);
  }

  closeDetail(): void {
    this.selectedFw.set(null);
  }

  viewAuditLog(): void {
    const fw = this.selectedFw();
    if (!fw) return;
    this.router.navigate(['/foundation/audit'], { queryParams: { entityType: 'framework', entityId: fw.frameworkId } });
  }

  downloadAuditPackage(): void {
    const fw = this.selectedFw();
    const options = fw ? { frameworkId: fw.frameworkId } : undefined;
    this.auditPackageLoading.set(true);
    this.api.getAuditPackage(options).pipe(
      catchError(() => {
        this.auditPackageLoading.set(false);
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.failedToGenerateAuditPackage'), life: 5000 });
        return of(null);
      })
    ).subscribe(data => {
      this.auditPackageLoading.set(false);
      if (data) {
        this.api.downloadAuditPackageJson(data);
        this.msg.add({ severity: 'success', summary: this.i18n.translate('common.auditPackageDownloaded'), life: 3000 });
      }
    });
  }

  onExportFormatChange(): void {
    const opt = this.selectedExportFormat;
    if (!opt || !['pdf', 'xlsx', 'zip'].includes(opt.value)) return;
    const fw = this.selectedFw();
    const options = fw ? { frameworkId: fw.frameworkId } : undefined;
    this.api.downloadAuditPack(opt.value as 'pdf' | 'xlsx' | 'zip', options).pipe(
      catchError(() => {
        this.msg.add({ severity: 'error', summary: this.i18n.translate('common.exportFailed'), life: 5000 });
        return of(undefined);
      })
    ).subscribe(() => {
      this.selectedExportFormat = null;
      this.cdr.markForCheck();
      this.msg.add({ severity: 'success', summary: this.i18n.translate('common.downloadStarted'), life: 3000 });
    });
  }
}
