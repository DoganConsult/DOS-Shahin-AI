import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoadmapTimelineComponent } from '../components/remediation/roadmap-timeline.component';
import { ComplianceEmptyStateComponent } from '../components/analysis/compliance-empty-state.component';
import { ComplianceRoadmapDto, AuditReadinessDto } from '../models/compliance.models';
import { ComplianceLabels } from '../config/compliance.labels.en';
import { ButtonModule, ProgressIndicatorModule, TagModule, TilesModule } from 'carbon-components-angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-roadmap-tab',
  standalone: true,
  imports: [
    CommonModule, ButtonModule, TilesModule, TagModule, ProgressIndicatorModule,
    RoadmapTimelineComponent, ComplianceEmptyStateComponent,
  ],
  template: `
    <!-- Summary cards -->
    <div class="rm-summary" *ngIf="roadmap">
      <div class="rm-card">
        <span class="rm-val">{{ roadmap.completionPercent }}%</span>
        <span class="rm-lbl">{{ L.completion }}</span>
        <cds-progress-bar [value]="roadmap.completionPercent" [showValue]="false" styleClass="rm-bar" />
      </div>
      <div class="rm-card">
        <span class="rm-val">{{ roadmap.completedTasks }}/{{ roadmap.totalTasks }}</span>
        <span class="rm-lbl">{{ L.tasks }}</span>
      </div>
      <div class="rm-card" *ngIf="roadmap.currentWave">
        <span class="rm-val cur">{{ roadmap.currentWave }}</span>
        <span class="rm-lbl">{{ L.currentWave }}</span>
      </div>
      <div class="rm-card" *ngIf="roadmap.nextMilestone">
        <span class="rm-val next">{{ roadmap.nextMilestone }}</span>
        <span class="rm-lbl">{{ L.nextMilestone }}</span>
      </div>
    </div>

    <!-- Timeline -->
    <compliance-roadmap-timeline [roadmap]="roadmap" [L]="L" />

    <!-- Audit Readiness section -->
    <div class="ar-section" *ngIf="auditReadiness">
      <h4 class="sec-title">{{ L.auditReadiness }}</h4>
      <div class="ar-grid">
        <div class="ar-item">
          <span class="ar-val">{{ auditReadiness.readinessScore }}%</span>
          <span class="ar-lbl">{{ L.readinessScore }}</span>
        </div>
        <div class="ar-item">
          <span class="ar-val">{{ auditReadiness.implementedPct }}%</span>
          <span class="ar-lbl">{{ L.implemented }}</span>
        </div>
        <div class="ar-item">
          <span class="ar-val">{{ auditReadiness.testedPct }}%</span>
          <span class="ar-lbl">{{ L.tested }}</span>
        </div>
        <div class="ar-item">
          <span class="ar-val">{{ auditReadiness.evidencePct }}%</span>
          <span class="ar-lbl">{{ L.withEvidence }}</span>
        </div>
        <div class="ar-item">
          <span class="ar-val good">{{ auditReadiness.fullyReady }}/{{ auditReadiness.totalControls }}</span>
          <span class="ar-lbl">{{ L.fullyReady }}</span>
        </div>
        <div class="ar-item" *ngIf="auditReadiness.evidenceCoverageByTier as byTier">
          <span class="ar-val">{{ tierAPct(byTier) }}%</span>
          <span class="ar-lbl">{{ L.evidenceQualityTierA }}</span>
        </div>
        <div class="ar-item" *ngIf="auditReadiness.evidenceFreshnessScore != null">
          <span class="ar-val">{{ auditReadiness.evidenceFreshnessScore }}%</span>
          <span class="ar-lbl">{{ L.evidenceFreshness }}</span>
        </div>
      </div>
    </div>

    <!-- Forecast -->
    <div class="forecast-section" *ngIf="roadmap">
      <h4 class="sec-title">{{ L.forecast }}</h4>
      <div class="fc-grid">
        <div class="fc-item">
          <i class=" fc-icon"></i>
          <div>
            <span class="fc-lbl">{{ L.expectedScore }}</span>
            <span class="fc-val">{{ forecastScore }}%</span>
          </div>
        </div>
        <div class="fc-item">
          <i class=" fc-icon"></i>
          <div>
            <span class="fc-lbl">{{ L.expectedReadiness }}</span>
            <span class="fc-val">{{ forecastReadiness }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="rm-actions" *ngIf="roadmap">
      <button cdsButton [label]="L.generateRoadmap" icon="" styleClass=" "
        (onClick)="generateRoadmap.emit()" />
    </div>

    <compliance-empty-state *ngIf="!roadmap && !loading"
      variant="roadmap" [title]="L.emptyRoadmap" [ctaLabel]="L.emptyRoadmapCta"
      (ctaClick)="generateRoadmap.emit()" />
  `,
  styles: [`
    .rm-summary { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .rm-card {
      padding: 16px; border-radius: var(--radius-md); text-align: center;
      border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff);
    }
    .rm-val { display: block; font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-color, #111); }
    .rm-val.cur { font-size: var(--font-size-md); color: var(--primary, var(--primary)); }
    .rm-val.next { font-size: var(--font-size-base); color: var(--success); }
    .rm-lbl { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; margin-top: 4px; }

    .sec-title { font-size: var(--font-size-base); font-weight: 700; color: var(--text-color, #111); margin: 20px 0 12px; }

    .ar-section { margin-top: 20px; }
    .ar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
    .ar-item {
      padding: 14px; border-radius: var(--radius); text-align: center;
      border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff);
    }
    .ar-val { display: block; font-size: var(--font-size-2xl); font-weight: 800; color: var(--text-color, #111); }
    .ar-val.good { color: var(--success); }
    .ar-lbl { display: block; font-size: var(--font-size-xs); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; margin-top: 2px; }

    .forecast-section { margin-top: 20px; }
    .fc-grid { display: flex; gap: 16px; flex-wrap: wrap; }
    .fc-item {
      display: flex; align-items: center; gap: 12px; padding: 14px 20px;
      border-radius: var(--radius-md); border: 1px solid var(--surface-border, var(--border-subtle)); background: var(--surface-card, #fff);
    }
    .fc-icon { font-size: var(--font-size-2xl); color: var(--primary, var(--primary)); }
    .fc-lbl { display: block; font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); }
    .fc-val { display: block; font-size: var(--font-size-xl); font-weight: 800; color: var(--text-color, #111); }

    .rm-actions { margin-top: 16px; }
  `]
})
export class RoadmapTabComponent {
  @Input() roadmap: ComplianceRoadmapDto | null = null;
  @Input() auditReadiness: AuditReadinessDto | null = null;
  @Input() loading = false;
  @Input() L!: ComplianceLabels;
  @Output() generateRoadmap = new EventEmitter<void>();

  get forecastScore(): number {
    if (!this.roadmap) return 0;
    return Math.min(100, Math.round(this.roadmap.completionPercent * 1.1));
  }

  get forecastReadiness(): number {
    if (!this.auditReadiness) return 0;
    return Math.min(100, this.auditReadiness.readinessScore + 10);
  }

  tierAPct(byTier: { tierA: number; total: number }): number {
    return byTier.total > 0 ? Math.round((byTier.tierA / byTier.total) * 100) : 0;
  }
}
