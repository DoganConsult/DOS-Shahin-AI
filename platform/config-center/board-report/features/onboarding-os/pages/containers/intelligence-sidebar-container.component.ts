import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingStore } from '../store/onboarding.store';
import { OnboardingNavigationService } from '../services/onboarding-navigation.service';
import { LiveIntelligencePanelComponent } from '../../components/live-intelligence/live-intelligence-panel.component';
import { AgentPreviewPanelComponent } from '../../components/live-intelligence/agent-preview-panel.component';
import { ConfidenceRadarComponent } from '../../components/shared/confidence-radar.component';
import { RegulatorExplainerComponent } from '../../components/live-intelligence/regulator-explainer.component';
import { AnswerHistoryComponent } from '../../components/shared/answer-history.component';

@Component({
  selector: 'app-intelligence-sidebar-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, LiveIntelligencePanelComponent,
    AgentPreviewPanelComponent, ConfidenceRadarComponent,
    RegulatorExplainerComponent, AnswerHistoryComponent,
  ],
  template: `
    <app-live-intelligence-panel
      [liveInference]="store.liveInferenceData()"
      [inferredFacts]="store.inferredFacts()"
      [confidenceScores]="store.confidenceScores()"
      [scores]="store.scores()"
      [recommendations]="store.recommendations()"
      [sectorResolution]="store.sectorResolution()"
      [answeredCount]="nav.answeredCount()"
      [totalQuestions]="nav.activeQuestionCount()"
      [computing]="store.inferenceComputing()"
      [lang]="store.isAr ? 'ar' : 'en'">
    </app-live-intelligence-panel>
    <app-agent-preview-panel
      [agents]="store.activeAgentPreviews()"
      [readiness]="store.agentReadiness()"
      [lang]="store.isAr ? 'ar' : 'en'">
    </app-agent-preview-panel>
    <app-confidence-radar *ngIf="store.confidenceScores().length > 0"
      [dimensions]="store.confidenceScores()"
      [lang]="store.isAr ? 'ar' : 'en'">
    </app-confidence-radar>
    <app-regulator-explainer
      [explanations]="store.regulatorExplanations()"
      [lang]="store.isAr ? 'ar' : 'en'">
    </app-regulator-explainer>
    <app-answer-history
      [entries]="store.answerHistory()"
      [lang]="store.isAr ? 'ar' : 'en'">
    </app-answer-history>
  `,
})
export class IntelligenceSidebarContainerComponent {
  readonly store = inject(OnboardingStore);
  readonly nav = inject(OnboardingNavigationService);
}
