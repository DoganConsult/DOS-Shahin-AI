import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const shellTs = readFileSync(resolve(__dirname, 'onboarding-shell-page.component.ts'), 'utf-8');
const shellHtml = readFileSync(resolve(__dirname, 'onboarding-shell-page.component.html'), 'utf-8');
const provSrc = readFileSync(resolve(__dirname, 'services/onboarding-provisioning.service.ts'), 'utf-8');
const sessionSrc = readFileSync(resolve(__dirname, 'services/onboarding-session.service.ts'), 'utf-8');
const navSrc = readFileSync(resolve(__dirname, 'services/onboarding-navigation.service.ts'), 'utf-8');
const questionContainerSrc = readFileSync(resolve(__dirname, 'containers/question-stage-container.component.ts'), 'utf-8');
const contentProviderSrc = readFileSync(resolve(__dirname, '../providers/shahin-content.provider.ts'), 'utf-8');

describe('Shell — org_structure fix (M4)', () => {
  it('Question container uses org_structure (not bare structure) for StructureModeToggle', () => {
    expect(questionContainerSrc).toContain("activeStage?.stageCode === 'org_structure'");
    expect(questionContainerSrc).not.toMatch(/activeStage\?\.stageCode === 'structure'(?!_)/);
  });
});

describe('Shell — getWillCreateItems stage code fix', () => {
  it('nav service delegates getWillCreateItems', () => {
    expect(navSrc).toContain('getWillCreateItems()');
  });

  it('content provider uses organization_identity (not org_profile) as map key', () => {
    expect(contentProviderSrc).toContain('organization_identity: [');
    expect(contentProviderSrc).not.toContain('org_profile: [');
  });

  it('content provider uses people_ownership (not people_roles) as map key', () => {
    expect(contentProviderSrc).toContain('people_ownership: [');
    expect(contentProviderSrc).not.toContain('people_roles: [');
  });
});

describe('Shell — personalization preserves all fields (M5)', () => {
  it('maps language field to workspace_language', () => {
    expect(shellHtml).toContain("questionCode: 'workspace_language', value: $event.language");
  });

  it('maps dashboardLayout field to workspace_dashboard_layout', () => {
    expect(shellHtml).toContain("questionCode: 'workspace_dashboard_layout', value: $event.dashboardLayout");
  });

  it('maps theme field', () => {
    expect(shellHtml).toContain("questionCode: 'workspace_theme', value: $event.theme");
  });

  it('maps logoUrl field', () => {
    expect(shellHtml).toContain("questionCode: 'workspace_logo_url', value: $event.logoUrl");
  });
});

describe('Shell — emitSceneWelcome uses session service', () => {
  it('session service has emitSceneWelcome', () => {
    expect(sessionSrc).toContain('emitSceneWelcome');
  });
});

describe('Shell — platform port wiring', () => {
  it('shell injects ONBOARDING_PLATFORM', () => {
    expect(shellTs).toContain('ONBOARDING_PLATFORM');
    expect(shellTs).toContain('platform');
  });
});

describe('Provisioning — route resolution (M7)', () => {
  it('provisioning service uses platform port for auth', () => {
    expect(provSrc).toContain('this.platform.auth');
  });

  it('provisioning service has goToWorkspace', () => {
    expect(provSrc).toContain('goToWorkspace');
  });

  it('provisioning service injects ONBOARDING_PLATFORM', () => {
    expect(provSrc).toContain('ONBOARDING_PLATFORM');
  });
});
