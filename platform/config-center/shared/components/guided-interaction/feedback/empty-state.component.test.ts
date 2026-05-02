import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('EmptyStateComponent', () => {
  const src = readFileSync(resolve(__dirname, 'empty-state.component.ts'), 'utf-8');

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should support default, error, search, success, locked, info variants', () => {
    expect(src).toContain("'default'");
    expect(src).toContain("'error'");
    expect(src).toContain("'search'");
    expect(src).toContain("'success'");
    expect(src).toContain("'locked'");
    expect(src).toContain("'info'");
  });

  it('should have variant-specific icons', () => {
    expect(src).toContain('inbox');
    expect(src).toContain('exclamation-circle');
    expect(src).toContain('check-circle');
    expect(src).toContain('lock');
    expect(src).toContain('info-circle');
  });

  it('should have action button with event emitter', () => {
    expect(src).toContain('@Output() action');
    expect(src).toContain('actionLabel');
  });

  it('should have accessibility role', () => {
    expect(src).toContain('role="status"');
  });

  it('should support RTL direction', () => {
    expect(src).toContain("dir");
    expect(src).toContain("'rtl'");
  });
});
