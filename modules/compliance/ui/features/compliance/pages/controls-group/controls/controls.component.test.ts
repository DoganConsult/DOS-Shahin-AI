// ControlsComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'controls.component.ts'), 'utf-8');

describe('ControlsComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-controls', () => {
    expect(src).toMatch(/selector:\s*['"]app-controls['"]/);
  });

  it('should export ControlsComponent class', () => {
    expect(src).toContain('export class ControlsComponent');
  });

  it('should inject GrcComplianceService for API calls', () => {
    expect(src).toContain('GrcComplianceService');
  });

  it('should inject I18nService for translations', () => {
    expect(src).toContain('I18nService');
  });

  it('should use PageShellComponent as layout wrapper', () => {
    expect(src).toContain('PageShellComponent');
    expect(src).toContain('<app-page-shell');
  });

  it('should import PrimeNG TableModule for data grid', () => {
    expect(src).toContain('TableModule');
  });

  it('should support bulk team assignment', () => {
    expect(src).toContain('bulkTeamId');
    expect(src).toContain('assignToTeam');
  });

  it('should have create control dialog', () => {
    expect(src).toContain('DialogModule');
    expect(src).toContain('openCreate()');
  });

  it('should import AiPanelComponent for AI assistance', () => {
    expect(src).toContain('AiPanelComponent');
  });

  it('should import RaciPanelComponent for RACI display', () => {
    expect(src).toContain('RaciPanelComponent');
  });

  it('should support filtering unassigned controls', () => {
    expect(src).toContain('filterUnassigned');
    expect(src).toContain('unassignedCount');
  });

  it('should use GrcLiveService for real-time updates', () => {
    expect(src).toContain('GrcLiveService');
  });
});
