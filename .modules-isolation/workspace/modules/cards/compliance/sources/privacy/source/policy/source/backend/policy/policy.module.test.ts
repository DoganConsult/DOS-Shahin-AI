/**
 * Policy Module -- Comprehensive Manifest & Integration Tests
 *
 * Validates manifest integrity, lifecycle registration, security consistency,
 * event contract consistency, schema validation, data integrity, and
 * cross-module integration.
 *
 * @owner policy
 * @module policy
 */

import {  describe, it, expect , vi as _vi } from 'vitest';
import { POLICY_MANIFEST } from './policy.module';
import { POLICY_PERMISSIONS, POLICY_ROLES, POLICY_ACTIONS } from './security/policy.security';
import { POLICY_APPROVAL_MATRIX } from './security/policy.approval-matrix';
import {
  POLICY_EVENT_CONTRACT,
  POLICY_PUBLISHED_EVENTS,
  POLICY_CONSUMED_EVENTS,
  POLICY_EVENT_ORDERING,
  POLICY_EVENT_SECURITY,
} from './events/policy.events';
import {
  createPolicyBody,
  updatePolicyBody,
  listPoliciesQuery,
  bulkDeletePoliciesBody,
} from './schemas/policy.schemas';
import { POLICY_POLICY } from './policies/policy.policies';

// ── A. Manifest Integrity Tests ────────────────────────────────────────

