import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './provision-stage-container.component.ts'), 'utf-8');

describe('ProvisionStageContainerComponent — structure', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class ProvisionStageContainerComponent');
  });

  it('is standalone', () => {
    expect(src).toContain('standalone: true');
  });

  it('uses OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('has selector app-provision-stage-container', () => {
    expect(src).toContain("selector: 'app-provision-stage-container'");
  });
});

describe('ProvisionStageContainerComponent — imports', () => {
  it('imports ActivationMilestonesComponent', () => {
    expect(src).toContain('ActivationMilestonesComponent');
  });

  it('imports CockpitRevealBannerComponent', () => {
    expect(src).toContain('CockpitRevealBannerComponent');
  });
});

describe('ProvisionStageContainerComponent — outputs', () => {
  it('emits retryProvisioning', () => {
    expect(src).toContain('@Output() retryProvisioning');
  });

  it('emits retryPoll', () => {
    expect(src).toContain('@Output() retryPoll');
  });

  it('emits cancelProvisioning', () => {
    expect(src).toContain('@Output() cancelProvisioning');
  });

  it('emits techLogExpanded', () => {
    expect(src).toContain('@Output() techLogExpanded');
  });

  it('emits enterWorkspace', () => {
    expect(src).toContain('@Output() enterWorkspace');
  });

  it('emits toggleChecklistItem', () => {
    expect(src).toContain('@Output() toggleChecklistItem');
  });

  it('emits npsRated', () => {
    expect(src).toContain('@Output() npsRated');
  });
});

describe('ProvisionStageContainerComponent — template', () => {
  it('renders activation milestones with full bindings', () => {
    expect(src).toContain('<app-activation-milestones');
    expect(src).toContain('[provJob]');
    expect(src).toContain('[provSteps]');
    expect(src).toContain('[milestones]');
    expect(src).toContain('[elapsedSeconds]');
    expect(src).toContain('[temporalStatus]');
    expect(src).toContain('[provisioningEvents]');
  });

  it('renders cockpit reveal banner on job completion', () => {
    expect(src).toContain('<app-cockpit-reveal-banner');
    expect(src).toContain("store.provJob()?.job_status === 'completed'");
  });

  it('renders provision error banner', () => {
    expect(src).toContain('store.provisionError()');
    expect(src).toContain('onb-provision-error-banner');
  });

  it('renders correlation ID when available', () => {
    expect(src).toContain('store.provisionCorrelationId()');
  });

  it('bilingual stage header', () => {
    expect(src).toContain('Shahin Is Preparing Your Workspace');
    expect(src).toContain('شاهين يُعِد بيئة العمل');
  });
});
