import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PageShellComponent', () => {
  const src = readFileSync(resolve(__dirname, 'page-shell.component.ts'), 'utf-8');

  it('should exist as a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should have app-page-shell selector', () => {
    expect(src).toContain("selector: 'app-page-shell'");
  });

  it('should use ng-content for content projection', () => {
    expect(src).toContain('<ng-content');
  });
});
