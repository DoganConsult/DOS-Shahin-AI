import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('PageHeaderComponent', () => {
  const src = readFileSync(resolve(__dirname, 'page-header.component.ts'), 'utf-8');

  it('should exist as a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should accept title input', () => {
    expect(src).toContain('@Input()');
    expect(src).toContain('title');
  });

  it('should export PageHeaderAction type', () => {
    expect(src).toContain('PageHeaderAction');
  });
});
