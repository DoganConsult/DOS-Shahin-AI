// AnalyticsDashboardComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'analytics-dashboard.component.ts'), 'utf-8');

describe('AnalyticsDashboardComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should export AnalyticsDashboardComponent class', () => {
    expect(src).toContain('export class AnalyticsDashboardComponent');
  });

  it('should inject I18nService', () => {
    expect(src).toContain('I18nService');
  });

  it('should implement OnInit', () => {
    expect(src).toContain('OnInit');
  });
});
