/**
 * SamaAssessmentScoringComponent — Dumb presentational component
 * Renders the SAMA CSF assessment results dashboard: KPI row,
 * domain score bars, priority gaps table, cross-navigation, and export bar.
 * Parent: SAMAAssessmentComponent
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcRecord } from '@app/core/models/shared.types';
import { ButtonModule, TableModule } from 'carbon-components-angular';

@Component({
  selector: 'app-sama-assessment-scoring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, StatCardComponent, StatusBadgeComponent, TableModule, ButtonModule],
  template: `
    <div class="results-step" *ngIf="assessment">
      <!-- KPI Row -->
      <div class="results-kpi-row">
        <app-stat-card icon="percentage" [value]="assessment.overallScore + '%'"
                      [label]="i18n.translate('samaAssessment.complianceScore') !== 'samaAssessment.complianceScore' ? i18n.translate('samaAssessment.complianceScore') : i18n.translate('ncaAssessment.complianceScore')"
                      [accentColor]="assessment.overallScore >= 70 ? '#16a34a' : assessment.overallScore >= 40 ? 'var(--warning)' : 'var(--error)'" />
        <app-stat-card icon="exclamation-triangle" [value]="assessment.riskExposure + '%'"
                      [label]="i18n.translate('samaAssessment.riskExposure') !== 'samaAssessment.riskExposure' ? i18n.translate('samaAssessment.riskExposure') : i18n.translate('ncaAssessment.riskExposure')"
                      accentColor="var(--error)" />
        <app-stat-card icon="check-circle" [value]="assessment.summary.implemented + '/' + assessment.summary.total"
                      [label]="i18n.translate('samaAssessment.implemented') !== 'samaAssessment.implemented' ? i18n.translate('samaAssessment.implemented') : i18n.translate('ncaAssessment.implemented')"
                      accentColor="#16a34a" />
        <app-stat-card icon="times-circle" [value]="assessment.summary.criticalGaps"
                      [label]="i18n.translate('samaAssessment.criticalGaps') !== 'samaAssessment.criticalGaps' ? i18n.translate('samaAssessment.criticalGaps') : i18n.translate('ncaAssessment.criticalGaps')"
                      accentColor="var(--error)" />
      </div>

      <!-- Chart canvases are projected from parent via ng-content -->
      <ng-content select="[charts]"></ng-content>

      <!-- Domain Score Bars -->
      <div class="domain-scores-section">
        <h3>{{ i18n.translate('samaAssessment.domainScores') !== 'samaAssessment.domainScores' ? i18n.translate('samaAssessment.domainScores') : i18n.translate('ncaAssessment.domainScores') }}</h3>
        <div *ngFor="let ds of assessment.domainScores" class="score-bar-row">
          <div class="score-bar-label">{{ i18n.localize(ds.nameEn, ds.nameAr) }}</div>
          <div class="score-bar-track">
            <div class="score-bar-fill" [style.width.%]="ds.score"
                 [style.background]="ds.score >= 70 ? '#16a34a' : ds.score >= 40 ? 'var(--warning)' : 'var(--error)'">
              {{ ds.score }}%
            </div>
          </div>
          <div class="score-bar-detail">{{ ds.implemented }}/{{ ds.total - ds.notApplicable }}</div>
        </div>
      </div>

      <!-- Priority Gaps Table -->
      <h3 class="section-heading">{{ i18n.translate('samaAssessment.priorityGaps') !== 'samaAssessment.priorityGaps' ? i18n.translate('samaAssessment.priorityGaps') : i18n.translate('ncaAssessment.priorityGaps') }}</h3>
      <table cdsTable aria-label="Data table" [value]="gapItems" [paginator]="true" [rows]="15" [rowsPerPageOptions]="[10,15,25,50]"
               styleClass="p-datatable-striped p-datatable-sm" [globalFilterFields]="['code','titleEn','titleAr']">
        <ng-template pTemplate="header">
          <tr>
            <th >{{ i18n.translate('samaAssessment.code') !== 'samaAssessment.code' ? i18n.translate('samaAssessment.code') : i18n.translate('ncaAssessment.code') }}</th>
            <th>{{ i18n.translate('samaAssessment.control') !== 'samaAssessment.control' ? i18n.translate('samaAssessment.control') : i18n.translate('ncaAssessment.control') }}</th>
            <th >{{ i18n.translate('samaAssessment.priority') !== 'samaAssessment.priority' ? i18n.translate('samaAssessment.priority') : i18n.translate('ncaAssessment.priority') }}</th>
            <th>{{ i18n.translate('samaAssessment.status') !== 'samaAssessment.status' ? i18n.translate('samaAssessment.status') : i18n.translate('ncaAssessment.status') }}</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-item>
          <tr>
            <td><strong>{{ item.code }}</strong></td>
            <td>{{ i18n.localize(item.titleEn, item.titleAr) }}</td>
            <td><span class="priority-badge" [class]="'priority-' + item.priority">{{ item.priority }}</span></td>
            <td><app-status-badge [status]="item.status" /></td>
          </tr>
        </ng-template>
      </table>

      <!-- Cross-Navigation -->
      <div class="cross-nav-section">
        <h3>{{ i18n.translate('samaAssessment.exploreFurther') !== 'samaAssessment.exploreFurther' ? i18n.translate('samaAssessment.exploreFurther') : i18n.translate('ncaAssessment.exploreFurther') }}</h3>
        <div class="cross-nav-cards">
          <a *ngFor="let nav of crossNavItems" [routerLink]="nav.route" class="cross-nav-card" [style.--cn-color]="nav.color">
            <i class="pi" [ngClass]="nav.icon" [style.color]="nav.color" style="font-size: var(--font-size-2xl);"></i>
            <div class="cn-text">
              <div class="cn-title">{{ nav.title }}</div>
              <div class="cn-desc">{{ nav.desc }}</div>
            </div>
            <i class=""></i>
          </a>
        </div>
      </div>

      <!-- Export Bar -->
      <div class="export-bar">
        <h3>{{ i18n.translate('samaAssessment.exportReport') !== 'samaAssessment.exportReport' ? i18n.translate('samaAssessment.exportReport') : i18n.translate('ncaAssessment.exportReport') }}</h3>
        <div class="export-buttons">
          <button class="export-btn pdf" (click)="exportRequested.emit({ format: 'pdf', lang: 'en' })">
            <i class=""></i> PDF (English)
          </button>
          <button class="export-btn pdf" (click)="exportRequested.emit({ format: 'pdf', lang: 'ar' })">
            <i class=""></i> PDF (عربي)
          </button>
          <button class="export-btn excel" (click)="exportRequested.emit({ format: 'excel' })">
            <i class=""></i> Excel
          </button>
          <button class="export-btn html" (click)="exportRequested.emit({ format: 'html' })">
            <i class=""></i> Interactive HTML
          </button>
        </div>
      </div>

      <!-- Bottom actions -->
      <div class="step-actions">
        <button cdsButton [label]="i18n.translate('samaAssessment.editAssessment') !== 'samaAssessment.editAssessment' ? i18n.translate('samaAssessment.editAssessment') : i18n.translate('ncaAssessment.editAssessment')"
                  icon="" (onClick)="editRequested.emit()" styleClass="" />
        <button cdsButton [label]="i18n.translate('samaAssessment.backToList') !== 'samaAssessment.backToList' ? i18n.translate('samaAssessment.backToList') : i18n.translate('ncaAssessment.backToList')"
                  icon="" (onClick)="backToListRequested.emit()" styleClass="" />
      </div>
    </div>
  `,
  styles: [`
    .results-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .domain-scores-section { margin-bottom: 24px; }
    .domain-scores-section h3, .section-heading { font-size: var(--font-size-md); font-weight: 700; margin: 0 0 12px; }
    .score-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .score-bar-label { width: 260px; font-size: var(--font-size-sm); font-weight: 600; }
    .score-bar-track { flex: 1; height: 24px; background: var(--surface-ice); border-radius: var(--radius-lg); overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: flex-end; padding-inline-end: 8px; font-size: var(--font-size-xs); font-weight: 700; color: #fff; transition: width 600ms ease; }
    .score-bar-detail { font-size: var(--font-size-sm); color: var(--text-muted); min-width: 50px; text-align: end; }
    .priority-badge { font-size: var(--font-size-xs); font-weight: 700; text-transform: uppercase; padding: 2px 10px; border-radius: var(--radius-pill); }
    .priority-critical { background: var(--status-danger-bg, #fff1f1); color: #991b1b; }
    .priority-high { background: #fed7aa; color: #9a3412; }
    .priority-medium { background: var(--status-warning-bg, #fcf4d6); color: #92400e; }
    .priority-low { background: #d1fae5; color: #065f46; }

    .cross-nav-section { margin: 24px 0; }
    .cross-nav-section h3 { font-size: var(--font-size-md); font-weight: 700; margin-bottom: 12px; }
    .cross-nav-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .cross-nav-card {
      display: flex; align-items: center; gap: 14px; padding: 16px; background: #fff;
      border: 1.5px solid var(--border, var(--border-subtle)); border-radius: var(--radius-lg); text-decoration: none; color: inherit;
      transition: all 200ms; cursor: pointer;
    }
    .cross-nav-card:hover { border-color: var(--cn-color, var(--primary)); box-shadow: var(--shadow-md); transform: translateY(-2px); }
    .cn-text { flex: 1; }
    .cn-title { font-size: var(--font-size-base); font-weight: 700; margin-bottom: 2px; }
    .cn-desc { font-size: var(--font-size-sm); color: var(--text-muted, var(--text-muted)); }
    .cross-nav-card .pi-arrow-right { color: var(--text-muted); font-size: var(--font-size-base); }

    .export-bar { background: linear-gradient(135deg, var(--status-info-bg, #edf5ff), #e0f2fe); border-radius: var(--radius-lg); padding: 20px; margin: 24px 0; }
    .export-bar h3 { margin: 0 0 12px; font-size: var(--font-size-md); }
    .export-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .export-btn {
      padding: 10px 20px; border-radius: var(--radius-md); border: 1.5px solid; font-size: var(--font-size-sm);
      font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 200ms;
    }
    .export-btn.pdf { background: var(--status-danger-bg, #fff1f1); border-color: var(--error); color: var(--error); }
    .export-btn.pdf:hover { background: var(--error); color: #fff; }
    .export-btn.excel { background: var(--status-success-bg, #defbe6); border-color: var(--success); color: var(--success); }
    .export-btn.excel:hover { background: var(--success); color: #fff; }
    .export-btn.html { background: #eff6ff; border-color: var(--primary); color: var(--primary); }
    .export-btn.html:hover { background: var(--primary); color: #fff; }

    .step-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border, var(--border-subtle)); }

    @media (max-width: 768px) {
      .results-kpi-row { grid-template-columns: repeat(2, 1fr); }
      .score-bar-label { width: 120px; }
    }
  `],
})
export class SamaAssessmentScoringComponent {
  i18n = inject(I18nService);

  /** The active assessment data containing scores, summary, domainScores, items */
  @Input() assessment!: GrcRecord;

  /** Pre-computed gap items (filtered and sorted) */
  @Input() gapItems: GrcRecord[] = [];

  /** Cross-navigation link definitions */
  @Input() crossNavItems: { route: string; icon: string; color: string; title: string; desc: string }[] = [];

  /** Emitted when user requests an export */
  @Output() exportRequested = new EventEmitter<{ format: 'pdf' | 'excel' | 'html'; lang?: string }>();

  /** Emitted when user wants to edit the assessment */
  @Output() editRequested = new EventEmitter<void>();

  /** Emitted when user wants to go back to the list */
  @Output() backToListRequested = new EventEmitter<void>();
}
