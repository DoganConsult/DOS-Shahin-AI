// DashboardComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'dashboard.component.ts'), 'utf-8');

describe('DashboardComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should export DashboardComponent class', () => {
    expect(src).toContain('export class DashboardComponent');
  });

  it('should inject GrcComplianceService for dashboard data', () => {
    expect(src).toContain('GrcComplianceService');
  });

  it('should inject SessionService for role-based widgets', () => {
    expect(src).toContain('SessionService');
  });

  it('should inject I18nService', () => {
    expect(src).toContain('I18nService');
  });

  it('should use WidgetRegistryService', () => {
    expect(src).toContain('WidgetRegistryService');
  });

  it('should import LayoutGridComponent for widget layout', () => {
    expect(src).toContain('LayoutGridComponent');
  });

  it('should import DrillThroughPanelComponent', () => {
    expect(src).toContain('DrillThroughPanelComponent');
  });

  it('should use PageShellComponent', () => {
    expect(src).toContain('PageShellComponent');
  });

  it('should implement OnInit and OnDestroy', () => {
    expect(src).toContain('OnInit');
    expect(src).toContain('OnDestroy');
  });

  it('should use d3 for chart rendering', () => {
    expect(src).toContain("import * as d3 from 'd3'");
  });

  it('should support role-based widget resolution', () => {
    expect(src).toContain('getWidgetsForRole');
  });

  it('should define AgentCard interface', () => {
    expect(src).toContain('interface AgentCard');
  });
});
