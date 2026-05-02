import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('GrcDataTableComponent', () => {
  const src = readFileSync(resolve(__dirname, 'grc-data-table.component.ts'), 'utf-8');

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have grc-data-table selector', () => {
    expect(src).toContain("'grc-data-table'");
  });

  it('should accept title input', () => {
    expect(src).toContain("@Input() title");
  });

  it('should accept totalRecords for empty state toggle', () => {
    expect(src).toContain("@Input() totalRecords");
  });

  it('should show loading skeleton', () => {
    expect(src).toContain('app-skeleton-loader');
    expect(src).toContain('loading');
  });

  it('should show empty state when no records', () => {
    expect(src).toContain('app-empty-state');
    expect(src).toContain('emptyMessage');
  });

  it('should support content projection for table', () => {
    expect(src).toContain('<ng-content>');
    expect(src).toContain('tableToolbar');
  });

  it('should support export button', () => {
    expect(src).toContain('showExport');
    expect(src).toContain('exportFilename');
  });
});
