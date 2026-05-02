import { describe, expect, it } from 'vitest';
import { findMissingPlatformCoreExports } from '../ops/scripts/audit-platform-core-exports';

describe('@dos/platform-core export surface', () => {
  it('exports every symbol referenced by consumers', () => {
    const missing = findMissingPlatformCoreExports();
    expect(missing).toEqual([]);
  }, 30_000);
});
