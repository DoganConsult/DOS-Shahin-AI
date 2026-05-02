/**
 * LiveIntelligencePanelComponent — spec tests for the intelligence panel.
 * Validates component structure, section toggling, confidence display, and recommendations.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './live-intelligence-panel.component.ts'), 'utf-8');
const html = readFileSync(resolve(__dirname, './live-intelligence-panel.component.html'), 'utf-8');

describe('LiveIntelligencePanelComponent — component creates', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class LiveIntelligencePanelComponent');
  });

  it('uses OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('declares selector as app-live-intelligence-panel', () => {
    expect(src).toContain("selector: 'app-live-intelligence-panel'");
  });

  it('accepts liveInference Input for regulatory data', () => {
    expect(src).toContain('@Input() liveInference: GrcRecord');
  });

  it('accepts inferredFacts Input', () => {
    expect(src).toContain('@Input() inferredFacts: InferredFact[] = []');
  });

  it('accepts confidenceScores Input', () => {
    expect(src).toContain('@Input() confidenceScores: ConfidenceDimension[] = []');
  });

  it('accepts scores Input', () => {
    expect(src).toContain('@Input() scores: OnboardingScore[] = []');
  });

  it('accepts recommendations Input', () => {
    expect(src).toContain('@Input() recommendations: OnboardingRecommendation[] = []');
  });

  it('accepts sectorResolution Input', () => {
    expect(src).toContain('@Input() sectorResolution: GrcRecord');
  });

  it('accepts computing flag for loading state', () => {
    expect(src).toContain('@Input() computing = false');
  });

  it('supports bilingual display with lang Input', () => {
    expect(src).toContain("@Input() lang: 'en' | 'ar' = 'en'");
  });
});

describe('LiveIntelligencePanelComponent — renders recommendations', () => {
  it('template has recommendations section', () => {
    expect(html).toContain('recommendations.length > 0');
  });

  it('renders recommendation items with star icon', () => {
    expect(html).toContain('*ngFor="let rec of recommendations"');
    expect(html).toContain('pi-star');
  });

  it('supports Arabic recommendation titles', () => {
    expect(html).toContain("lang === 'ar' ? rec.title_ar : rec.title_en");
  });

  it('renders scores section with domain and value', () => {
    expect(html).toContain('scores.length > 0');
    expect(html).toContain('s.scoreDomain');
    expect(html).toContain('s.scoreValue');
  });

  it('renders score rating labels', () => {
    expect(html).toContain('s.ratingLabel');
  });

  it('applies score severity classes (high, mid, low)', () => {
    expect(html).toContain("s.scoreValue >= 80 ? 'score-high'");
    expect(html).toContain("s.scoreValue >= 50 ? 'score-mid'");
    expect(html).toContain("'score-low'");
  });
});

describe('LiveIntelligencePanelComponent — sections and toggling', () => {
  it('has three collapsible sections managed by signals', () => {
    expect(src).toContain('section1Open = signal(true)');
    expect(src).toContain('section2Open = signal(true)');
    expect(src).toContain('section3Open = signal(true)');
  });

  it('toggleSection method toggles the correct section signal', () => {
    const method = src.slice(
      src.indexOf('toggleSection(n: number)'),
      src.indexOf('toggleSection(n: number)') + 300,
    );
    expect(method).toContain('this.section1Open.set(!this.section1Open())');
    expect(method).toContain('this.section2Open.set(!this.section2Open())');
    expect(method).toContain('this.section3Open.set(!this.section3Open())');
  });

  it('template wires toggleSection to click and keyboard events', () => {
    expect(html).toContain('(click)="toggleSection(1)"');
    expect(html).toContain('(click)="toggleSection(2)"');
    expect(html).toContain('(click)="toggleSection(3)"');
    expect(html).toContain('(keydown.enter)="toggleSection(1)"');
    expect(html).toContain('(keydown.space)="toggleSection(1)"');
  });

  it('template uses aria-expanded for accessibility', () => {
    expect(html).toContain('[attr.aria-expanded]="section1Open()"');
    expect(html).toContain('[attr.aria-expanded]="section2Open()"');
    expect(html).toContain('[attr.aria-expanded]="section3Open()"');
  });
});

describe('LiveIntelligencePanelComponent — confidence display', () => {
  it('getConfidenceClass returns confirmed for >= 0.9', () => {
    const method = src.slice(
      src.indexOf('getConfidenceClass('),
      src.indexOf('getConfidenceClass(') + 300,
    );
    expect(method).toContain("confidence >= 0.9");
    expect(method).toContain("'confidence-confirmed'");
  });

  it('getConfidenceClass returns likely for >= 0.7', () => {
    const method = src.slice(
      src.indexOf('getConfidenceClass('),
      src.indexOf('getConfidenceClass(') + 300,
    );
    expect(method).toContain("confidence >= 0.7");
    expect(method).toContain("'confidence-likely'");
  });

  it('getConfidenceClass returns review for < 0.7', () => {
    const method = src.slice(
      src.indexOf('getConfidenceClass('),
      src.indexOf('getConfidenceClass(') + 300,
    );
    expect(method).toContain("'confidence-review'");
  });

  it('getConfidenceLabel returns bilingual labels', () => {
    const defIdx = src.indexOf('getConfidenceLabel(confidence:');
    const method = src.slice(defIdx, defIdx + 500);
    expect(method).toContain("'Confirmed'");
    expect(method).toContain("'Likely'");
    expect(method).toContain("'Review'");
  });

  it('shows computing skeleton when computing is true', () => {
    expect(html).toContain('*ngIf="computing"');
    expect(html).toContain('intel-skeleton');
    expect(html).toContain('pi-spin pi-spinner');
  });

  it('shows empty state when no regulatory data available', () => {
    expect(html).toContain('Tell Shahin more');
    expect(html).toContain('intel-empty');
  });
});
