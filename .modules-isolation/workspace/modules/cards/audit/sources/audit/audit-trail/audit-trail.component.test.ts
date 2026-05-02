// AuditTrailComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'audit-trail.component.ts'), 'utf-8');

describe('AuditTrailComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-audit-trail', () => {
    expect(src).toMatch(/selector:\s*['"]app-audit-trail['"]/);
  });

  it('should export AuditTrailComponent class', () => {
    expect(src).toContain('export class AuditTrailComponent');
  });

  it('should inject GrcOperationsService for audit data', () => {
    expect(src).toContain('GrcOperationsService');
  });

  it('should inject I18nService for bilingual support', () => {
    expect(src).toContain('I18nService');
  });

  it('should use PageHeaderComponent', () => {
    expect(src).toContain('PageHeaderComponent');
  });

  it('should use ModuleTabsBarComponent with foundation tabs via registry', () => {
    expect(src).toContain('ModuleTabsBarComponent');
    expect(src).toContain("getModuleTabs('foundation')");
  });

  it('should display health strip with action counts', () => {
    expect(src).toContain('totalCount()');
    expect(src).toContain("actionCount('create')");
    expect(src).toContain("actionCount('update')");
    expect(src).toContain("actionCount('delete')");
  });

  it('should use signals for reactive state', () => {
    expect(src).toContain('signal');
  });

  it('should use PrimeNG TableModule', () => {
    expect(src).toContain('TableModule');
  });

  it('should support RTL direction', () => {
    expect(src).toContain('dir()');
  });

  it('should have header actions', () => {
    expect(src).toContain('headerActions');
    expect(src).toContain('onHdrAction');
  });
});
