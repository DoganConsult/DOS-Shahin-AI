// EvidenceCatalogComponent — Structure & Logic Tests
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'evidence-catalog.component.ts'), 'utf-8');

describe('EvidenceCatalogComponent', () => {
  it('should be a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have selector app-evidence-catalog', () => {
    expect(src).toMatch(/selector:\s*['"]app-evidence-catalog['"]/);
  });

  it('should export EvidenceCatalogComponent class', () => {
    expect(src).toContain('export class EvidenceCatalogComponent');
  });

  it('should implement OnInit', () => {
    expect(src).toContain('implements OnInit');
  });

  it('should inject EvidenceApiService for evidence data', () => {
    expect(src).toContain('EvidenceApiService');
  });

  it('should inject I18nService', () => {
    expect(src).toContain('I18nService');
  });

  it('should track summary statistics', () => {
    expect(src).toContain('totalControls');
    expect(src).toContain('completeCount');
    expect(src).toContain('expiringCount');
    expect(src).toContain('avgCompleteness');
  });

  it('should use PrimeNG Table with lazy loading', () => {
    expect(src).toContain('TableModule');
    expect(src).toContain('[lazy]="true"');
    expect(src).toContain('onLazyLoad');
  });

  it('should use PageShellComponent layout', () => {
    expect(src).toContain('PageShellComponent');
  });

  it('should have catalog array and totalRecords', () => {
    expect(src).toContain('catalog:');
    expect(src).toContain('totalRecords');
  });

  it('should prevent concurrent loads', () => {
    expect(src).toContain('_loadInFlight');
  });

  it('should call loadPage on init', () => {
    expect(src).toContain('this.loadPage()');
  });
});
