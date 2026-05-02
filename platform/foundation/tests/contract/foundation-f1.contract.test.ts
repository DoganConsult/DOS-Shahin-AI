// F1 Contract Matrix — static surface test.
//
// Verifies every F1.x route the frontend depends on is present in the
// module's exported surface. This is a compile + wiring test: it does
// NOT hit a live DB. Runtime DB validation is performed end-to-end via
// the host service smoke suite once a browser OIDC token is available
// (see AS-BUILT.md "Contract Status").

import { describe, it, expect } from 'vitest';
import * as Mod from '../../index';

const F1_REQUIRED_EXPORTS = [
  'createFoundationAggregatorRouter', // F1.0, F1.4
  'organizationsRouter',              // F1.7
  'businessUnitsRouter',              // F1.8
  'positionsRouter',                  // F1.9
  'locationsRouter',                  // F1.10
  'committeeManagementRouter',        // F1.11, F1.20
  'ownershipMappingRouter',           // F1.16
  'accessReviewRouter',               // F1.17
  'delegationRouter',                 // F1.15
  'foundationGovernanceRouter',       // F1.18
  'userLifecycleRouter',
  'bulkInviteRouter',
  'sodCheckRouter',
  'orgHierarchyRouter',
  'invitationsRouter',                // F1.13
  'auditTrailRouter',                 // F1.14
  'profilesRouter',                   // F1.12
  'foundationHealthRouter',
  'FOUNDATION_METRICS',
  'FOUNDATION_APPROVAL_MATRIX',
  'FOUNDATION_SOD_RULES',
];

describe('Foundation module — F1 contract surface', () => {
  for (const name of F1_REQUIRED_EXPORTS) {
    it(`exports ${name}`, () => {
      const v = (Mod as Record<string, unknown>)[name];
      expect(v, `missing export: ${name}`).toBeDefined();
    });
  }

  it('createFoundationAggregatorRouter is a factory accepting deps', () => {
    expect(typeof Mod.createFoundationAggregatorRouter).toBe('function');
    expect(Mod.createFoundationAggregatorRouter.length).toBeGreaterThanOrEqual(1);
  });

  it('FOUNDATION_METRICS exposes snapshot()', () => {
    expect(typeof (Mod as any).FOUNDATION_METRICS?.snapshot).toBe('function');
    const snap = (Mod as any).FOUNDATION_METRICS.snapshot();
    expect(snap).toHaveProperty('requestsTotal');
    expect(snap).toHaveProperty('healthChecks');
    expect(snap).toHaveProperty('requestLatencyMs');
  });
});
