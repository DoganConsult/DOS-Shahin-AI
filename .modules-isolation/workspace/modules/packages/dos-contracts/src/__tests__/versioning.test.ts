import { describe, it, expect } from 'vitest';
import { negotiateVersion, validateDeprecation, DEFAULT_DEPRECATION_POLICY } from '../api/versioning';

describe('negotiateVersion', () => {
  const contract = {
    route: '/api/risks',
    method: 'GET' as const,
    versions: [
      { version: '1', status: 'deprecated' as const },
      { version: '2', status: 'current' as const },
    ],
    ownerScope: 'platform' as const,
  };

  it('resolves to current version by default', () => {
    const result = negotiateVersion(contract);
    expect(result.resolvedVersion).toBe('2');
    expect(result.isDeprecated).toBe(false);
  });

  it('returns deprecated version with warning', () => {
    const result = negotiateVersion(contract, '1');
    expect(result.resolvedVersion).toBe('1');
    expect(result.isDeprecated).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('falls back for unknown version', () => {
    const result = negotiateVersion(contract, '99');
    expect(result.resolvedVersion).toBe('2');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateDeprecation', () => {
  it('requires migration guide', () => {
    const errors = validateDeprecation(
      { version: '1', status: 'deprecated' },
      new Date(),
      DEFAULT_DEPRECATION_POLICY,
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes with migration guide', () => {
    const errors = validateDeprecation(
      { version: '1', status: 'deprecated', migrationGuide: 'Use v2 instead' },
      new Date(),
    );
    expect(errors).toHaveLength(0);
  });
});
