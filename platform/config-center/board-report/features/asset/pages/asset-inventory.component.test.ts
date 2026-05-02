import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('AssetInventoryComponent', () => {
  const src = readFileSync(resolve(__dirname, 'asset-inventory.component.ts'), 'utf-8');

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should import GrcDataTableComponent', () => {
    expect(src).toContain('GrcDataTableComponent');
  });

  it('should import EmptyStateComponent', () => {
    expect(src).toContain('EmptyStateComponent');
  });

  it('should use AssetApiService', () => {
    expect(src).toContain('AssetApiService');
  });

  it('should be standalone component', () => {
    expect(src).toContain('standalone: true');
  });
});
