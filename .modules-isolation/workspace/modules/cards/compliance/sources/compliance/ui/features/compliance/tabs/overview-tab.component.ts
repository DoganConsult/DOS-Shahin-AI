import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { ComplianceKpiBandComponent } from '../components/scoring/compliance-kpi-band.component';
import { ScoreRingComponent } from '../components/scoring/score-ring.component';
import { FrameworkStatusCardComponent } from '../components/scoring/framework-status-card.component';
import { DomainScoreCardComponent } from '../components/scoring/domain-score-card.component';
import { PriorityIssuesPanelComponent } from '../components/remediation/priority-issues-panel.component';
import { ComplianceEmptyStateComponent } from '../components/analysis/compliance-empty-state.component';
import {  ProgressIndicatorModule, TagModule, TilesModule  } from 'carbon-components-angular';
import {
  ComplianceOverviewDto, ComplianceSummary, FrameworkSummaryDto,
  DomainSummaryDto, ComplianceIssueDto, ComplianceTrendDto, AssessmentRunDto,
} from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-overview-tab',
  standalone: true,
  imports: [
    CommonModule, ProgressIndicatorModule, TilesModule, TagModule,
    ComplianceKpiBandComponent, ScoreRingComponent,
    FrameworkStatusCardComponent, DomainScoreCardComponent,
    PriorityIssuesPanelComponent, ComplianceEmptyStateComponent,
  ],
  template: `
    <!-- KPI Band -->
    <compliance-kpi-band [summary]="overview?.summary || null" [L]="L" />

    <div class="ov-grid" *ngIf="overview">
      <!-- Left: Score + Trend -->
      <div class="ov-left">
        <div class="ov-card">
          <compliance-score-ring [score]="overview.summary.overallScore" [label]="L.overallScore" />
          <div class="trend-section" *ngIf="overview.trends?.length">
            <h4 class="sec-title">{{ L.complianceTrend }}</h4>
            <div class="trend-bars">
              <div class="trend-item" *ngFor="let t of overview.trends.slice(0, 6)">
                <div class="trend-bar-wrap">
                  <div class="trend-bar" [style.height.%]="t.score" [style.background]="trendColor(t.score)"></div>
                </div>
                <span class="trend-label">{{ t.score }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Priority Issues -->
      <div class="ov-right">
        <compliance-priority-issues [issues]="overview.priorityIssues || []" [L]="L" />
      </div>
    </div>

    <!-- Framework Posture -->
    <div class="ov-section" *ngIf="overview?.frameworks?.length">
      <h4 class="sec-title">{{ L.frameworkPosture }}</h4>
      <div class="fw-cards-grid">
        <compliance-framework-card *ngFor="let fw of overview!.frameworks"
          [fw]="fw" (open)="openFramework.emit($event)" />
      </div>
    </div>

    <!-- Domain Health -->
    <div class="ov-section" *ngIf="overview?.domains?.length">
      <h4 class="sec-title">{{ L.domainHealth }}</h4>
      <div class="dom-cards-grid">
        <compliance-domain-card *ngFor="let d of overview!.domains.slice(0, 8)"
          [domain]="d" [isAr]="isAr" (open)="openDomain.emit($event)" />
      </div>
    </div>

    <!-- Recent Assessments -->
    <div class="ov-section" *ngIf="overview?.recentAssessments?.length">
      <h4 class="sec-title">{{ L.recentAssessments }}</h4>
      <div class="assess-list">
        <div class="assess-item" *ngFor="let a of overview!.recentAssessments.slice(0, 5)">
          <i class=" assess-icon"></i>
          <div class="assess-body">
            <span class="assess-title">{{ a.title || 'Assessment' }}</span>
            <span class="assess-date">{{ (a.createdAt ?? a.created_at) | appDate:'medium' }}</span>
          </div>
          <cds-tag [value]="a.status" [severity]="a.status === 'completed' ? 'success' : 'info'" />
          <span class="assess-score" *ngIf="a.score">{{ a.score }}%</span>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <compliance-empty-state *ngIf="!overview && !loading"
      variant="frameworks" [title]="L.emptyFrameworks" [ctaLabel]="L.emptyFrameworksCta"
      (ctaClick)="navigateOnboarding.emit()" />
  `,
  styles: [`
    .ov-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    @media (max-width: 900px) { .ov-grid { grid-template-columns: 1fr; } }
    .ov-left, .ov-right { min-width: 0; }
    .ov-card {
      padding: 20px; border-radius: var(--radius-lg); display: flex; flex-direction: column; align-items: center; gap: 20px;
      border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff);
    }
    .sec-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-color, #111); margin: 0 0 12px; }
    .ov-section { margin-bottom: 20px; }

    .trend-section { width: 100%; }
    .trend-bars { display: flex; gap: 8px; height: 80px; align-items: flex-end; }
    .trend-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .trend-bar-wrap { width: 100%; height: 60px; display: flex; align-items: flex-end; }
    .trend-bar { width: 100%; border-radius: var(--radius-xs) 4px 0 0; min-height: 4px; transition: height .3s; }
    .trend-label { font-size: var(--font-size-xs); font-weight: 700; color: var(--text-color-secondary, var(--text-muted)); }

    .fw-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .dom-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }

    .assess-list { display: flex; flex-direction: column; gap: 6px; }
    .assess-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-radius: var(--radius); border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff);
    }
    .assess-icon { font-size: var(--font-size-lg); color: var(--primary, var(--primary)); }
    .assess-body { flex: 1; min-width: 0; }
    .assess-title { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color, #111); }
    .assess-date { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
    .assess-score { font-size: var(--font-size-base); font-weight: 800; color: var(--primary, var(--primary)); }
  `]
})
export class OverviewTabComponent {
  @Input() overview: ComplianceOverviewDto | null = null;
  @Input() loading = false;
  @Input() isAr = false;
  @Input() L!: ComplianceLabels;
  @Output() openFramework = new EventEmitter<string>();
  @Output() openDomain = new EventEmitter<string>();
  @Output() navigateOnboarding = new EventEmitter<void>();

  trendColor(score: number): string {
    return score >= 70 ? '#4ade80' : score >= 40 ? '#facc15' : '#f87171';
  }

}
