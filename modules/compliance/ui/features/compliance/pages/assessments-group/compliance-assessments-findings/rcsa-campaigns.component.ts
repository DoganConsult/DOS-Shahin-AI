import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { FocusTrapDirective } from '@app/shared/directives/focus-trap.directive';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { AppNumberPipe } from '@app/shared/pipes/app-number.pipe';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { ComplianceFeatureApiService } from '../../../services/compliance-api.service';

interface RCSACampaign {
  campaignId: string;
  name: string;
  type: 'individual' | 'workshop';
  status: 'draft' | 'active' | 'closed' | 'archived';
  assessorIds: string[];
  riskIds: string[];
  controlIds: string[];
  dueDate: string;
  scoringTemplate: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-rcsa-campaigns',
    imports: [FocusTrapDirective, CommonModule, AppDatePipe, AppNumberPipe, FormsModule, RouterModule],
    template: `
    <div class="rcsa-page" [dir]="i18n.direction()">
      <div class="page-toolbar">
        <h2>{{ i18n.direction() === 'rtl' ? 'حملات التقييم الذاتي للمخاطر والضوابط' : 'RCSA Campaigns' }}</h2>
        <button class="create-btn" (click)="showCreate = true">
          <i class=""></i>
          {{ i18n.direction() === 'rtl' ? 'حملة جديدة' : 'New Campaign' }}
        </button>
      </div>

      <div class="health-strip">
        <div tabindex="0" role="button" (keyup.enter)="statusFilter.set('')" class="hs-card" (click)="statusFilter.set('')">
          <span class="hs-num">{{ campaigns().length }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'الكل' : 'All' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="statusFilter.set('active')" class="hs-card active" (click)="statusFilter.set('active')">
          <span class="hs-num">{{ count('active') }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'نشط' : 'Active' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="statusFilter.set('draft')" class="hs-card draft" (click)="statusFilter.set('draft')">
          <span class="hs-num">{{ count('draft') }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'مسودة' : 'Draft' }}</span>
        </div>
        <div tabindex="0" role="button" (keyup.enter)="statusFilter.set('closed')" class="hs-card closed" (click)="statusFilter.set('closed')">
          <span class="hs-num">{{ count('closed') }}</span>
          <span class="hs-label">{{ i18n.direction() === 'rtl' ? 'مغلق' : 'Closed' }}</span>
        </div>
      </div>

      <div class="filter-bar">
        <select class="filter-select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
          <option value="">{{ i18n.direction() === 'rtl' ? 'جميع الحالات' : 'All Statuses' }}</option>
          <option value="draft">{{ i18n.direction() === 'rtl' ? 'مسودة' : 'Draft' }}</option>
          <option value="active">{{ i18n.direction() === 'rtl' ? 'نشط' : 'Active' }}</option>
          <option value="closed">{{ i18n.direction() === 'rtl' ? 'مغلق' : 'Closed' }}</option>
          <option value="archived">{{ i18n.direction() === 'rtl' ? 'مؤرشف' : 'Archived' }}</option>
        </select>
        <select class="filter-select" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
          <option value="">{{ i18n.direction() === 'rtl' ? 'جميع الأنواع' : 'All Types' }}</option>
          <option value="individual">{{ i18n.direction() === 'rtl' ? 'فردي' : 'Individual' }}</option>
          <option value="workshop">{{ i18n.direction() === 'rtl' ? 'ورشة عمل' : 'Workshop' }}</option>
        </select>
      </div>

      <div class="cross-links">
        <a class="cross-link-btn" [routerLink]="['/compliance/overview']"><i class=""></i> Compliance Overview</a>
        <a class="cross-link-btn" [routerLink]="['/compliance/controls']"><i class=""></i> Controls</a>
        <a class="cross-link-btn" [routerLink]="['/compliance/assessments']"><i class=""></i> Assessments</a>
        <a class="cross-link-btn" [routerLink]="['/risk/home']"><i class=""></i> Risk Module</a>
        <a class="cross-link-btn" [routerLink]="['/audit/overview']"><i class=""></i> Audit Module</a>
        <a class="cross-link-btn" [routerLink]="['/foundation/evidence']"><i class=""></i> Evidence</a>
      </div>

      @if (loadError()) {
        <div class="load-error-banner" role="alert">
          <i class=""></i>
          <span>{{ loadError() }}</span>
          <button type="button" class="retry-btn" (click)="loadError.set(null); load()">{{ i18n.translate('common.retry') || (i18n.direction() === 'rtl' ? 'إعادة المحاولة' : 'Retry') }}</button>
        </div>
      }
      @if (loading()) {
        <div class="loading-state" aria-live="polite" role="status" aria-busy="true">
          <i class=" pi-spinner" aria-hidden="true"></i>
          <span>{{ i18n.direction() === 'rtl' ? 'جارٍ التحميل...' : 'Loading...' }}</span>
        </div>
      } @else if (!loadError() && filtered().length === 0) {
        <div class="empty-state">
          <i class="" aria-hidden="true"></i>
          <p>{{ i18n.direction() === 'rtl' ? 'لا توجد حملات' : 'No campaigns found' }}</p>
        </div>
      } @else if (!loadError()) {
        <div class="campaigns-grid">
          @for (c of filtered(); track c.campaignId) {
            <div class="campaign-card" [class]="'card-' + c.status">
              <div class="card-header">
                <span class="campaign-name">{{ c.name }}</span>
                <span class="status-badge" [class]="'badge-' + c.status">{{ c.status }}</span>
              </div>
              <div class="card-meta">
                <span class="meta-item">
                  <i class="" aria-hidden="true"></i>
                  {{ c.type }}
                </span>
                <span class="meta-item">
                  <i class="" aria-hidden="true"></i>
                  {{ c.dueDate | appDate:'medium' }}
                </span>
                <span class="meta-item">
                  <i class="" aria-hidden="true"></i>
                  {{ c.assessorIds.length }} {{ i18n.direction() === 'rtl' ? 'مقيّم' : 'assessors' }}
                </span>
              </div>
              <div class="card-stats">
                <span class="stat">
                  <span class="stat-num">{{ c.riskIds.length }}</span>
                  <span class="stat-label">{{ i18n.direction() === 'rtl' ? 'مخاطر' : 'Risks' }}</span>
                </span>
                <span class="stat">
                  <span class="stat-num">{{ c.controlIds.length }}</span>
                  <span class="stat-label">{{ i18n.direction() === 'rtl' ? 'ضوابط' : 'Controls' }}</span>
                </span>
              </div>
              <div class="card-actions">
                @if (c.status === 'draft') {
                  <button class="action-btn primary" (click)="launch(c.campaignId)"
                    [attr.aria-label]="i18n.direction() === 'rtl' ? 'إطلاق الحملة' : 'Launch campaign'">
                    <i class="" aria-hidden="true"></i>
                    {{ i18n.direction() === 'rtl' ? 'إطلاق' : 'Launch' }}
                  </button>
                }
                @if (c.status === 'active') {
                  <button class="action-btn secondary" (click)="viewResults(c.campaignId)"
                    [attr.aria-label]="i18n.direction() === 'rtl' ? 'عرض النتائج' : 'View results'">
                    <i class="" aria-hidden="true"></i>
                    {{ i18n.direction() === 'rtl' ? 'النتائج' : 'Results' }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (showCreate) {
        <div class="modal-overlay" role="dialog" aria-modal="true" appFocusTrap
          [attr.aria-label]="i18n.direction() === 'rtl' ? 'حملة جديدة' : 'New Campaign'"
          (keydown.escape)="showCreate = false">
          <div class="modal-card">
            <div class="modal-header">
              <h3>{{ i18n.direction() === 'rtl' ? 'إنشاء حملة تقييم ذاتي' : 'Create RCSA Campaign' }}</h3>
              <button class="close-btn" (click)="showCreate = false" aria-label="Close">
                <i class="" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              <label for="campaignName">{{ i18n.direction() === 'rtl' ? 'اسم الحملة' : 'Campaign Name' }}</label>
              <input id="campaignName" class="form-input" [(ngModel)]="newCampaign.name"
                [placeholder]="i18n.direction() === 'rtl' ? 'مثال: تقييم مخاطر Q4 2025' : 'e.g. Q4 2025 Risk Assessment'" [attr.aria-label]="i18n.direction() === 'rtl' ? 'مثال: تقييم مخاطر Q4 2025' : 'e.g. Q4 2025 Risk Assessment'"
                aria-required="true" />

              <label for="campaignType">{{ i18n.direction() === 'rtl' ? 'نوع الحملة' : 'Type' }}</label>
              <select id="campaignType" class="form-select" [(ngModel)]="newCampaign.type">
                <option value="individual">{{ i18n.direction() === 'rtl' ? 'فردي' : 'Individual' }}</option>
                <option value="workshop">{{ i18n.direction() === 'rtl' ? 'ورشة عمل' : 'Workshop' }}</option>
              </select>

              <label for="dueDate">{{ i18n.direction() === 'rtl' ? 'تاريخ الاستحقاق' : 'Due Date' }}</label>
              <input id="dueDate" type="date" class="form-input" [(ngModel)]="newCampaign.dueDate" />
            </div>
            <div class="modal-footer">
              <button class="action-btn secondary" (click)="showCreate = false">
                {{ i18n.direction() === 'rtl' ? 'إلغاء' : 'Cancel' }}
              </button>
              <button class="action-btn primary" (click)="createCampaign()" [disabled]="!newCampaign.name">
                <i class="" aria-hidden="true"></i>
                {{ i18n.direction() === 'rtl' ? 'إنشاء' : 'Create' }}
              </button>
            </div>
          </div>
        </div>
      }

      @if (selectedResults) {
        <div class="modal-overlay" role="dialog" aria-modal="true" appFocusTrap (keydown.escape)="selectedResults = null">
          <div class="modal-card modal-wide">
            <div class="modal-header">
              <h3>{{ i18n.direction() === 'rtl' ? 'نتائج الحملة' : 'Campaign Results' }}</h3>
              <button class="close-btn" (click)="selectedResults = null" aria-label="Close">
                <i class="" aria-hidden="true"></i>
              </button>
            </div>
            <div class="modal-body">
              @if (selectedResults?.aggregation) {
                <div class="results-summary">
                  <div class="result-metric">
                    <span class="metric-val">{{ selectedResults.aggregation.averageRiskScore | appNumber:'decimal':'1.1-1' }}</span>
                    <span class="metric-label">{{ i18n.direction() === 'rtl' ? 'متوسط درجة المخاطر' : 'Avg Risk Score' }}</span>
                  </div>
                  <div class="result-metric">
                    <span class="metric-val">{{ selectedResults.aggregation.completionRate }}%</span>
                    <span class="metric-label">{{ i18n.direction() === 'rtl' ? 'نسبة الاكتمال' : 'Completion Rate' }}</span>
                  </div>
                  <div class="result-metric">
                    <span class="metric-val">{{ selectedResults.aggregation.totalResponses }}</span>
                    <span class="metric-label">{{ i18n.direction() === 'rtl' ? 'إجمالي الردود' : 'Total Responses' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
    styles: [`
    .rcsa-page { padding: 24px; }
    .page-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .page-toolbar h2 { margin: 0; font-size: 1.4rem; font-weight: 600; color: var(--text-color); }
    .create-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--primary-color, var(--primary)); color: #fff; border: none; border-radius: var(--radius); cursor: pointer; font-size: var(--font-size-body-sm); font-weight: 500; }
    .create-btn:hover { opacity: 0.9; }
    .health-strip { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .hs-card { background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 14px 20px; display: flex; flex-direction: column; align-items: center; min-width: 90px; cursor: pointer; border: 2px solid transparent; box-shadow: var(--shadow-sm); transition: border-color .15s; }
    .hs-card:hover { border-color: var(--primary-color, var(--primary)); }
    .hs-card.active { border-color: var(--success)44; }
    .hs-card.draft { border-color: var(--warning)44; }
    .hs-card.closed { border-color: var(--text-muted)44; }
    .hs-num { font-size: 1.6rem; font-weight: 700; color: var(--text-color); }
    .hs-label { font-size: var(--font-size-sm); color: var(--text-color-secondary); }
    .filter-bar { display: flex; gap: 12px; margin-bottom: 20px; }
    .filter-select { padding: 8px 12px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); background: var(--surface-card, #fff); color: var(--text-color); font-size: var(--font-size-base); }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; color: var(--text-color-secondary); }
    .loading-state i, .empty-state i { font-size: var(--font-size-4xl); }
    .campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .campaign-card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 18px; box-shadow: var(--shadow-sm); border-left: 4px solid transparent; }
    .campaign-card.card-active { border-left-color: var(--success); }
    .campaign-card.card-draft { border-left-color: var(--warning); }
    .campaign-card.card-closed { border-left-color: var(--text-muted); }
    .campaign-card.card-archived { border-left-color: var(--text-muted); opacity: .7; }
    .card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    .campaign-name { font-weight: 600; color: var(--text-color); font-size: var(--font-size-body-sm); }
    .status-badge { font-size: var(--font-size-xs); padding: 3px 8px; border-radius: var(--radius-xl); font-weight: 600; text-transform: uppercase; }
    .badge-active { background: #dcfce7; color: #15803d; }
    .badge-draft { background: #fef9c3; color: #854d0e; }
    .badge-closed { background: var(--surface-ice); color: #475569; }
    .badge-archived { background: var(--border-subtle); color: var(--text-muted); }
    .card-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
    .meta-item { display: flex; align-items: center; gap: 4px; font-size: var(--font-size-caption); color: var(--text-color-secondary); }
    .card-stats { display: flex; gap: 16px; padding: 12px 0; border-top: 1px solid var(--surface-border, var(--border-subtle)); border-bottom: 1px solid var(--surface-border, var(--border-subtle)); margin-bottom: 12px; }
    .stat { display: flex; flex-direction: column; align-items: center; }
    .stat-num { font-size: 1.3rem; font-weight: 700; color: var(--text-color); }
    .stat-label { font-size: 0.72rem; color: var(--text-color-secondary); }
    .card-actions { display: flex; gap: 8px; }
    .action-btn { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--radius); border: none; cursor: pointer; font-size: var(--font-size-tag); font-weight: 500; }
    .action-btn.primary { background: var(--primary-color, var(--primary)); color: #fff; }
    .action-btn.secondary { background: var(--surface-100, var(--surface-ice)); color: var(--text-color); }
    .action-btn:disabled { opacity: .5; cursor: not-allowed; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(var(--color-black-rgb), .5); display: flex; align-items: center; justify-content: center; z-index: var(--z-modal); }
    .modal-card { background: var(--surface-card, #fff); border-radius: var(--radius-lg); width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
    .modal-wide { width: 700px; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid var(--surface-border, var(--border-subtle)); }
    .modal-header h3 { margin: 0; font-size: var(--font-size-body-md); font-weight: 600; }
    .close-btn { background: none; border: none; cursor: pointer; color: var(--text-color-secondary); font-size: var(--font-size-body-lg); }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 12px; }
    .modal-body label { font-size: var(--font-size-tag); font-weight: 500; color: var(--text-color-secondary); }
    .form-input, .form-select { width: 100%; padding: 10px 12px; border: 1px solid var(--surface-border, var(--border-subtle)); border-radius: var(--radius); background: var(--surface-ground, var(--surface-ice)); color: var(--text-color); font-size: var(--font-size-body-sm); box-sizing: border-box; }
    .modal-footer { display: flex; gap: 8px; justify-content: flex-end; padding: 16px 24px; border-top: 1px solid var(--surface-border, var(--border-subtle)); }
    .results-summary { display: flex; gap: 24px; flex-wrap: wrap; }
    .result-metric { display: flex; flex-direction: column; align-items: center; min-width: 120px; }
    .metric-val { font-size: var(--font-size-4xl); font-weight: 700; color: var(--primary-color, var(--primary)); }
    .metric-label { font-size: var(--font-size-caption); color: var(--text-color-secondary); }

    .load-error-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin-bottom: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius); font-size: var(--font-size-sm); color: #b91c1c; }
    .load-error-banner i { flex-shrink: 0; }
    .retry-btn { margin-inline-start: auto; padding: 6px 12px; background: #b91c1c; color: #fff; border: none; border-radius: var(--radius-sm); font-size: var(--font-size-sm); font-weight: 600; cursor: pointer; }
    .retry-btn:hover { background: #991b1b; }
    .cross-links { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
    .cross-link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; background: transparent; border: 1px solid var(--surface-border); border-radius: var(--radius-lg, 20px); cursor: pointer; font-size: var(--font-size-sm); font-weight: 500; transition: all .15s; text-decoration: none; color: inherit; }
    .cross-link-btn:hover { background: var(--primary-50, #eff6ff); border-color: var(--primary-200, #93c5fd); color: var(--primary); }
    .cross-link-btn .pi { font-size: var(--font-size-sm); color: var(--primary); }
  `]
})
export class RcsaCampaignsComponent implements OnInit {
  protected i18n = inject(I18nService);
  private api = inject(ComplianceFeatureApiService);

  campaigns = signal<RCSACampaign[]>([]);
  loading = signal(true);
  loadError = signal<string | null>(null);
  statusFilter = signal('');
  typeFilter = signal('');
  showCreate = false;
  selectedResults: Record<string, unknown> | null = null;

  newCampaign: Partial<RCSACampaign> = {
    name: '',
    type: 'individual',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    assessorIds: [],
    riskIds: [],
    controlIds: [],
    scoringTemplate: 'standard_5x5',
  };

  filtered = computed(() => {
    let data = this.campaigns();
    if (this.statusFilter()) data = data.filter(c => c.status === this.statusFilter());
    if (this.typeFilter()) data = data.filter(c => c.type === this.typeFilter());
    return data;
  });

  count(status: string): number {
    return this.campaigns().filter(c => c.status === status).length;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loadError.set(null);
    this.loading.set(true);
    this.api.getRcsaCampaigns()
      .pipe(
        catchError(() => {
          this.loadError.set(this.i18n.translate('common.failedToLoad') || 'Failed to load');
          this.loading.set(false);
          return of({ data: [] });
        })
      )
      .subscribe((res) => {
        this.campaigns.set((res as any).data ?? []);
        this.loading.set(false);
      });
  }

  createCampaign(): void {
    if (!this.newCampaign.name) return;
    this.api.createRcsaCampaign(this.newCampaign as any)
      .pipe(catchError(() => of(null)))
      .subscribe((created) => {
        if (created) {
          this.campaigns.update(c => [created as any, ...c]);
        }
        this.showCreate = false;
        this.newCampaign = { name: '', type: 'individual', assessorIds: [], riskIds: [], controlIds: [], scoringTemplate: 'standard_5x5' };
      });
  }

  launch(campaignId: string): void {
    this.api.launchRcsaCampaign(campaignId)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.campaigns.update(c =>
          c.map(camp => camp.campaignId === campaignId ? { ...camp, status: 'active' as const } : camp)
        );
      });
  }

  viewResults(campaignId: string): void {
    this.api.getRcsaCampaignResults(campaignId)
      .pipe(catchError(() => of({})))
      .subscribe((results) => {
        this.selectedResults = results;
      });
  }
}
