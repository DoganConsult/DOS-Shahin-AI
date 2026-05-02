/**
 * Cross-registry drift gates: module UI presets vs dashboard catalog, etc.
 */
import { describe, it, expect } from 'vitest';
import { MODULE_UI_REGISTRY } from './module-ui.registry';
import { DASHBOARD_BY_CODE } from './dashboard.registry';

describe('Registry crosswalk — module-ui vs dashboard.registry', () => {
  it('every MODULE_UI_REGISTRY dashboardPreset exists in DASHBOARD_BY_CODE', () => {
    const missing: { moduleCode: string; preset: string }[] = [];
    for (const entry of MODULE_UI_REGISTRY) {
      for (const preset of entry.dashboardPresets) {
        if (!DASHBOARD_BY_CODE.has(preset)) {
          missing.push({ moduleCode: entry.moduleCode, preset });
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
