import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import {
  InferredFact,
  ConfidenceDimension,
  OnboardingScore,
  OnboardingRecommendation,
  GrcRecord,
} from '../../models/onboarding.models';
import { CountUpDirective } from '../shared/count-up.directive';

/**
 * Live Intelligence Panel — replaces the legacy live-inference-panel.
 * Displays Shahin's real-time regulatory analysis, workspace forecast,
 * and system readiness during onboarding. Fully bilingual (en/ar).
 */
@Component({
    selector: 'app-live-intelligence-panel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, ProgressBarModule, TagModule, CountUpDirective],
    templateUrl: './live-intelligence-panel.component.html',
    styleUrls: ['./live-intelligence-panel.component.scss']
})
export class LiveIntelligencePanelComponent {
  /** The live inference result with regulators, frameworks, impactPreview, automationScore, enabledModules, complexity */
  @Input() liveInference: GrcRecord;

  /** Array of inferred facts from the onboarding engine */
  @Input() inferredFacts: InferredFact[] = [];

  /** Confidence scores per dimension */
  @Input() confidenceScores: ConfidenceDimension[] = [];

  /** Onboarding scores (readiness, maturity, etc.) */
  @Input() scores: OnboardingScore[] = [];

  /** Recommendations from the onboarding engine */
  @Input() recommendations: OnboardingRecommendation[] = [];

  /** Sector resolution data with frameworks, authorities, controlCount, evidenceTaskCount, risks */
  @Input() sectorResolution: GrcRecord;

  /** Number of questions answered so far */
  @Input() answeredCount = 0;

  /** Total number of onboarding questions */
  @Input() totalQuestions = 0;

  /** Whether the intelligence engine is currently computing */
  @Input() computing = false;

  /** Active language for bilingual display */
  @Input() lang: 'en' | 'ar' = 'en';

  /** Collapsible section state */
  section1Open = signal(true);
  section2Open = signal(true);
  section3Open = signal(true);

  /** Toggle a collapsible section by number (1, 2, or 3). */
  toggleSection(n: number): void {
    if (n === 1) this.section1Open.set(!this.section1Open());
    else if (n === 2) this.section2Open.set(!this.section2Open());
    else if (n === 3) this.section3Open.set(!this.section3Open());
  }

  /**
   * Returns the CSS class for a confidence value.
   * >= 0.9 = confirmed (green), >= 0.7 = likely (blue), < 0.7 = review (amber)
   */
  getConfidenceClass(confidence: number | undefined): string {
    if (confidence == null) return 'confidence-likely';
    if (confidence >= 0.9) return 'confidence-confirmed';
    if (confidence >= 0.7) return 'confidence-likely';
    return 'confidence-review';
  }

  /**
   * Returns a human-readable label for a confidence value.
   */
  getConfidenceLabel(confidence: number | undefined): string {
    const ar = this.lang === 'ar';
    if (confidence == null) return ar ? 'محتمل' : 'Likely';
    if (confidence >= 0.9) return ar ? 'مؤكد' : 'Confirmed';
    if (confidence >= 0.7) return ar ? 'محتمل' : 'Likely';
    return ar ? 'مراجعة' : 'Review';
  }
}
