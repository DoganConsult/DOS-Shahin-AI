// RisksComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'risks.component.ts'), 'utf-8');

describe('RisksComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-risks', () => {
    expect(src).toMatch(/selector:\s*['"]app-risks['"]/);
  });

  it('should export RisksComponent class', () => {
    expect(src).toContain('export class RisksComponent');
  });

  it('should inject GrcRiskService for risk data', () => {
    expect(src).toContain('GrcRiskService');
  });

  it('should inject I18nService for bilingual support', () => {
    expect(src).toContain('I18nService');
  });

  it('should use PageShellComponent layout', () => {
    expect(src).toContain('PageShellComponent');
  });

  it('should provide MessageService for toast notifications', () => {
    expect(src).toContain('MessageService');
    expect(src).toContain('providers:');
  });

  it('should import EntityDetailDrawerComponent', () => {
    expect(src).toContain('EntityDetailDrawerComponent');
  });

  it('should import AiPanelComponent for AI context', () => {
    expect(src).toContain('AiPanelComponent');
  });

  it('should import RaciPanelComponent', () => {
    expect(src).toContain('RaciPanelComponent');
  });

  it('should define SeverityOption interface', () => {
    expect(src).toContain('interface SeverityOption');
  });

  it('should use GrcLiveService for real-time updates', () => {
    expect(src).toContain('GrcLiveService');
  });

  it('should have loading state', () => {
    expect(src).toContain('loading');
  });
});