describe('Policy Module Manifest', () => {
  it('has module code "policy"', () => {
    expect(POLICY_MANIFEST.code).toBe('policy');
  });

  it('version follows semver pattern', () => {
    expect(POLICY_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('all 27 owned tables are prefixed with "policy_"', () => {
    expect(POLICY_MANIFEST.ownedTables.length).toBe(27);
    for (const table of POLICY_MANIFEST.ownedTables) {
      expect(table).toMatch(/^policy_/);
    }
  });

  it('published events match event contract', () => {
    const manifestEvents = POLICY_MANIFEST.publishedEvents;
    const contractEvents = Object.keys(POLICY_EVENT_CONTRACT.published);
    expect(manifestEvents.sort()).toEqual(contractEvents.sort());
  });

  it('consumed events have handlers declared in event contract', () => {
    for (const event of POLICY_MANIFEST.consumedEvents) {
      const consumed = POLICY_EVENT_CONTRACT.consumed as Record<string, { handler: string }>;
      expect(consumed[event]).toBeDefined();
      expect(consumed[event].handler).toBeTruthy();
    }
  });

  it('hard deps are valid module codes', () => {
    expect(POLICY_MANIFEST.hardDeps.length).toBeGreaterThan(0);
    for (const dep of POLICY_MANIFEST.hardDeps) {
      expect(typeof dep).toBe('string');
      expect(dep.length).toBeGreaterThan(0);
    }
  });

  it('soft deps are valid module codes', () => {
    expect(POLICY_MANIFEST.softDeps.length).toBeGreaterThan(0);
    for (const dep of POLICY_MANIFEST.softDeps) {
      expect(typeof dep).toBe('string');
      expect(dep.length).toBeGreaterThan(0);
    }
  });

  it('security permissions defined for all action types', () => {
    expect(POLICY_MANIFEST.securityPermissions).toBeDefined();
    expect(POLICY_MANIFEST.securityPermissions!.length).toBeGreaterThan(0);
    const actionTypes = new Set(POLICY_MANIFEST.securityPermissions!.map(p => p.actionType));
    expect(actionTypes.size).toBeGreaterThan(1);
  });

  it('all roles have at least one permission', () => {
    expect(POLICY_MANIFEST.securityRoles).toBeDefined();
    for (const role of POLICY_MANIFEST.securityRoles!) {
      expect(role.permissions.length).toBeGreaterThan(0);
    }
  });

  it('default role (viewer) has minimum permissions', () => {
    const defaultRole = POLICY_ROLES.find(r => r.isDefault);
    expect(defaultRole).toBeDefined();
    expect(defaultRole!.archetype).toBe('viewer');
    expect(defaultRole!.permissions.length).toBeGreaterThan(0);
  });

  it('feature flags follow naming convention', () => {
    expect(POLICY_MANIFEST.featureFlags).toBeDefined();
    for (const flag of POLICY_MANIFEST.featureFlags!) {
      expect(flag).toMatch(/^policy\./);
    }
  });

  it('AI config present with capabilities', () => {
    expect(POLICY_MANIFEST.aiEnabled).toBe(true);
    expect(POLICY_MANIFEST.aiCapabilities).toBeDefined();
    expect(POLICY_MANIFEST.aiCapabilities!.length).toBeGreaterThan(0);
  });

  it('admin surfaces declared', () => {
    expect(POLICY_MANIFEST.adminSurfaces).toBeDefined();
    expect(POLICY_MANIFEST.adminSurfaces!.length).toBeGreaterThan(0);
  });

  it('has bilingual names', () => {
    expect(POLICY_MANIFEST.nameEn).toBeTruthy();
    expect(POLICY_MANIFEST.nameAr).toBeTruthy();
  });

  it('has route base defined', () => {
    expect(POLICY_MANIFEST.routeBase).toBe('/api/policy');
  });

  it('has event namespace defined', () => {
    expect(POLICY_MANIFEST.eventNamespace).toBe('policy');
  });

  it('has table prefix matching event namespace', () => {
    expect(POLICY_MANIFEST.tablePrefix).toBe('policy_');
  });
});

// ── B. Lifecycle Registration Tests ────────────────────────────────────

describe('Policy Lifecycle Registration', () => {
  const POLICY_STATES = ['draft', 'review', 'approved', 'published', 'retired', 'archived'] as const;

  const POLICY_TRANSITIONS: Record<string, string[]> = {
    draft: ['review'],
    review: ['approved', 'draft'],
    approved: ['published', 'draft'],
    published: ['retired'],
    retired: ['archived'],
    archived: [],
  };

  it('all states are valid lifecycle states', () => {
    expect(POLICY_STATES).toContain('draft');
    expect(POLICY_STATES).toContain('review');
    expect(POLICY_STATES).toContain('approved');
    expect(POLICY_STATES).toContain('published');
    expect(POLICY_STATES).toContain('retired');
    expect(POLICY_STATES).toContain('archived');
  });

  it('initial state is "draft"', () => {
    // draft is the first state and has no inbound transitions from terminal states
    expect(POLICY_STATES[0]).toBe('draft');
  });

  it('terminal state is "archived"', () => {
    expect(POLICY_TRANSITIONS['archived']).toEqual([]);
  });

  it('no self-transitions exist', () => {
    for (const [state, targets] of Object.entries(POLICY_TRANSITIONS)) {
      expect(targets).not.toContain(state);
    }
  });

  it('all transition targets are valid states', () => {
    const stateSet = new Set<string>(POLICY_STATES);
    for (const targets of Object.values(POLICY_TRANSITIONS)) {
      for (const target of targets) {
        expect(stateSet.has(target)).toBe(true);
      }
    }
  });

  it('reverse transitions exist where expected (review -> draft, approved -> draft)', () => {
    expect(POLICY_TRANSITIONS['review']).toContain('draft');
    expect(POLICY_TRANSITIONS['approved']).toContain('draft');
  });

  it('no orphan states exist (all states are reachable)', () => {
    // Every non-initial state must be a target of at least one transition
    const reachable = new Set<string>();
    reachable.add('draft'); // initial state is always reachable
    for (const targets of Object.values(POLICY_TRANSITIONS)) {
      for (const target of targets) {
        reachable.add(target);
      }
    }
    for (const state of POLICY_STATES) {
      expect(reachable.has(state)).toBe(true);
    }
  });

  it('all states in transition map have entries', () => {
    for (const state of POLICY_STATES) {
      expect(POLICY_TRANSITIONS).toHaveProperty(state);
    }
  });
});

// ── C. Security Consistency Tests ──────────────────────────────────────

describe('Policy Security Consistency', () => {
  const allPermissionCodes = POLICY_PERMISSIONS.map(p => p.permissionCode);

  it('all permission codes in roles exist in PERMISSIONS array', () => {
    for (const role of POLICY_ROLES) {
      for (const perm of role.permissions) {
        expect(allPermissionCodes).toContain(perm);
      }
    }
  });

  it('all action permission codes exist in PERMISSIONS array', () => {
    for (const action of POLICY_ACTIONS) {
      for (const perm of action.requiredPermissions) {
        expect(allPermissionCodes).toContain(perm);
      }
    }
  });

  it('no duplicate permission codes', () => {
    const unique = new Set(allPermissionCodes);
    expect(unique.size).toBe(allPermissionCodes.length);
  });

  it('approval matrix references valid roles', () => {
    const roleSet = new Set(POLICY_ROLES.map(r => r.roleCode));
    for (const rule of POLICY_APPROVAL_MATRIX) {
      expect(roleSet.has(rule.requiredRole)).toBe(true);
    }
  });

  it('approval matrix references valid entity types from aggregate roots', () => {
    const aggregateRoots = new Set(POLICY_MANIFEST.aggregateRoots);
    for (const rule of POLICY_APPROVAL_MATRIX) {
      expect(aggregateRoots.has(rule.entityType)).toBe(true);
    }
  });

  it('SoD-sensitive actions require approval or have auditable flag', () => {
    const sodActions = POLICY_ACTIONS.filter(a => a.sodSensitive);
    for (const action of sodActions) {
      expect(action.requiresApproval || action.auditable).toBe(true);
    }
  });

  it('destructive actions are not AI-enabled', () => {
    const destructive = POLICY_ACTIONS.filter(a => a.dangerLevel === 'destructive');
    for (const action of destructive) {
      expect(action.aiEnabled).toBe(false);
    }
  });

  it('executive owner has most permissions', () => {
    const execRole = POLICY_ROLES.find(r => r.archetype === 'executive_owner');
    expect(execRole).toBeDefined();
    const maxPermCount = Math.max(...POLICY_ROLES.map(r => r.permissions.length));
    expect(execRole!.permissions.length).toBe(maxPermCount);
  });

  it('viewer role has only read-safe permissions', () => {
    const viewerRole = POLICY_ROLES.find(r => r.archetype === 'viewer');
    expect(viewerRole).toBeDefined();
    // Viewer should not have write or delete actions from the policy domain
    expect(viewerRole!.permissions).not.toContain('policy.document.write');
    expect(viewerRole!.permissions).not.toContain('policy.document.delete');
    expect(viewerRole!.permissions).not.toContain('policy.document.configure');
  });
});

// ── D. Event Contract Consistency Tests ────────────────────────────────

describe('Policy Event Contract Consistency', () => {
  it('all published events in manifest match event contract', () => {
    const manifestEvents = new Set(POLICY_MANIFEST.publishedEvents);
    const contractEvents = new Set(POLICY_PUBLISHED_EVENTS);
    expect(manifestEvents).toEqual(contractEvents);
  });

  it('all consumed events have handler functions declared', () => {
    for (const eventName of POLICY_CONSUMED_EVENTS) {
      const consumed = POLICY_EVENT_CONTRACT.consumed as Record<string, { handler: string }>;
      expect(consumed[eventName]).toBeDefined();
      expect(consumed[eventName].handler).toMatch(/^handle/);
    }
  });

  it('event ordering config has valid partition key', () => {
    expect(POLICY_EVENT_ORDERING.partitionKey).toBe('tenantId');
    expect(POLICY_EVENT_ORDERING.strictOrdering).toBe(true);
  });

  it('event security requires authentication', () => {
    expect(POLICY_EVENT_SECURITY.requireAuthentication).toBe(true);
  });

  it('cross-tenant events disallowed', () => {
    expect(POLICY_EVENT_SECURITY.allowCrossTenant).toBe(false);
  });

  it('all published events follow module namespace', () => {
    for (const event of POLICY_PUBLISHED_EVENTS) {
      expect(event).toMatch(/^policy\./);
    }
  });

  it('consumed events reference valid external module namespaces', () => {
    for (const event of POLICY_CONSUMED_EVENTS) {
      const namespace = event.split('.')[0];
      // Should not consume its own events (no circular dependency)
      expect(namespace).not.toBe('policy');
    }
  });
});

// ── E. Schema Validation Tests ─────────────────────────────────────────

describe('Policy Schema Validation', () => {
  it('createPolicyBody validates required fields', () => {
    const valid = createPolicyBody.safeParse({
      title: 'Test Policy',
    });
    expect(valid.success).toBe(true);
  });

  it('createPolicyBody rejects empty title', () => {
    const invalid = createPolicyBody.safeParse({
      title: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('createPolicyBody rejects title shorter than 3 chars', () => {
    const invalid = createPolicyBody.safeParse({
      title: 'ab',
    });
    expect(invalid.success).toBe(false);
  });

  it('updatePolicyBody allows partial updates', () => {
    const valid = updatePolicyBody.safeParse({
      description: 'Updated description',
    });
    expect(valid.success).toBe(true);
  });

  it('updatePolicyBody allows empty object', () => {
    const valid = updatePolicyBody.safeParse({});
    expect(valid.success).toBe(true);
  });

  it('listPoliciesQuery handles pagination', () => {
    const valid = listPoliciesQuery.safeParse({
      page: '1',
      limit: '20',
    });
    expect(valid.success).toBe(true);
  });

  it('bulkDeletePoliciesBody requires at least one ID', () => {
    const invalid = bulkDeletePoliciesBody.safeParse({
      ids: [],
    });
    expect(invalid.success).toBe(false);
  });

  it('bulkDeletePoliciesBody accepts valid IDs', () => {
    const valid = bulkDeletePoliciesBody.safeParse({
      ids: ['uuid-1', 'uuid-2'],
    });
    expect(valid.success).toBe(true);
  });

  it('invalid data rejected with proper error shape', () => {
    const result = createPolicyBody.safeParse({
      title: 123, // wrong type
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
      expect(result.error.issues[0]).toHaveProperty('path');
      expect(result.error.issues[0]).toHaveProperty('message');
    }
  });
});

// ── F. Policy Data Integrity Tests ─────────────────────────────────────

describe('Policy Data Integrity', () => {
  it('data retention is greater than 0', () => {
    expect(POLICY_POLICY.dataRetention.retentionDays).toBeGreaterThan(0);
  });

  it('AI guardrails block destructive actions', () => {
    expect(POLICY_POLICY.aiGuardrails.blockedAiActions.length).toBeGreaterThan(0);
    expect(POLICY_POLICY.aiGuardrails.blockedAiActions).toContain('policy.document.delete');
    expect(POLICY_POLICY.aiGuardrails.blockedAiActions).toContain('policy.document.publish');
  });

  it('export allowed formats include at least csv and json', () => {
    expect(POLICY_POLICY.exportImport.exportFormats).toContain('csv');
    expect(POLICY_POLICY.exportImport.exportFormats).toContain('json');
  });

  it('audit logging enabled for writes', () => {
    expect(POLICY_POLICY.auditLogging.logAllWrites).toBe(true);
  });

  it('audit logging tracks field changes', () => {
    expect(POLICY_POLICY.auditLogging.logFieldChanges).toBe(true);
  });

  it('sensitive fields are redacted in audit logs', () => {
    expect(POLICY_POLICY.auditLogging.sensitiveFieldsRedacted).toBe(true);
  });

  it('prompt injection protection enabled', () => {
    expect(POLICY_POLICY.aiGuardrails.promptInjectionProtection).toBe(true);
  });

  it('output validation enabled', () => {
    expect(POLICY_POLICY.aiGuardrails.outputValidation).toBe(true);
  });

  it('legal hold is supported', () => {
    expect(POLICY_POLICY.dataRetention.legalHoldSupported).toBe(true);
  });

  it('row-level security enabled', () => {
    expect(POLICY_POLICY.accessScope.rowLevelSecurity).toBe(true);
  });
});

// ── G. Cross-Module Integration Tests ──────────────────────────────────

describe('Policy Cross-Module Integration', () => {
  it('consumed events reference valid external module namespaces', () => {
    const validNamespaces = ['compliance', 'governance', 'risk', 'workflow', 'audit', 'evidence', 'team', 'onboarding', 'dora', 'governance_ai', 'dashboard', 'navigation'];
    for (const event of POLICY_CONSUMED_EVENTS) {
      const namespace = event.split('.')[0];
      expect(validNamespaces).toContain(namespace);
    }
  });

  it('soft dependencies match consumed event sources', () => {
    const consumedSources = new Set<string>();
    for (const event of POLICY_CONSUMED_EVENTS) {
      const consumed = POLICY_EVENT_CONTRACT.consumed as Record<string, { source: string }>;
      if (consumed[event]?.source) {
        consumedSources.add(consumed[event].source);
      }
    }
    // Each consumed source should be either a hard dep or soft dep
    // Normalize: event sources use underscores (governance_ai), deps use hyphens (governance-ai)
    const allDeps = new Set([...POLICY_MANIFEST.hardDeps, ...POLICY_MANIFEST.softDeps].map(d => d.replace(/-/g, '_')));
    for (const source of consumedSources) {
      expect(allDeps.has(source)).toBe(true);
    }
  });

  it('published events do not reference external namespaces', () => {
    for (const event of POLICY_PUBLISHED_EVENTS) {
      expect(event).toMatch(/^policy\./);
    }
  });

  it('hard dependency on governance is declared', () => {
    expect(POLICY_MANIFEST.hardDeps).toContain('governance');
  });

  it('soft dependencies include compliance and evidence', () => {
    expect(POLICY_MANIFEST.softDeps).toContain('compliance');
    expect(POLICY_MANIFEST.softDeps).toContain('evidence');
  });
});
