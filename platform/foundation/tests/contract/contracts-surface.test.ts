/**
 * Contract-surface snapshot test.
 *
 * Asserts that the public `@dos/module-foundation/contracts` barrel exports
 * the canonical set of names and the runtime constant shapes are frozen.
 * Any addition or rename surfaces here so peer-module impact is reviewed.
 */
import { describe, it, expect } from 'vitest';
import * as Contracts from '../../contracts';

describe('foundation contracts surface', () => {
  it('exposes the canonical runtime constants', () => {
    expect(Object.keys(Contracts).sort()).toEqual(
      [
        'FOUNDATION_CONSUMED_EVENT_NAMES',
        'FOUNDATION_ERROR_CODES',
        'FOUNDATION_EVENT_NAMES',
        'FOUNDATION_PERMISSION_CODES',
      ].sort(),
    );
  });

  it('FOUNDATION_EVENT_NAMES values are stable', () => {
    expect(Contracts.FOUNDATION_EVENT_NAMES).toMatchObject({
      ORG_CREATED: 'foundation.org_created',
      ORG_UPDATED: 'foundation.org_updated',
      DEPT_CREATED: 'foundation.dept_created',
      DEPT_UPDATED: 'foundation.dept_updated',
      ROLE_ASSIGNED: 'foundation.role.assigned',
      SCOPE_CHANGED: 'foundation.scope_changed',
    });
  });

  it('FOUNDATION_PERMISSION_CODES values are stable', () => {
    expect(Contracts.FOUNDATION_PERMISSION_CODES).toMatchObject({
      READ: 'foundation.read',
      WRITE: 'foundation.record.write',
      DELETE: 'foundation.record.delete',
      APPROVE: 'foundation.record.approve',
      MANAGE: 'foundation.manage',
      ORG_READ: 'foundation.org.read',
      ORG_WRITE: 'foundation.org.write',
      RECORD_READ: 'foundation.record.read',
    });
  });

  it('FOUNDATION_ERROR_CODES values are stable', () => {
    expect(Contracts.FOUNDATION_ERROR_CODES).toMatchObject({
      ENTITY_NOT_FOUND: 'FOUNDATION_ENTITY_NOT_FOUND',
      ENTITY_CONFLICT: 'FOUNDATION_ENTITY_CONFLICT',
      HIERARCHY_CYCLE: 'FOUNDATION_HIERARCHY_CYCLE',
    });
  });
});
