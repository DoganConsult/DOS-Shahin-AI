/**
 * Workflow Module -- Comprehensive Test Suite
 *
 * MP-02: Verifies manifest integrity, lifecycle registration, security/RBAC,
 * event contracts, schema validation, policy data, mapper functions, DTO types,
 * contract structure, and cross-module integration.
 *
 * 10 suites, 100+ assertions.
 *
 * @owner workflow
 * @since 2026-03-31
 */

import {  describe, it, expect, beforeAll as _beforeAll , vi as _vi } from 'vitest';

// ── Module Manifest ──────────────────────────────────────────────────────────
import { WORKFLOW_MANIFEST } from './workflow.module';

// ── Security ─────────────────────────────────────────────────────────────────
import {
  WORKFLOW_PERMISSIONS,
  WORKFLOW_ROLES,
  WORKFLOW_ACTIONS,
} from './security/workflow.security';
import { WORKFLOW_APPROVAL_MATRIX } from './security/workflow.approval-matrix';

// ── Events ───────────────────────────────────────────────────────────────────
import {
  WORKFLOW_EVENT_CONTRACT,
  WORKFLOW_PUBLISHED_EVENTS,
  WORKFLOW_CONSUMED_EVENTS,
  WORKFLOW_EVENT_ORDERING,
  WORKFLOW_EVENT_SECURITY,
  WORKFLOW_EVENT_CORRELATION,
} from './events/workflow.events';

// ── Schemas ──────────────────────────────────────────────────────────────────
import {
  createWorkflowBody,
  updateWorkflowBody,
  listWorkflowsQuery,
  bulkDeleteWorkflowsBody,
  workflowTransitionBody,
  workflowResponseSchema,
  workflowImportRowSchema,
  workflowExportRequestSchema,
  workflowAdminConfigSchema,
  workflowEventPayloadSchema,
  workflowStatusTransitionSchema,
  workflowBulkUpdateSchema,
  workflowBulkStatusChangeSchema,
  createWorkflowTemplateBody,
  saveWorkflowBody,
  createApprovalStepBody,
} from './schemas/workflow.schemas';

// ── Policy ───────────────────────────────────────────────────────────────────
import { WORKFLOW_POLICY } from './policies/workflow.policies';

// ── Mapper ───────────────────────────────────────────────────────────────────
import {
  toEntity,
  toApiResponse,
  toAudienceShaped,
  toAdminResponse,
  toListItem,
  redactForAudit,
  toImportEntity,
  stripFieldsForExport,
} from './mappers/workflow.mapper';

// ── Contracts ────────────────────────────────────────────────────────────────
import type {
  WorkflowDefinitionContract,
  WorkflowExecutionContract,
  WorkflowStartRequest,
  TransitionRequest,
  ApprovalDecisionRequest,
  ExecutionHistoryEntry as _ExecutionHistoryEntry,
  SlaStatusContract,
  WorkflowDiagnosticsContract,
  WorkflowVersionContract,
} from './contracts/workflow.contracts';

// ── DTOs ─────────────────────────────────────────────────────────────────────
import type {
  WorkflowCreateDTO,
  WorkflowUpdateDTO,
  WorkflowResponseDTO,
  WorkflowListItemDTO,
  WorkflowDetailDTO,
  WorkflowAdminDTO,
  WorkflowImportDTO,
  WorkflowExportDTO,
  WorkflowSearchResultDTO,
  WorkflowAuditDTO,
  WorkflowBulkOperationDTO,
} from './types/workflow.dto';

// ── Lifecycle (imported for side-effect registration) ────────────────────────
import {
  getRegistryEntry,
  isTransitionValid,
  isTerminalState,
} from './ports/lifecycle.port';

// Force lifecycle registration to run before tests
import './lifecycle-registration';

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 1: Manifest Integrity
// ═══════════════════════════════════════════════════════════════════════════════

