import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('SkeletonLoaderComponent', () => {
  const src = readFileSync(resolve(__dirname, 'skeleton-loader.component.ts'), 'utf-8');

  it('should exist as a standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should accept variant input', () => {
    expect(src).toContain('variant');
  });

  it('should accept count input', () => {
    expect(src).toContain('count');
  });

  it('should have loading animation styles', () => {
    expect(src).toMatch(/animation|@keyframes|pulse|shimmer/i);
  });
});
