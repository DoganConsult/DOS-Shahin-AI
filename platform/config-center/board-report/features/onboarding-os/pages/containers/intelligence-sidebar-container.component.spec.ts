import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './intelligence-sidebar-container.component.ts'), 'utf-8');

describe('IntelligenceSidebarContainerComponent — structure', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class IntelligenceSidebarContainerComponent');
  });

  it('is standalone', () => {
    expect(src).toContain('standalone: true');
  });

  it('uses OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('has selector app-intelligence-sidebar-container', () => {
    expect(src).toContain("selector: 'app-intelligence-sidebar-container'");
  });
});

describe('IntelligenceSidebarContainerComponent — imports array completeness', () => {
  it('imports LiveIntelligencePanelComponent', () => {
    expect(src).toContain('LiveIntelligencePanelComponent');
  });

  it('imports AgentPreviewPanelComponent', () => {
    expect(src).toContain('AgentPreviewPanelComponent');
  });

  it('imports ConfidenceRadarComponent', () => {
    expect(src).toContain('ConfidenceRadarComponent');
  });

  it('imports RegulatorExplainerComponent', () => {
    expect(src).toContain('RegulatorExplainerComponent');
  });

  it('imports AnswerHistoryComponent', () => {
    expect(src).toContain('AnswerHistoryComponent');
  });
});

describe('IntelligenceSidebarContainerComponent — template', () => {
  it('renders live intelligence panel with all bindings', () => {
    expect(src).toContain('<app-live-intelligence-panel');
    expect(src).toContain('[liveInference]');
    expect(src).toContain('[inferredFacts]');
    expect(src).toContain('[confidenceScores]');
    expect(src).toContain('[scores]');
    expect(src).toContain('[recommendations]');
    expect(src).toContain('[sectorResolution]');
    expect(src).toContain('[answeredCount]');
    expect(src).toContain('[totalQuestions]');
    expect(src).toContain('[computing]');
  });

  it('renders agent preview panel', () => {
    expect(src).toContain('<app-agent-preview-panel');
    expect(src).toContain('[agents]');
    expect(src).toContain('[readiness]');
  });

  it('renders confidence radar conditionally', () => {
    expect(src).toContain('<app-confidence-radar');
    expect(src).toContain('store.confidenceScores().length > 0');
  });

  it('renders regulator explainer', () => {
    expect(src).toContain('<app-regulator-explainer');
    expect(src).toContain('[explanations]');
  });

  it('renders answer history', () => {
    expect(src).toContain('<app-answer-history');
    expect(src).toContain('[entries]');
  });
});