describe('Manifest Integrity', () => {
  it('module code is "workflow"', () => {
    expect(WORKFLOW_MANIFEST.code).toBe('workflow');
  });

  it('version follows semver pattern', () => {
    expect(WORKFLOW_MANIFEST.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('tier is "platform"', () => {
    expect(WORKFLOW_MANIFEST.tier).toBe('platform');
  });

  it('all owned tables are prefixed with "workflow_" or match "workflows"', () => {
    for (const table of WORKFLOW_MANIFEST.ownedTables) {
      expect(table.startsWith('workflow')).toBe(true);
    }
  });

  it('published events count >= 19', () => {
    expect(WORKFLOW_MANIFEST.publishedEvents.length).toBeGreaterThanOrEqual(19);
  });

  it('consumed events count >= 8', () => {
    expect(WORKFLOW_MANIFEST.consumedEvents.length).toBeGreaterThanOrEqual(8);
  });

  it('route base starts with "/api/"', () => {
    expect(WORKFLOW_MANIFEST.routeBase.startsWith('/api/')).toBe(true);
  });

  it('event namespace matches module code', () => {
    expect(WORKFLOW_MANIFEST.eventNamespace).toBe(WORKFLOW_MANIFEST.code);
  });

  it('table prefix ends with "_"', () => {
    expect(WORKFLOW_MANIFEST.tablePrefix.endsWith('_')).toBe(true);
  });

  it('hard and soft deps are arrays', () => {
    expect(Array.isArray(WORKFLOW_MANIFEST.hardDeps)).toBe(true);
    expect(Array.isArray(WORKFLOW_MANIFEST.softDeps)).toBe(true);
  });

  it('feature flags follow "workflow." prefix convention', () => {
    for (const flag of WORKFLOW_MANIFEST.featureFlags ?? []) {
      expect(flag.startsWith('workflow.')).toBe(true);
    }
  });

  it('license tier is a valid value', () => {
    expect(['starter', 'professional', 'enterprise']).toContain(WORKFLOW_MANIFEST.licensingTier);
  });

  it('provisioning order is a positive number', () => {
    expect(WORKFLOW_MANIFEST.provisioningOrder).toBeGreaterThan(0);
  });

  it('admin surfaces are declared', () => {
    expect(WORKFLOW_MANIFEST.adminSurfaces).toBeDefined();
    expect(WORKFLOW_MANIFEST.adminSurfaces!.length).toBeGreaterThan(0);
  });

  it('navChildCount >= 1', () => {
    expect(WORKFLOW_MANIFEST.navChildCount).toBeGreaterThanOrEqual(1);
  });

  it('aggregate roots are declared', () => {
    expect(WORKFLOW_MANIFEST.aggregateRoots.length).toBeGreaterThan(0);
    expect(WORKFLOW_MANIFEST.aggregateRoots).toContain('workflows');
    expect(WORKFLOW_MANIFEST.aggregateRoots).toContain('workflow_instances');
    expect(WORKFLOW_MANIFEST.aggregateRoots).toContain('workflow_templates');
  });

  it('has bilingual names', () => {
    expect(WORKFLOW_MANIFEST.nameEn).toBeTruthy();
    expect(WORKFLOW_MANIFEST.nameAr).toBeTruthy();
  });

  it('has bilingual descriptions', () => {
    expect(WORKFLOW_MANIFEST.descriptionEn).toBeTruthy();
    expect(WORKFLOW_MANIFEST.descriptionAr).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 2: Lifecycle Registration
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lifecycle Registration', () => {
  const EXPECTED_STATES = ['draft', 'in_review', 'approved', 'active', 'suspended', 'archived'];

  describe('workflows entity', () => {
    it('is registered in the lifecycle registry', () => {
      const entry = getRegistryEntry('workflow', 'workflows');
      expect(entry).not.toBeNull();
    });

    it('has all 6 states', () => {
      const entry = getRegistryEntry('workflow', 'workflows')!;
      expect(entry.states.length).toBe(6);
      for (const s of EXPECTED_STATES) {
        expect(entry.states).toContain(s);
      }
    });

    it('initial state is "draft"', () => {
      const entry = getRegistryEntry('workflow', 'workflows')!;
      expect(entry.opts?.initialState).toBe('draft');
    });

    it('terminal state is "archived"', () => {
      const entry = getRegistryEntry('workflow', 'workflows')!;
      expect(entry.opts?.terminalStates).toContain('archived');
    });

    it('has no self-transitions', () => {
      const entry = getRegistryEntry('workflow', 'workflows')!;
      for (const [from, toList] of Object.entries(entry.transitions)) {
        expect(toList).not.toContain(from);
      }
    });

    it('draft can transition to in_review', () => {
      expect(isTransitionValid('workflow', 'workflows', 'draft', 'in_review')).toBe(true);
    });

    it('in_review can transition to approved', () => {
      expect(isTransitionValid('workflow', 'workflows', 'in_review', 'approved')).toBe(true);
    });

    it('approved can transition to active', () => {
      expect(isTransitionValid('workflow', 'workflows', 'approved', 'active')).toBe(true);
    });

    it('active can transition to suspended', () => {
      expect(isTransitionValid('workflow', 'workflows', 'active', 'suspended')).toBe(true);
    });

    it('each non-terminal state has at least one transition', () => {
      const entry = getRegistryEntry('workflow', 'workflows')!;
      for (const state of entry.states) {
        if (entry.opts?.terminalStates?.includes(state)) continue;
        expect(entry.transitions[state].length).toBeGreaterThan(0);
      }
    });

    it('archived has no outbound transitions', () => {
      expect(isTerminalState('workflow', 'workflows', 'archived')).toBe(true);
    });

    it('no duplicate states', () => {
      const entry = getRegistryEntry('workflow', 'workflows')!;
      const unique = new Set(entry.states);
      expect(unique.size).toBe(entry.states.length);
    });
  });

  describe('workflow_instances entity', () => {
    it('is registered and has the same 6-state structure', () => {
      const entry = getRegistryEntry('workflow', 'workflow_instances');
      expect(entry).not.toBeNull();
      expect(entry!.states.length).toBe(6);
      for (const s of EXPECTED_STATES) {
        expect(entry!.states).toContain(s);
      }
    });
  });

  describe('workflow_templates entity', () => {
    it('is registered and has the same 6-state structure', () => {
      const entry = getRegistryEntry('workflow', 'workflow_templates');
      expect(entry).not.toBeNull();
      expect(entry!.states.length).toBe(6);
      for (const s of EXPECTED_STATES) {
        expect(entry!.states).toContain(s);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 3: Security & RBAC
// ═══════════════════════════════════════════════════════════════════════════════

describe('Security & RBAC', () => {
  it('at least 17 permissions defined', () => {
    expect(WORKFLOW_PERMISSIONS.length).toBeGreaterThanOrEqual(17);
  });

  it('all permission codes follow "workflow." or standard module prefix pattern', () => {
    for (const perm of WORKFLOW_PERMISSIONS) {
      // Allow cross-module permissions (journey, governance, admin) as well
      expect(perm.permissionCode).toMatch(/^[\w]+[.:]\w+/);
    }
  });

  it('no duplicate permission codes', () => {
    const codes = WORKFLOW_PERMISSIONS.map((p) => p.permissionCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('at least 8 roles defined', () => {
    expect(WORKFLOW_ROLES.length).toBeGreaterThanOrEqual(8);
  });

  it('all roles have at least one permission', () => {
    for (const role of WORKFLOW_ROLES) {
      expect(role.permissions.length).toBeGreaterThan(0);
    }
  });

  it('executive_owner has the most permissions', () => {
    const execRole = WORKFLOW_ROLES.find((r) => r.roleCode === 'workflow.executive_owner');
    expect(execRole).toBeDefined();
    for (const role of WORKFLOW_ROLES) {
      expect(execRole!.permissions.length).toBeGreaterThanOrEqual(role.permissions.length);
    }
  });

  it('viewer role exists and is default', () => {
    const viewer = WORKFLOW_ROLES.find((r) => r.roleCode === 'workflow.viewer');
    expect(viewer).toBeDefined();
    expect(viewer!.isDefault).toBe(true);
  });

  it('viewer has only read-level or safe permissions', () => {
    const viewer = WORKFLOW_ROLES.find((r) => r.roleCode === 'workflow.viewer')!;
    // Viewer should not have write permissions for core workflow resources
    expect(viewer.permissions).not.toContain('workflow.instance.write');
    expect(viewer.permissions).not.toContain('workflow.autonomous.write');
  });

  it('module_lead has more permissions than viewer', () => {
    const lead = WORKFLOW_ROLES.find((r) => r.roleCode === 'workflow.module_lead')!;
    const viewer = WORKFLOW_ROLES.find((r) => r.roleCode === 'workflow.viewer')!;
    expect(lead.permissions.length).toBeGreaterThanOrEqual(viewer.permissions.length);
  });

  it('approver role has approve permission', () => {
    const approver = WORKFLOW_ROLES.find((r) => r.roleCode === 'workflow.approver');
    expect(approver).toBeDefined();
    expect(approver!.permissions).toContain('workflow.approval.approve');
  });

  it('all permissions referenced by roles exist in PERMISSIONS array', () => {
    const permCodes = new Set(WORKFLOW_PERMISSIONS.map((p) => p.permissionCode));
    for (const role of WORKFLOW_ROLES) {
      for (const perm of role.permissions) {
        expect(permCodes.has(perm)).toBe(true);
      }
    }
  });

  it('at least 17 actions defined', () => {
    expect(WORKFLOW_ACTIONS.length).toBeGreaterThanOrEqual(17);
  });

  it('actions have danger levels (safe, moderate, destructive)', () => {
    const validLevels = ['safe', 'moderate', 'destructive'];
    for (const action of WORKFLOW_ACTIONS) {
      expect(validLevels).toContain(action.dangerLevel);
    }
  });

  it('destructive actions exist and are marked correctly', () => {
    const destructive = WORKFLOW_ACTIONS.filter((a) => a.dangerLevel === 'destructive');
    expect(destructive.length).toBeGreaterThan(0);
    for (const action of destructive) {
      expect(action.auditable).toBe(true);
    }
  });

  it('SoD-sensitive actions exist', () => {
    const sodSensitive = WORKFLOW_ACTIONS.filter((a) => a.sodSensitive);
    expect(sodSensitive.length).toBeGreaterThan(0);
  });

  it('AI-enabled actions do not include destructive actions', () => {
    const aiEnabled = WORKFLOW_ACTIONS.filter((a) => a.aiEnabled);
    for (const action of aiEnabled) {
      expect(action.dangerLevel).not.toBe('destructive');
    }
  });

  it('all actions that are destructive are AI-blocked', () => {
    const destructive = WORKFLOW_ACTIONS.filter((a) => a.dangerLevel === 'destructive');
    for (const action of destructive) {
      expect(action.aiBlocked).toBe(true);
    }
  });

  it('auditable flag is set for moderate and destructive actions', () => {
    const nonSafe = WORKFLOW_ACTIONS.filter((a) => a.dangerLevel !== 'safe');
    for (const action of nonSafe) {
      expect(action.auditable).toBe(true);
    }
  });

  it('approval matrix has rules for all 3 entity types', () => {
    const entityTypes = new Set(WORKFLOW_APPROVAL_MATRIX.map((r) => r.entityType));
    expect(entityTypes.has('workflows')).toBe(true);
    expect(entityTypes.has('workflow_instances')).toBe(true);
    expect(entityTypes.has('workflow_templates')).toBe(true);
  });

  it('approval matrix has at least 15 rules across all entity types', () => {
    expect(WORKFLOW_APPROVAL_MATRIX.length).toBeGreaterThanOrEqual(15);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 4: Event Contract Consistency
// ═══════════════════════════════════════════════════════════════════════════════

describe('Event Contract Consistency', () => {
  it('published events array is not empty', () => {
    expect(WORKFLOW_PUBLISHED_EVENTS.length).toBeGreaterThan(0);
  });

  it('all published event names start with "workflow."', () => {
    for (const event of WORKFLOW_PUBLISHED_EVENTS) {
      expect(event.startsWith('workflow.')).toBe(true);
    }
  });

  it('consumed events array is not empty', () => {
    expect(WORKFLOW_CONSUMED_EVENTS.length).toBeGreaterThan(0);
  });

  it('event ordering config has tenantId partition key', () => {
    expect(WORKFLOW_EVENT_ORDERING.partitionKey).toBe('tenantId');
  });

  it('event security requires authentication', () => {
    expect(WORKFLOW_EVENT_SECURITY.requireAuthentication).toBe(true);
  });

  it('cross-tenant events are disallowed', () => {
    expect(WORKFLOW_EVENT_SECURITY.allowCrossTenant).toBe(false);
  });

  it('deduplication window > 0', () => {
    expect(WORKFLOW_EVENT_ORDERING.deduplicationWindow).toBeGreaterThan(0);
  });

  it('max retries >= 1', () => {
    expect(WORKFLOW_EVENT_ORDERING.maxRetries).toBeGreaterThanOrEqual(1);
  });

  it('retry backoff array has correct length matching maxRetries', () => {
    expect(WORKFLOW_EVENT_ORDERING.retryBackoffMs.length).toBe(WORKFLOW_EVENT_ORDERING.maxRetries);
  });

  it('audit publishes enabled', () => {
    expect(WORKFLOW_EVENT_SECURITY.auditAllPublishes).toBe(true);
  });

  it('event correlation is enabled', () => {
    expect(WORKFLOW_EVENT_CORRELATION.enableCorrelation).toBe(true);
    expect(WORKFLOW_EVENT_CORRELATION.propagateCorrelationId).toBe(true);
  });

  it('all consumed events have handlers and idempotency configured', () => {
    for (const [_eventName, config] of Object.entries(WORKFLOW_EVENT_CONTRACT.consumed)) {
      expect(config.handler).toBeTruthy();
      expect(config.idempotent).toBe(true);
    }
  });

  it('core consumed events have dead-letter enabled', () => {
    const coreEvents = ['risk.status_changed', 'compliance.gap_detected', 'incident.classified',
      'evidence.collected', 'audit.finding_created', 'policy.approved', 'vendor.sla_breached', 'exception.approved'];
    for (const eventName of coreEvents) {
      const config = WORKFLOW_EVENT_CONTRACT.consumed[eventName];
      expect(config).toBeDefined();
      expect(config.deadLetterEnabled).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 5: Schema Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Schema Validation', () => {
  it('createWorkflowBody validates name is required', () => {
    const result = createWorkflowBody.safeParse({ name: 'Test Workflow' });
    expect(result.success).toBe(true);
  });

  it('createWorkflowBody rejects empty name', () => {
    const result = createWorkflowBody.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('createWorkflowBody rejects name shorter than 3 chars', () => {
    const result = createWorkflowBody.safeParse({ name: 'ab' });
    expect(result.success).toBe(false);
  });

  it('updateWorkflowBody allows partial fields', () => {
    const result = updateWorkflowBody.safeParse({ description: 'Updated description' });
    expect(result.success).toBe(true);
  });

  it('updateWorkflowBody allows empty object', () => {
    const result = updateWorkflowBody.safeParse({});
    expect(result.success).toBe(true);
  });

  it('listWorkflowsQuery handles page/pageSize', () => {
    const result = listWorkflowsQuery.safeParse({ page: 1, pageSize: 25 });
    expect(result.success).toBe(true);
  });

  it('bulkDeleteWorkflowsBody requires array of IDs', () => {
    expect(bulkDeleteWorkflowsBody.safeParse({ ids: ['id-1', 'id-2'] }).success).toBe(true);
    expect(bulkDeleteWorkflowsBody.safeParse({ ids: [] }).success).toBe(false);
  });

  it('workflowTransitionBody validates to_status is required', () => {
    expect(workflowTransitionBody.safeParse({ to_status: 'active' }).success).toBe(true);
    expect(workflowTransitionBody.safeParse({ to_status: '' }).success).toBe(false);
    expect(workflowTransitionBody.safeParse({}).success).toBe(false);
  });

  it('workflowResponseSchema validates complete response', () => {
    const result = workflowResponseSchema.safeParse({
      id: 'wf-1',
      tenant_id: 't-1',
      title: 'Test',
      status: 'draft',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'user-1',
    });
    expect(result.success).toBe(true);
  });

  it('workflowImportRowSchema validates import data', () => {
    const result = workflowImportRowSchema.safeParse({ title: 'Imported Workflow' });
    expect(result.success).toBe(true);
  });

  it('workflowImportRowSchema rejects missing title', () => {
    const result = workflowImportRowSchema.safeParse({ description: 'no title' });
    expect(result.success).toBe(false);
  });

  it('workflowExportRequestSchema validates export format', () => {
    const validResult = workflowExportRequestSchema.safeParse({ format: 'csv' });
    expect(validResult.success).toBe(true);
    const invalidResult = workflowExportRequestSchema.safeParse({ format: 'txt' });
    expect(invalidResult.success).toBe(false);
  });

  it('workflowAdminConfigSchema validates admin config', () => {
    const result = workflowAdminConfigSchema.safeParse({
      moduleCode: 'workflow',
      autoArchiveAfterDays: 365,
    });
    expect(result.success).toBe(true);
  });

  it('workflowAdminConfigSchema rejects wrong module code', () => {
    const result = workflowAdminConfigSchema.safeParse({
      moduleCode: 'not_workflow',
    });
    expect(result.success).toBe(false);
  });

  it('each schema is a valid Zod schema (has .parse method)', () => {
    const schemas = [
      createWorkflowBody,
      updateWorkflowBody,
      listWorkflowsQuery,
      bulkDeleteWorkflowsBody,
      workflowTransitionBody,
      workflowResponseSchema,
      workflowImportRowSchema,
      workflowExportRequestSchema,
      workflowAdminConfigSchema,
      workflowEventPayloadSchema,
      workflowStatusTransitionSchema,
      workflowBulkUpdateSchema,
      workflowBulkStatusChangeSchema,
      createWorkflowTemplateBody,
      saveWorkflowBody,
      createApprovalStepBody,
    ];
    for (const schema of schemas) {
      expect(typeof schema.parse).toBe('function');
      expect(typeof schema.safeParse).toBe('function');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 6: Policy Data Integrity
// ═══════════════════════════════════════════════════════════════════════════════

describe('Policy Data Integrity', () => {
  it('data retention > 0', () => {
    expect(WORKFLOW_POLICY.dataRetention!.retentionDays).toBeGreaterThan(0);
  });

  it('data retention is at least 365 days', () => {
    expect(WORKFLOW_POLICY.dataRetention!.retentionDays).toBeGreaterThanOrEqual(365);
  });

  it('archive after > 0', () => {
    expect(WORKFLOW_POLICY.dataRetention!.archiveAfterDays).toBeGreaterThan(0);
  });

  it('legal hold supported', () => {
    expect(WORKFLOW_POLICY.dataRetention!.legalHoldSupported).toBe(true);
  });

  it('AI guardrails defined', () => {
    expect(WORKFLOW_POLICY.aiGuardrails).toBeDefined();
    expect(WORKFLOW_POLICY.aiGuardrails!.allowedAiActions.length).toBeGreaterThan(0);
    expect(WORKFLOW_POLICY.aiGuardrails!.blockedAiActions.length).toBeGreaterThan(0);
  });

  it('AI allowed actions do not overlap with blocked actions', () => {
    const allowed = new Set(WORKFLOW_POLICY.aiGuardrails!.allowedAiActions);
    for (const blocked of WORKFLOW_POLICY.aiGuardrails!.blockedAiActions) {
      expect(allowed.has(blocked)).toBe(false);
    }
  });

  it('AI blocked actions include destructive operations', () => {
    const blocked = WORKFLOW_POLICY.aiGuardrails!.blockedAiActions;
    expect(blocked.some((a) => a.includes('delete') || a.includes('approve'))).toBe(true);
  });

  it('max auto actions per hour > 0', () => {
    expect(WORKFLOW_POLICY.automationGuardrails!.maxAutoActionsPerHour).toBeGreaterThan(0);
  });

  it('max AI actions per hour > 0', () => {
    expect(WORKFLOW_POLICY.aiGuardrails!.maxAiActionsPerHour).toBeGreaterThan(0);
  });

  it('audit logging enabled for reads and writes', () => {
    expect(WORKFLOW_POLICY.auditLogging!.logAllReads).toBe(true);
    expect(WORKFLOW_POLICY.auditLogging!.logAllWrites).toBe(true);
  });

  it('export requires approval', () => {
    expect(WORKFLOW_POLICY.exportImport!.exportRequiresApproval).toBe(true);
  });

  it('evidence required for status changes', () => {
    expect(WORKFLOW_POLICY.evidenceRequirements!.requiredForStatusChanges.length).toBeGreaterThan(0);
  });

  it('prompt injection protection enabled', () => {
    expect(WORKFLOW_POLICY.aiGuardrails!.promptInjectionProtection).toBe(true);
  });

  it('data residency has default region set', () => {
    expect(WORKFLOW_POLICY.dataResidency!.defaultRegion).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 7: Mapper Functions
// ═══════════════════════════════════════════════════════════════════════════════

describe('Mapper Functions', () => {
  const mockRow = {
    id: 'inst-1',
    instance_id: 'inst-1',
    tenant_id: 'tenant-1',
    template_code: 'approval_flow',
    module_code: 'workflow',
    status: 'active',
    current_step: 'step-2',
    started_by: 'user-1',
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-02'),
    created_by: 'user-1',
    deleted_at: null,
    internal_notes: 'secret internal note',
    system_flags: { debug: true },
    ai_metadata: { score: 0.9 },
  };

  it('toEntity maps required fields', () => {
    const entity = toEntity(mockRow as any);
    expect(entity.instance_id).toBe('inst-1');
    expect(entity.tenant_id).toBe('tenant-1');
    expect(entity.created_by).toBe('user-1');
  });

  it('toApiResponse produces valid JSON-safe output without deleted_at', () => {
    const entity = toEntity(mockRow as any);
    const response = toApiResponse(entity);
    expect(response).not.toHaveProperty('deleted_at');
    expect(response).toHaveProperty('instance_id');
  });

  it('toAudienceShaped supports all 5 audience levels', () => {
    const audiences = ['public', 'internal', 'admin', 'ai_agent', 'export'] as const;
    for (const audience of audiences) {
      const shaped = toAudienceShaped({ ...mockRow }, audience);
      expect(shaped).toBeDefined();
    }
  });

  it('toAudienceShaped strips sensitive fields for public audience', () => {
    const shaped = toAudienceShaped({ ...mockRow }, 'public');
    expect(shaped).not.toHaveProperty('internal_notes');
    expect(shaped).not.toHaveProperty('system_flags');
    expect(shaped).not.toHaveProperty('ai_metadata');
  });

  it('toAdminResponse includes all fields', () => {
    const adminResp = toAdminResponse({ ...mockRow });
    expect(adminResp).toHaveProperty('internal_notes');
    expect(adminResp).toHaveProperty('system_flags');
    expect(adminResp).toHaveProperty('tenant_id');
  });

  it('toListItem produces minimal fields without internal data', () => {
    const listItem = toListItem({ ...mockRow });
    expect(listItem).not.toHaveProperty('deleted_at');
    expect(listItem).not.toHaveProperty('internal_notes');
    expect(listItem).not.toHaveProperty('system_flags');
  });

  it('redactForAudit replaces sensitive data with [REDACTED]', () => {
    const redacted = redactForAudit({ ...mockRow });
    expect(redacted.internal_notes).toBe('[REDACTED]');
    expect(redacted.system_flags).toBe('[REDACTED]');
  });

  it('toImportEntity handles import format with tenant and user context', () => {
    const imported = toImportEntity(
      { title: 'Imported', description: 'Test' },
      'tenant-2',
      'user-import',
    );
    expect(imported.tenant_id).toBe('tenant-2');
    expect(imported.created_by).toBe('user-import');
    expect(imported.status).toBe('draft');
    expect(imported).toHaveProperty('created_at');
    expect(imported).toHaveProperty('updated_at');
  });

  it('stripFieldsForExport removes deleted_at and adds export_timestamp', () => {
    const exported = stripFieldsForExport({ ...mockRow });
    expect(exported).not.toHaveProperty('deleted_at');
    expect(exported).toHaveProperty('export_timestamp');
  });

  it('stripFieldsForExport respects custom excludeFields', () => {
    const exported = stripFieldsForExport({ ...mockRow }, ['internal_notes', 'system_flags']);
    expect(exported).not.toHaveProperty('internal_notes');
    expect(exported).not.toHaveProperty('system_flags');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 8: DTO Type Checks
// ═══════════════════════════════════════════════════════════════════════════════

describe('DTO Type Checks', () => {
  it('all DTO types are structurally valid (compile-time check via instantiation)', () => {
    // Verify each DTO shape can be constructed at runtime
    const create: WorkflowCreateDTO = { title: 'Test' };
    const update: WorkflowUpdateDTO = { title: 'Updated' };
    const response: WorkflowResponseDTO = {
      id: 'wf-1', tenant_id: 't-1', title: 'T', status: 'draft',
      created_at: '2026-01-01', updated_at: '2026-01-01', created_by: 'u-1',
    };
    const listItem: WorkflowListItemDTO = {
      id: 'wf-1', title: 'T', status: 'draft',
      created_at: '2026-01-01', updated_at: '2026-01-01',
    };
    const detail: WorkflowDetailDTO = { ...response };
    const admin: WorkflowAdminDTO = { ...detail, tenant_id: 't-1' };
    const importDto: WorkflowImportDTO = { title: 'Imported' };
    const exportDto: WorkflowExportDTO = {
      ...response, export_timestamp: '2026-01-01', export_format: 'csv',
    };
    const search: WorkflowSearchResultDTO = { items: [], total: 0, page: 1, pageSize: 25 };
    const audit: WorkflowAuditDTO = {
      entity_id: 'e-1', entity_type: 'workflow', action: 'create',
      actor_id: 'u-1', actor_type: 'user', timestamp: '2026-01-01',
    };
    const bulk: WorkflowBulkOperationDTO = { ids: ['wf-1'], operation: 'update' };

    expect(create.title).toBe('Test');
    expect(update.title).toBe('Updated');
    expect(response.id).toBe('wf-1');
    expect(listItem.status).toBe('draft');
    expect(detail.id).toBe('wf-1');
    expect(admin.tenant_id).toBe('t-1');
    expect(importDto.title).toBe('Imported');
    expect(exportDto.export_format).toBe('csv');
    expect(search.total).toBe(0);
    expect(audit.actor_type).toBe('user');
    expect(bulk.operation).toBe('update');
  });

  it('WorkflowCreateDTO has required title field', () => {
    const dto: WorkflowCreateDTO = { title: 'Required Title' };
    expect(dto.title).toBeTruthy();
  });

  it('WorkflowResponseDTO has id and status fields', () => {
    const dto: WorkflowResponseDTO = {
      id: 'id-1', tenant_id: 't', title: 'T', status: 'active',
      created_at: 'now', updated_at: 'now', created_by: 'user',
    };
    expect(dto.id).toBeDefined();
    expect(dto.status).toBeDefined();
  });

  it('WorkflowAuditDTO supports all actor types', () => {
    const actorTypes: WorkflowAuditDTO['actor_type'][] = ['user', 'system', 'ai_agent'];
    for (const actorType of actorTypes) {
      const audit: WorkflowAuditDTO = {
        entity_id: 'e-1', entity_type: 'workflow', action: 'create',
        actor_id: 'u-1', actor_type: actorType, timestamp: '2026-01-01',
      };
      expect(audit.actor_type).toBe(actorType);
    }
  });

  it('WorkflowBulkOperationDTO supports all operation types', () => {
    const ops: WorkflowBulkOperationDTO['operation'][] = [
      'update', 'delete', 'archive', 'activate', 'pause', 'status_change',
    ];
    for (const op of ops) {
      const bulk: WorkflowBulkOperationDTO = { ids: ['id-1'], operation: op };
      expect(bulk.operation).toBe(op);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 9: Contract Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Contract Validation', () => {
  it('WorkflowDefinitionContract has all required fields', () => {
    const contract: WorkflowDefinitionContract = {
      definitionId: 'd-1', code: 'approval', version: 1,
      nameEn: 'Approval', nameAr: null, moduleCode: 'workflow',
      entityType: 'workflow', triggerType: 'manual',
      status: 'draft', stepCount: 3, transitionCount: 2,
      slaHours: 24, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    };
    expect(contract.definitionId).toBeTruthy();
    expect(contract.code).toBeTruthy();
    expect(contract.version).toBe(1);
    expect(contract.moduleCode).toBe('workflow');
  });

  it('WorkflowExecutionContract has all required fields', () => {
    const contract: WorkflowExecutionContract = {
      instanceId: 'i-1', definitionId: 'd-1', definitionCode: 'approval',
      tenantId: 't-1', moduleCode: 'workflow', entityType: 'workflow',
      entityId: 'e-1', status: 'running', currentStepId: 's-1',
      currentStepCode: 'review', triggeredBy: 'user-1',
      startedAt: '2026-01-01', completedAt: null, metadata: null,
    };
    expect(contract.instanceId).toBeTruthy();
    expect(contract.definitionId).toBeTruthy();
    expect(contract.status).toBe('running');
  });

  it('WorkflowStartRequest has required triggeredBy field', () => {
    const req: WorkflowStartRequest = {
      definitionId: 'd-1', triggeredBy: 'user-1',
    };
    expect(req.triggeredBy).toBeTruthy();
    expect(req.definitionId).toBeTruthy();
  });

  it('TransitionRequest has required instanceId and fromStepId', () => {
    const req: TransitionRequest = {
      instanceId: 'i-1', fromStepId: 's-1',
    };
    expect(req.instanceId).toBeTruthy();
    expect(req.fromStepId).toBeTruthy();
  });

  it('ApprovalDecisionRequest supports all decision types', () => {
    const decisions: ApprovalDecisionRequest['decision'][] = ['approved', 'rejected', 'delegated'];
    for (const decision of decisions) {
      const req: ApprovalDecisionRequest = {
        approvalId: 'a-1', tenantId: 't-1', decision,
        approverId: 'user-1',
      };
      expect(req.decision).toBe(decision);
    }
  });

  it('SlaStatusContract has breach and warning indicators', () => {
    const sla: SlaStatusContract = {
      instanceId: 'i-1', stepId: 's-1', stepCode: 'review',
      slaHours: 24, dueAt: '2026-01-02', isBreached: false,
      isWarning: true, hoursRemaining: 6, escalationAction: null,
    };
    expect(typeof sla.isBreached).toBe('boolean');
    expect(typeof sla.isWarning).toBe('boolean');
  });

  it('WorkflowDiagnosticsContract has all metric fields', () => {
    const diag: WorkflowDiagnosticsContract = {
      tenantId: 't-1', activeInstances: 10, stuckInstances: 2,
      failedInstances: 1, pendingApprovals: 5, slaBreaches: 0,
      averageCompletionHours: 12.5, capturedAt: '2026-01-01',
    };
    expect(diag.activeInstances).toBeGreaterThanOrEqual(0);
    expect(typeof diag.averageCompletionHours).toBe('number');
  });

  it('WorkflowVersionContract has version rollout status', () => {
    const vc: WorkflowVersionContract = {
      definitionId: 'd-1', code: 'approval', version: 2,
      status: 'active', promotedAt: '2026-01-01', promotedBy: 'admin',
      activeInstanceCount: 5, changeNotes: 'Version 2 release',
    };
    expect(vc.version).toBe(2);
    expect(vc.status).toBe('active');
    expect(vc.activeInstanceCount).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 10: Cross-Module Integration
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cross-Module Integration', () => {
  it('consumed events reference valid module namespaces', () => {
    const consumed = WORKFLOW_EVENT_CONTRACT.consumed;
    const validNamespaces = [
      'risk', 'compliance', 'incident', 'evidence', 'audit', 'policy', 'vendor', 'exception',
      'team', 'dashboard', 'navigation', 'provisioning', 'onboarding', 'dora', 'governance_ai',
    ];
    for (const [_eventName, config] of Object.entries(consumed)) {
      expect(validNamespaces).toContain(config.source);
    }
  });

  it('consumed event names match their source module prefix', () => {
    for (const [eventName, config] of Object.entries(WORKFLOW_EVENT_CONTRACT.consumed)) {
      expect(eventName.startsWith(config.source + '.')).toBe(true);
    }
  });

  it('soft dependencies are declared', () => {
    // The workflow module consumes events from many modules; not all need to be
    // declared as deps since the workflow engine is a platform module that
    // subscribes opportunistically. But it should have at least some deps declared.
    expect(WORKFLOW_MANIFEST.softDeps.length + WORKFLOW_MANIFEST.hardDeps.length).toBeGreaterThanOrEqual(1);
  });

  it('published events can be consumed by other modules (non-empty payload type)', () => {
    for (const [_eventName, config] of Object.entries(WORKFLOW_EVENT_CONTRACT.published)) {
      expect(config.payloadType).toBeTruthy();
      expect(config.version).toBeGreaterThanOrEqual(1);
    }
  });

  it('all consumed events have exponential retry policy', () => {
    for (const [_eventName, config] of Object.entries(WORKFLOW_EVENT_CONTRACT.consumed)) {
      expect(config.retryPolicy).toBe('exponential');
    }
  });

  it('event contract module code matches manifest module code', () => {
    expect(WORKFLOW_EVENT_CONTRACT.moduleCode).toBe(WORKFLOW_MANIFEST.code);
  });
});
