import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './question-stage-container.component.ts'), 'utf-8');

describe('QuestionStageContainerComponent — structure', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class QuestionStageContainerComponent');
  });

  it('is standalone', () => {
    expect(src).toContain('standalone: true');
  });

  it('uses OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('has selector app-question-stage-container', () => {
    expect(src).toContain("selector: 'app-question-stage-container'");
  });
});

describe('QuestionStageContainerComponent — imports array completeness', () => {
  it('imports SceneValuePreviewComponent', () => {
    expect(src).toContain('SceneValuePreviewComponent');
  });

  it('imports QuestionRendererComponent', () => {
    expect(src).toContain('QuestionRendererComponent');
  });

  it('imports WillCreatePreviewComponent', () => {
    expect(src).toContain('WillCreatePreviewComponent');
  });

  it('imports StructureModeToggleComponent', () => {
    expect(src).toContain('StructureModeToggleComponent');
  });

  it('imports CsvTeamImportComponent', () => {
    expect(src).toContain('CsvTeamImportComponent');
  });

  it('imports PainModuleMappingComponent', () => {
    expect(src).toContain('PainModuleMappingComponent');
  });

  it('imports PainCardsComponent', () => {
    expect(src).toContain('PainCardsComponent');
  });

  it('imports OnboardingSceneHeaderComponent', () => {
    expect(src).toContain('OnboardingSceneHeaderComponent');
  });
});

describe('QuestionStageContainerComponent — inputs', () => {
  it('has required activeStage input', () => {
    expect(src).toContain("@Input({ required: true }) activeStage!: StageDefinition");
  });
});

describe('QuestionStageContainerComponent — outputs', () => {
  it('emits answerChanged', () => {
    expect(src).toContain('@Output() answerChanged');
  });

  it('emits lookupAnswerChanged', () => {
    expect(src).toContain('@Output() lookupAnswerChanged');
  });

  it('emits saveAndContinue', () => {
    expect(src).toContain('@Output() saveAndContinue');
  });

  it('emits goToPrevious', () => {
    expect(src).toContain('@Output() goToPrevious');
  });

  it('emits goToNext', () => {
    expect(src).toContain('@Output() goToNext');
  });

  it('emits skipStage', () => {
    expect(src).toContain('@Output() skipStage');
  });

  it('emits painSelectionChanged', () => {
    expect(src).toContain('@Output() painSelectionChanged');
  });

  it('emits suggestResponsibilities', () => {
    expect(src).toContain('@Output() suggestResponsibilities');
  });

  it('emits teamCsvUploaded', () => {
    expect(src).toContain('@Output() teamCsvUploaded');
  });
});

describe('QuestionStageContainerComponent — template features', () => {
  it('renders scene header', () => {
    expect(src).toContain('<app-onboarding-scene-header');
  });

  it('renders scene value preview', () => {
    expect(src).toContain('<app-scene-value-preview');
  });

  it('renders question renderer in sections loop', () => {
    expect(src).toContain('<app-question-renderer');
    expect(src).toContain('*ngFor="let q of sec.questions');
  });

  it('renders pain cards conditionally', () => {
    expect(src).toContain('<app-pain-cards');
    expect(src).toContain('nav.activePainCards()');
  });

  it('renders pain module mapping', () => {
    expect(src).toContain('<app-pain-module-mapping');
  });

  it('renders structure mode toggle for org_structure stage', () => {
    expect(src).toContain('<app-structure-mode-toggle');
    expect(src).toContain("'org_structure'");
  });

  it('renders CSV team import for people stages', () => {
    expect(src).toContain('<app-csv-team-import');
    expect(src).toContain("'people_ownership'");
  });

  it('renders will-create preview', () => {
    expect(src).toContain('<app-will-create-preview');
  });

  it('renders navigation buttons', () => {
    expect(src).toContain('saveAndContinue.emit()');
    expect(src).toContain('goToPrevious.emit()');
  });
});
