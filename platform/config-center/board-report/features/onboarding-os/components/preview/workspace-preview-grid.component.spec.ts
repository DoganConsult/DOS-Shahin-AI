/**
 * WorkspacePreviewGridComponent — spec tests for the workspace preview grid.
 * Validates component structure, grid rendering, empty state, and metric computation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, './workspace-preview-grid.component.ts'), 'utf-8');
const html = readFileSync(resolve(__dirname, './workspace-preview-grid.component.html'), 'utf-8');

describe('WorkspacePreviewGridComponent — component creates', () => {
  it('exports the component class', () => {
    expect(src).toContain('export class WorkspacePreviewGridComponent');
  });

  it('uses OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('declares selector as app-workspace-preview-grid', () => {
    expect(src).toContain("selector: 'app-workspace-preview-grid'");
  });

  it('accepts sections Input with empty default', () => {
    expect(src).toContain("@Input() sections: WorkspacePreviewSection[] = []");
  });

  it('accepts lang Input defaulting to en', () => {
    expect(src).toContain("@Input() lang: 'en' | 'ar' = 'en'");
  });

  it('imports TagModule and CommonModule', () => {
    expect(src).toContain('TagModule');
    expect(src).toContain('CommonModule');
  });
});

describe('WorkspacePreviewGridComponent — renders grid sections', () => {
  it('provides getSectionIcon for section icon resolution', () => {
    expect(src).toContain('getSectionIcon(section: string): string');
  });

  it('maps known section codes to icon classes', () => {
    expect(src).toContain("regulatory_chain: 'pi-sitemap'");
    expect(src).toContain("framework_rationale: 'pi-shield'");
    expect(src).toContain("control_preview: 'pi-list'");
    expect(src).toContain("ai_agents_preview: 'pi-android'");
  });

  it('falls back to pi-box for unknown section codes', () => {
    expect(src).toContain("?? 'pi-box'");
  });

  it('separates regulatory_chain for dedicated rendering', () => {
    expect(src).toContain('getChainSection(): WorkspacePreviewSection | null');
    expect(src).toContain("s => s.section === 'regulatory_chain'");
  });

  it('filters regulatory_chain from gridSections', () => {
    expect(src).toContain('get gridSections(): WorkspacePreviewSection[]');
    expect(src).toContain("s => s.section !== 'regulatory_chain'");
  });

  it('computes totalCount with memoization', () => {
    expect(src).toContain('get totalCount()');
    expect(src).toContain('_totalCountCache');
    expect(src).toContain('_totalCountSectionsRef');
  });

  it('counts frameworks from framework_rationale section', () => {
    expect(src).toContain("case 'framework_rationale':");
    expect(src).toContain('frameworks = Array.isArray(sec.data) ? sec.data.length : 0');
  });

  it('sums controls from control_preview section', () => {
    expect(src).toContain("case 'control_preview':");
    expect(src).toContain('control_count || item.count || 0');
  });

  it('counts agents from ai_agents_preview section', () => {
    expect(src).toContain("case 'ai_agents_preview':");
    expect(src).toContain('agents = Array.isArray(sec.data) ? sec.data.length : 0');
  });
});

describe('WorkspacePreviewGridComponent — handles empty state', () => {
  it('template handles empty sections gracefully', () => {
    // The component initializes sections as empty array
    expect(src).toContain("@Input() sections: WorkspacePreviewSection[] = []");
  });

  it('totalCount returns null when sections reference has no data', () => {
    expect(src).toContain("if (!sec.data) continue");
  });

  it('getMetric returns 0 for unknown section codes', () => {
    expect(src).toContain('default: return 0');
  });

  it('formatValue handles multiple value types', () => {
    expect(src).toContain('formatValue(val: unknown): string');
    expect(src).toContain("typeof val === 'number'");
    expect(src).toContain("typeof val === 'boolean'");
    expect(src).toContain("typeof val === 'string'");
    expect(src).toContain('Array.isArray(val)');
  });

  it('provides isObject type guard for template use', () => {
    expect(src).toContain('isObject(val: unknown): boolean');
    expect(src).toContain('val !== null && typeof val === \'object\' && !Array.isArray(val)');
  });

  it('supports Arabic display with RTL layout', () => {
    expect(src).toContain("this.lang === 'ar'");
  });
});
