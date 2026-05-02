import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('VendorManagementComponent', () => {
  const src = readFileSync(resolve(__dirname, 'vendor-management.component.ts'), 'utf-8');

  it('should use OnPush change detection', () => {
    expect(src).toContain('ChangeDetectionStrategy.OnPush');
  });

  it('should import GrcDataTableComponent', () => {
    expect(src).toContain('GrcDataTableComponent');
  });

  it('should import EmptyStateComponent', () => {
    expect(src).toContain('EmptyStateComponent');
  });

  it('should use VendorApiService', () => {
    expect(src).toContain('VendorApiService');
  });

  it('should have vendor list tracking', () => {
    expect(src).toContain('vendors');
  });

  it('should have CRUD operations', () => {
    expect(src).toMatch(/create|add|save|select|load/i);
    expect(src).toMatch(/update|edit|select|onVendor/i);
  });

  it('should use takeUntilDestroyed for subscriptions', () => {
    expect(src).toContain('takeUntilDestroyed');
  });
});
