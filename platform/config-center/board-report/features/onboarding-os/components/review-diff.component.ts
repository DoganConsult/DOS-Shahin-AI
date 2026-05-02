import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import type { ReviewModel, OnboardingBlocker } from '../models/onboarding.models';
import { SectorConfigService } from '../services/sector-config.service';

export interface InlineEditRequest {
  questionCode: string;
  currentValue: unknown;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-review-diff',
    imports: [CommonModule, ProgressBarModule, TagModule],
    template: `
    <div class="review-diff">
      <div *ngIf="review.blockers.length > 0" class="onb-blockers-panel onb-advisory">
        <h3><i class="pi pi-info-circle"></i> {{ isAr ? 'توصيات لتحسين الإعداد' : 'Recommendations to Improve Setup' }}</h3>
        <div tabindex="0" role="button" (keyup.enter)="navigateToBlocker.emit(b)" *ngFor="let b of review.blockers" class="onb-blocker-item onb-clickable" (click)="navigateToBlocker.emit(b)">
          <p-tag [value]="b.severity === 'info' ? (isAr ? 'مقترح' : 'suggested') : b.severity" [severity]="b.severity === 'critical' ? 'danger' : b.severity === 'info' ? 'info' : 'warning'" />
          <span>{{ isAr ? b.title_ar : b.title_en }}</span>
          <small *ngIf="b.resolution_action">→ {{ b.resolution_action }}</small>
          <i class="pi pi-arrow-right onb-nav-arrow"></i>
        </div>
      </div>

      <div class="onb-review-section">
        <h3>{{ isAr ? 'ثقة شاهين في الإعداد' : "Shahin's Setup Confidence" }}</h3>
        <div class="onb-readiness-bar">
          <p-progressBar [value]="review.readiness" [showValue]="true" [style]="{'height':'24px','border-radius':'6px'}" />
        </div>
      </div>

      <div class="onb-review-section">
        <h3>{{ isAr ? 'ما سيُعِده شاهين' : 'What Shahin Will Prepare' }}</h3>
        <div class="onb-impact-grid">
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.frameworkCount || review.impactSummary.frameworks?.length || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'أطر' : 'Frameworks' }}</div></div>
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.authorities || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'جهات رقابية' : 'Authorities' }}</div></div>
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.controlCount || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'ضوابط' : 'Controls' }}</div></div>
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.evidenceTaskCount || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'مهام أدلة' : 'Evidence' }}</div></div>
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.riskCount || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'مخاطر' : 'Risks' }}</div></div>
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.policyCount || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'سياسات' : 'Policies' }}</div></div>
          <div class="onb-impact-card"><div class="onb-impact-value">{{ review.impactSummary.moduleCount || review.impactSummary.modules?.length || 0 }}</div><div class="onb-impact-label">{{ isAr ? 'وحدات' : 'Modules' }}</div></div>
        </div>
      </div>

      <div class="onb-review-section">
        <h3>{{ isAr ? 'الجهة' : 'Organization' }}</h3>
        <div class="onb-org-cards">
          <div tabindex="0" role="button" (keyup.enter)="inlineEdit.emit({questionCode:'org.display_name', currentValue: review.profile.organization.displayName})" class="onb-org-card onb-clickable" (click)="inlineEdit.emit({questionCode:'org.display_name', currentValue: review.profile.organization.displayName})">
            <span class="onb-org-label">{{ isAr ? 'الاسم' : 'Name' }}</span>
            <span class="onb-org-value">{{ review.profile.organization.displayName }}</span>
            <i class="pi pi-pencil onb-edit-icon"></i>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="inlineEdit.emit({questionCode:'org.country', currentValue: review.profile.organization.country})" class="onb-org-card onb-clickable" (click)="inlineEdit.emit({questionCode:'org.country', currentValue: review.profile.organization.country})">
            <span class="onb-org-label">{{ isAr ? 'الدولة' : 'Country' }}</span>
            <span class="onb-org-value">{{ review.profile.organization.country === 'SA' ? (isAr ? 'المملكة العربية السعودية' : 'Saudi Arabia') : review.profile.organization.country }}</span>
            <i class="pi pi-pencil onb-edit-icon"></i>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="inlineEdit.emit({questionCode:'org.industry', currentValue: review.profile.organization.industry})" class="onb-org-card onb-org-sector onb-clickable" (click)="inlineEdit.emit({questionCode:'org.industry', currentValue: review.profile.organization.industry})">
            <span class="onb-org-label">{{ isAr ? 'القطاع' : 'Sector' }}</span>
            <span class="onb-org-value onb-sector-val">
              <span class="onb-sector-badge">{{ review.profile.organization.industry }}</span>
              {{ sectorName }}
            </span>
            <i class="pi pi-pencil onb-edit-icon"></i>
          </div>
          <div tabindex="0" role="button" (keyup.enter)="inlineEdit.emit({questionCode:'org.tenant_slug', currentValue: review.profile.organization.tenantSlug})" class="onb-org-card onb-clickable" (click)="inlineEdit.emit({questionCode:'org.tenant_slug', currentValue: review.profile.organization.tenantSlug})">
            <span class="onb-org-label">{{ isAr ? 'المعرف' : 'Identifier' }}</span>
            <span class="onb-org-value"><code class="onb-slug-code">{{ review.profile.organization.tenantSlug }}</code></span>
            <i class="pi pi-pencil onb-edit-icon"></i>
          </div>
        </div>
      </div>

      <div class="onb-review-section" *ngIf="review.regulatoryResolution">
        <h3>{{ isAr ? 'سلسلة الامتثال التنظيمي' : 'Regulatory Resolution Chain' }}</h3>
        <div class="onb-resolution-chain">
          <div class="onb-chain-step">
            <span class="onb-chain-label">{{ isAr ? 'القطاع' : 'Sector' }}</span>
            <span class="onb-chain-value" style="font-size:1rem"><span class="onb-sector-badge" style="font-size:0.75rem;min-width:22px;height:22px">{{ review.regulatoryResolution!.sectorCode }}</span></span>
            <span style="font-size:0.7rem;color:var(--text-color);margin-top:2px;display:block">{{ isAr ? (review.regulatoryResolution!.sectorNameAr || '') : (review.regulatoryResolution!.sectorNameEn || '') }}</span>
          </div>
          <i class="pi pi-arrow-right onb-chain-arrow"></i>
          <div class="onb-chain-step">
            <span class="onb-chain-label">{{ isAr ? 'جهات رقابية' : 'Authorities' }}</span>
            <span class="onb-chain-value">{{ review.regulatoryResolution!.authorities?.length || 0 }}</span>
          </div>
          <i class="pi pi-arrow-right onb-chain-arrow"></i>
          <div class="onb-chain-step">
            <span class="onb-chain-label">{{ isAr ? 'أطر' : 'Frameworks' }}</span>
            <span class="onb-chain-value">{{ review.regulatoryResolution!.frameworks?.length || 0 }}</span>
          </div>
          <i class="pi pi-arrow-right onb-chain-arrow"></i>
          <div class="onb-chain-step">
            <span class="onb-chain-label">{{ isAr ? 'ضوابط' : 'Controls' }}</span>
            <span class="onb-chain-value">{{ review.regulatoryResolution!.controlCount || 0 }}</span>
          </div>
          <i class="pi pi-arrow-right onb-chain-arrow"></i>
          <div class="onb-chain-step">
            <span class="onb-chain-label">{{ isAr ? 'أدلة' : 'Evidence' }}</span>
            <span class="onb-chain-value">{{ review.regulatoryResolution!.evidenceTaskCount || 0 }}</span>
          </div>
        </div>

        <div *ngIf="review.regulatoryResolution!.authorities?.length" class="onb-kv-grid" style="margin-top:12px">
          <div class="onb-kv"><span class="onb-kv-key">{{ isAr ? 'الجهات' : 'Authorities' }}</span>
            <span class="onb-kv-val">
              <span *ngFor="let a of review.regulatoryResolution!.authorities; let last = last">
                {{ isAr ? a.name_ar : a.name_en }}<span *ngIf="a.enforcement === 'mandatory'" style="color:var(--red-400);font-size: var(--font-size-xs)"> ({{ isAr ? 'إلزامي' : 'mandatory' }})</span>{{ last ? '' : '، ' }}
              </span>
            </span>
          </div>
        </div>
        <div *ngIf="review.regulatoryResolution!.frameworks?.length" class="onb-kv-grid" style="margin-top:8px">
          <div class="onb-kv"><span class="onb-kv-key">{{ isAr ? 'الأطر' : 'Frameworks' }}</span>
            <span class="onb-kv-val">
              <span *ngFor="let f of review.regulatoryResolution!.frameworks; let last = last">{{ f.name }} <code style="font-size: var(--font-size-xs);color:var(--text-color-secondary)">({{ f.code }})</code>{{ last ? '' : '، ' }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="onb-review-section" *ngIf="!review.regulatoryResolution">
        <h3>{{ isAr ? 'الإطار التنظيمي' : 'Regulatory Scope' }}</h3>
        <div class="onb-kv-grid">
          <div class="onb-kv"><span class="onb-kv-key">{{ isAr ? 'الأطر' : 'Frameworks' }}</span><span class="onb-kv-val">{{ review.profile.regulatory?.frameworksConfirmed?.join(', ') || '—' }}</span></div>
        </div>
      </div>

      <div class="onb-review-section" *ngIf="review.profile.maturity">
        <h3>{{ isAr ? 'مستوى النضج' : 'Maturity Class' }}</h3>
        <div class="onb-maturity-card" [attr.data-level]="review.profile.maturity.overallLevel">
          <span class="onb-maturity-level">{{ review.profile.maturity.overallLevel }}</span>
          <span class="onb-maturity-score">{{ review.profile.maturity.readinessScore }}%</span>
        </div>
      </div>

      <div class="onb-review-section" *ngIf="review.regulatoryResolution?.risks?.length">
        <h3>{{ isAr ? 'مخاطر القطاع' : 'Sector Risks' }} <span class="onb-count-badge">{{ review.regulatoryResolution!.risks.length }}</span></h3>
        <div class="onb-risk-grid">
          <div class="onb-risk-card" *ngFor="let risk of review.regulatoryResolution!.risks"
               [attr.data-impact]="risk.sector_impact">
            <div class="onb-risk-header">
              <span class="onb-risk-category">{{ risk.risk_category }}</span>
              <span class="onb-risk-impact" [attr.data-level]="risk.sector_impact">{{ risk.sector_impact }}</span>
            </div>
            <div class="onb-risk-title">{{ isAr ? risk.risk_title_ar : risk.risk_title_en }}</div>
          </div>
        </div>
      </div>

      <div class="onb-review-section" *ngIf="review.profile.technology">
        <h3>{{ isAr ? 'التقنية' : 'Technology' }}</h3>
        <div class="onb-kv-grid">
          <div class="onb-kv"><span class="onb-kv-key">SSO</span><span class="onb-kv-val">{{ review.profile.technology.hasSSO ? (isAr ? 'نعم' : 'Yes') : '—' }}</span></div>
          <div class="onb-kv"><span class="onb-kv-key">SIEM</span><span class="onb-kv-val">{{ review.profile.technology.hasSIEM ? (isAr ? 'نعم' : 'Yes') : '—' }}</span></div>
          <div class="onb-kv"><span class="onb-kv-key">IAM</span><span class="onb-kv-val">{{ review.profile.technology.hasIAM ? (isAr ? 'نعم' : 'Yes') : '—' }}</span></div>
          <div class="onb-kv" *ngIf="review.profile.technology.connectors?.length"><span class="onb-kv-key">{{ isAr ? 'الموصلات' : 'Connectors' }}</span><span class="onb-kv-val">{{ review.profile.technology.connectors.join(', ') }}</span></div>
        </div>
      </div>

      <div *ngIf="review.recommendations.length > 0" class="onb-review-section">
        <h3>{{ isAr ? 'التوصيات' : 'Recommendations' }}</h3>
        <div *ngFor="let rec of review.recommendations" class="onb-rec-item">
          <p-tag [value]="rec.recommendation_type" severity="info" />
          <span>{{ isAr ? rec.title_ar : rec.title_en }}</span>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .review-diff { display: flex; flex-direction: column; gap: 0; }
    .onb-blockers-panel { background: rgba(var(--module-accent-red-rgb), 0.06); border: 1px solid rgba(var(--module-accent-red-rgb), 0.2); border-radius: var(--radius); padding: 1rem; margin-bottom: 1.5rem; }
    .onb-blockers-panel h3 { margin: 0 0 0.5rem; font-size: var(--font-size-body-sm); color: var(--error); display: flex; align-items: center; gap: 0.4rem; }
    .onb-blockers-panel.onb-advisory { background: rgba(var(--module-accent-sky-rgb), 0.05); border-color: rgba(var(--module-accent-sky-rgb), 0.2); }
    .onb-blockers-panel.onb-advisory h3 { color: var(--blue-600); }
    .onb-blocker-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; font-size: var(--font-size-tag); }
    .onb-review-section { margin-bottom: 1.5rem; }
    .onb-review-section h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); font-weight: 700; }
    .onb-readiness-bar { max-width: 400px; overflow: hidden; }
    .onb-impact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    @media (min-width: 768px) { .onb-impact-grid { grid-template-columns: repeat(7, 1fr); } }
    .onb-impact-card { text-align: center; padding: 0.75rem; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .onb-impact-value { font-size: var(--font-size-2xl); font-weight: 700; color: var(--primary-color, var(--primary)); }
    .onb-impact-label { font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); margin-top: 2px; }
    .onb-org-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 600px) { .onb-org-cards { grid-template-columns: 1fr; } }
    .onb-org-card { position: relative; padding: 0.75rem 1rem; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); display: flex; flex-direction: column; gap: 0.25rem; }
    .onb-org-card .onb-edit-icon { position: absolute; top: 0.5rem; inset-inline-end: 0.5rem; }
    .onb-org-label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.03em; }
    .onb-org-value { font-size: var(--font-size-body-sm); font-weight: 500; color: var(--text-color, var(--text-heading)); line-height: 1.4; }
    .onb-org-sector { grid-column: 1 / -1; }
    .onb-sector-val { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .onb-sector-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 6px; font-size: var(--font-size-tag); font-weight: 700; color: #fff; background: var(--primary-color, var(--primary)); border-radius: var(--radius-sm); letter-spacing: 0.02em; }
    .onb-slug-code { font-family: monospace; font-size: var(--font-size-body-sm); padding: 0.15rem 0.4rem; background: var(--surface-card, #fff); border-radius: var(--radius-xs); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .onb-resolution-chain { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding: 0.75rem; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); }
    .onb-chain-step { text-align: center; padding: 0.5rem 0.75rem; background: var(--surface-card, #fff); border-radius: var(--radius-sm); border: 1px solid var(--surface-border, var(--border-subtle)); min-width: 70px; }
    .onb-chain-label { display: block; font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
    .onb-chain-value { display: block; font-size: var(--font-size-xl); font-weight: 700; color: var(--primary-color, var(--primary)); }
    .onb-chain-arrow { color: var(--text-color-secondary, var(--text-muted)); font-size: var(--font-size-tag); }
    .onb-kv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.5rem; }
    .onb-kv { display: flex; gap: 0.5rem; font-size: var(--font-size-tag); }
    .onb-kv-key { font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); min-width: 70px; }
    .onb-kv-val { color: var(--text-color, var(--text-heading)); }
    .onb-maturity-card { display: inline-flex; align-items: center; gap: 1rem; padding: 0.75rem 1.25rem; border-radius: var(--radius-md); background: var(--surface-ground, var(--surface-ice)); border: 1px solid var(--surface-border, var(--border-subtle)); }
    .onb-maturity-card[data-level="foundational"] { border-color: var(--orange-300, #fdba74); background: rgba(var(--module-accent-amber-rgb), 0.06); }
    .onb-maturity-card[data-level="developing"] { border-color: var(--yellow-400, #facc15); background: rgba(var(--module-accent-yellow-rgb), 0.06); }
    .onb-maturity-card[data-level="managed"] { border-color: var(--blue-300, #93c5fd); background: rgba(var(--module-accent-sky-rgb), 0.06); }
    .onb-maturity-card[data-level="optimized"] { border-color: var(--green-400, var(--success)); background: rgba(var(--module-accent-green-rgb), 0.06); }
    .onb-maturity-level { font-weight: 700; font-size: var(--font-size-md); text-transform: capitalize; }
    .onb-maturity-score { font-size: var(--font-size-tag); color: var(--text-color-secondary, var(--text-muted)); }
    .onb-count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 6px; font-size: var(--font-size-sm); font-weight: 700; color: var(--primary-color, var(--primary)); background: rgba(var(--module-accent-sky-rgb), 0.1); border-radius: var(--radius-lg); margin-inline-start: 6px; vertical-align: middle; }
    .onb-risk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.6rem; }
    @media (max-width: 600px) { .onb-risk-grid { grid-template-columns: 1fr; } }
    .onb-risk-card { padding: 0.65rem 0.85rem; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius); border-inline-start: 3px solid var(--surface-border, var(--border-subtle)); transition: box-shadow 150ms; }
    .onb-risk-card:hover { box-shadow: var(--shadow-card); }
    .onb-risk-card[data-impact="high"], .onb-risk-card[data-impact="critical"] { border-inline-start-color: var(--red-400, #f87171); }
    .onb-risk-card[data-impact="medium"] { border-inline-start-color: var(--orange-400, #fb923c); }
    .onb-risk-card[data-impact="low"] { border-inline-start-color: var(--green-400, var(--success)); }
    .onb-risk-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
    .onb-risk-category { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: 0.03em; }
    .onb-risk-impact { font-size: var(--font-size-2xs); font-weight: 600; padding: 0.1rem 0.45rem; border-radius: var(--radius-xs); text-transform: uppercase; letter-spacing: 0.04em; }
    .onb-risk-impact[data-level="high"], .onb-risk-impact[data-level="critical"] { color: var(--red-600, var(--error)); background: rgba(var(--module-accent-red-rgb), 0.1); }
    .onb-risk-impact[data-level="medium"] { color: var(--orange-600, #ea580c); background: rgba(var(--module-accent-amber-rgb), 0.1); }
    .onb-risk-impact[data-level="low"] { color: var(--green-600, var(--success)); background: rgba(var(--module-accent-green-rgb), 0.1); }
    .onb-risk-title { font-size: var(--font-size-tag); color: var(--text-color, var(--text-heading)); line-height: 1.35; }
    .onb-rec-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; font-size: var(--font-size-tag); flex-wrap: wrap; }
    .onb-rec-item span { word-break: break-word; }
    .onb-clickable { cursor: pointer; transition: background 150ms, box-shadow 150ms; border-radius: var(--radius-sm); }
    .onb-clickable:hover { background: rgba(var(--module-accent-sky-rgb), 0.06); box-shadow: var(--shadow-glow); }
    .onb-blocker-item.onb-clickable { padding: 0.5rem 0.6rem; margin: 0.15rem -0.6rem; }
    .onb-nav-arrow { margin-inline-start: auto; font-size: var(--font-size-sm); color: var(--primary-color, var(--primary)); opacity: 0; transition: opacity 150ms; }
    .onb-clickable:hover .onb-nav-arrow { opacity: 1; }
    .onb-edit-icon { font-size: var(--font-size-xs); color: var(--primary-color, var(--primary)); opacity: 0; transition: opacity 150ms; margin-inline-start: 4px; }
    .onb-clickable:hover .onb-edit-icon { opacity: 0.7; }
  `]
})
export class ReviewDiffComponent {
  @Input() review!: ReviewModel;
  @Input() isAr = false;
  @Output() navigateToBlocker = new EventEmitter<OnboardingBlocker>();
  @Output() inlineEdit = new EventEmitter<InlineEditRequest>();

  private sectorConfig = inject(SectorConfigService);

  get sectorName(): string {
    if (this.review.regulatoryResolution) {
      return this.isAr
        ? (this.review.regulatoryResolution.sectorNameAr || '')
        : (this.review.regulatoryResolution.sectorNameEn || '');
    }
    const code = this.review.profile.organization.industry;
    return this.sectorConfig.getSectorName(code, this.isAr ? 'ar' : 'en');
  }

}
