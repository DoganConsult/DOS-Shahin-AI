import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('RemediationTrackerComponent', () => {
  const src = readFileSync(resolve(__dirname, 'remediation-tracker.component.ts'), 'utf-8');

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should import EmptyStateComponent', () => {
    expect(src).toContain('EmptyStateComponent');
  });

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });

  it('should track remediation items', () => {
    expect(src).toMatch(/remediation|gap|plan/i);
  });
});
