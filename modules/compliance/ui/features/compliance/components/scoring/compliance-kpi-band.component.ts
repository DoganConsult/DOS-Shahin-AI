import { Component, Input, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '@app/shared/components/status-indicators/stat-card.component';
import { ComplianceSummary } from '../../models/compliance.models';
import { ComplianceLabels } from '../../config/compliance.labels.en';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'compliance-kpi-band',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div class="kpi-band" *ngIf="summary">
      <app-stat-card icon="shield" [value]="summary.overallScore + '%'"
        [label]="L.overallScore"
        [accentColor]="scoreColor(summary.overallScore)" />
      <app-stat-card icon="th-large" [value]="summary.activeFrameworks"
        [label]="L.activeFrameworks" accentColor="var(--primary, #3b82f6)" />
      <app-stat-card icon="exclamation-triangle" [value]="summary.openGaps"
        [label]="L.openGaps" accentColor="var(--warning, #f59e0b)" />
      <app-stat-card icon="times-circle" [value]="summary.criticalGaps"
        [label]="L.criticalGaps" accentColor="var(--error)" />
      <app-stat-card icon="check-circle" [value]="summary.obligationsCovered"
        [label]="L.obligationsCovered" accentColor="#16a34a" />
      <app-stat-card icon="cog" [value]="summary.controlsMapped"
        [label]="L.controlsMapped" accentColor="var(--info, #0ea5e9)" />
      <app-stat-card icon="folder-open" [value]="summary.evidenceCoverage + '%'"
        [label]="L.evidenceCoverage" accentColor="#8b5cf6" />
      <app-stat-card *ngIf="summary.evidenceCoverageByTier as byTier" icon="star"
        [value]="tierAPct(byTier) + '%'" [label]="L.evidenceQualityTierA" accentColor="#059669" />
      <app-stat-card *ngIf="summary.evidenceFreshnessScore != null" icon="clock"
        [value]="summary.evidenceFreshnessScore + '%'" [label]="L.evidenceFreshness" accentColor="#0ea5e9" />
      <app-stat-card icon="verified" [value]="summary.auditReadiness + '%'"
        [label]="L.auditReadiness" accentColor="#059669" />
    </div>
  `,
  styles: [`
    .kpi-band {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    @media (max-width: 1200px) { .kpi-band { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 900px) { .kpi-band { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 500px) { .kpi-band { grid-template-columns: 1fr; } }
  `]
})
export class ComplianceKpiBandComponent {
  @Input() summary!: ComplianceSummary | null;
  @Input() L!: ComplianceLabels;

  scoreColor(score: number): string {
    return score >= 70 ? '#16a34a' : score >= 40 ? '#ca8a04' : 'var(--error)';
  }

  tierAPct(byTier: { tierA: number; total: number }): number {
    return byTier.total > 0 ? Math.round((byTier.tierA / byTier.total) * 100) : 0;
  }
}
