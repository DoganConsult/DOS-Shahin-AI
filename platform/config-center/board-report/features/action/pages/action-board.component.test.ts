import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ActionBoardComponent', () => {
  const src = readFileSync(resolve(__dirname, 'action-board.component.ts'), 'utf-8');

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should import EmptyStateComponent', () => {
    expect(src).toContain('EmptyStateComponent');
  });

  it('should have task/action tracking', () => {
    expect(src).toMatch(/actions|tasks/i);
  });

  it('should use takeUntilDestroyed for subscriptions', () => {
    expect(src).toContain('takeUntilDestroyed');
  });

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });
});
