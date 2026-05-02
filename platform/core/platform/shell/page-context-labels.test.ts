import { describe, expect, it } from 'vitest';

import {
  formatSignatureWidgetLabel,
  humanizeContextToken,
  routeModuleCode,
  stripModulePrefix,
} from './page-context-labels';

describe('page-context-labels', () => {
  it('extracts the module code from a route', () => {
    expect(routeModuleCode('/foundation/overview')).toBe('foundation');
    expect(routeModuleCode('/risk/register?sort=desc')).toBe('risk');
  });

  it('strips the active module prefix from widget identifiers', () => {
    expect(stripModulePrefix('foundation-command-center', 'foundation')).toBe('command-center');
    expect(stripModulePrefix('risk_heatmap', 'risk')).toBe('heatmap');
    expect(stripModulePrefix('vendor-risk-snapshot', 'foundation')).toBe('vendor-risk-snapshot');
  });

  it('humanizes internal tokens into readable labels', () => {
    expect(humanizeContextToken('full-page')).toBe('Full Page');
    expect(humanizeContextToken('ai_org_scan')).toBe('AI Org Scan');
    expect(humanizeContextToken('department_scope')).toBe('Department Scope');
  });

  it('formats signature widget labels without the module prefix', () => {
    expect(formatSignatureWidgetLabel('foundation-command-center', 'foundation')).toBe('Command Center');
    expect(formatSignatureWidgetLabel('workspace-home', 'foundation')).toBe('Workspace Home');
  });
});