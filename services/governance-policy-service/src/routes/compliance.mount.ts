import { Router, type Request, type Router as ExpressRouter } from 'express';

export interface CreateComplianceMountedRouterDeps {
  registerCompliance: (options: Record<string, unknown>) => unknown;
  db: {
    getPool?: () => { query: (sql: string, params?: unknown[]) => Promise<unknown> };
    pool?: { query: (sql: string, params?: unknown[]) => Promise<unknown> };
    tenantSchema?: (tenantId: string) => string;
  };
  dauth: {
    getAuthzEvaluator?: () => { evaluate: (input: Record<string, unknown>) => Promise<{ decision?: string } | null> } | null;
    optionalAuthenticate?: (req: Request, res: unknown, next: (err?: unknown) => void) => void;
  };
}

export function createComplianceMountedRouter(deps: CreateComplianceMountedRouterDeps): ExpressRouter | null {
  const pool = typeof deps.db.getPool === 'function' ? deps.db.getPool() : deps.db.pool;
  if (!pool) return null;

  const resolveContext = async (req: any) => {
    const user = req.user as Record<string, unknown> | undefined;
    if (!user) throw new Error('no_user');

    const userId = (user.userId ?? user.id) as string | undefined;
    if (!userId) throw new Error('no_user_id');

    const tenantId = (req.tenantId ?? user.tenantId ?? req.headers?.['x-tenant-id']) as string | undefined;
    if (!tenantId) throw new Error('no_tenant_id');

    const schema =
      typeof deps.db.tenantSchema === 'function'
        ? deps.db.tenantSchema(tenantId)
        : `tenant_${tenantId}`;

    const permissions = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];

    const isSuperAdmin = user.is_super_admin === true || user.isSuperAdmin === true;
    const isOwner = user.role === 'owner' || user.is_tenant_owner === true || user.isTenantOwner === true;

    const hasPermission = async (permissionCode: string): Promise<boolean> => {
      if (isSuperAdmin || isOwner) return true;
      const evaluator = typeof deps.dauth.getAuthzEvaluator === 'function' ? deps.dauth.getAuthzEvaluator() : null;
      if (!evaluator) return permissions.includes(permissionCode);
      const correlationId =
        (req.headers?.['x-correlation-id'] as string | undefined) ??
        (req.headers?.['x-request-id'] as string | undefined);
      const verdict = await evaluator.evaluate({
        userId,
        tenantId,
        role: (user.role ?? '') as string,
        roles: Array.isArray(user.roles) ? (user.roles as string[]) : undefined,
        isSuperAdmin,
        permissionCode,
        ip: req.ip,
        path: req.path,
        attributes: { permissions },
        correlationId,
      });
      return verdict?.decision === 'allow';
    };

    return { tenantId, userId, tenantSchema: schema, permissions, hasPermission };
  };

  const commonCrudDeps = { client: pool, resolveContext };
  const depsKeys = [
    'controlsDeps',
    'frameworksDeps',
    'obligationsDeps',
    'assessmentsDeps',
    'requirementsDeps',
    'gapsDeps',
    'attestationsDeps',
    'exceptionsDeps',
    'evidenceLinksDeps',
    'regulatoryChangesDeps',
    'monitoringDeps',
    'postureScoresDeps',
    'roadmapDeps',
    'calendarDeps',
    'programsDeps',
    'controlsMappingDeps',
    'kpisDeps',
    'settingsDeps',
    'attachmentsDeps',
    'commentsDeps',
    'tagsDeps',
    'changeLogDeps',
    'externalMappingsDeps',
    'reportSnapshotsDeps',
    'aiSuggestionsDeps',
    'versionsDeps',
    'controlDeficienciesDeps',
    'controlEffectivenessDeps',
    'controlScopeTagsDeps',
    'controlTestSchedulesDeps',
    'attestationCampaignsDeps',
    'attestationRecordsDeps',
    'attestationDraftsDeps',
    'csaCampaignsDeps',
    'csaResponsesDeps',
    'ucfControlsDeps',
    'crosswalkMappingsDeps',
    'sodConflictMatrixDeps',
    'entitiesDeps',
    'findingsDeps',
    'evidenceFilesDeps',
    'workspacesDeps',
    'instrumentStructureDeps',
    'sectorsDeps',
    'frameworkSectorApplicabilityDeps',
    'regulatorBulletinsDeps',
    'submissionPacketsDeps',
    'bilingualContentDeps',
    'complianceUniverseDeps',
    'complianceCalculatorDeps',
    'contentPackLoaderDeps',
    'driftDetectorDeps',
    'eventPublisherDeps',
    'sodRuntimeDeps',
    'findingsRemediationBridgeDeps',
    'approvalMatrixRuntimeDeps',
    'outboxDispatcherJobDeps',
    'retryBackoffPolicyDeps',
    'deadLetterQueueDeps',
    'retentionPolicyDeps',
    'notificationDispatcherDeps',
    'workflowRuntimeDeps',
    'outboxArchiveDeps',
    'schemaMigrationTrackerDeps',
    'auditLogStreamDeps',
    'scheduledJobsRunnerDeps',
    'webhookSubscriptionsDeps',
    'idempotencyKeysDeps',
    'featureFlagsDeps',
    'apiKeysDeps',
    'rateLimitPoliciesDeps',
  ];

  const options: Record<string, unknown> = {
    healthDeps: {},
    foundation: {
      async writeAudit(entry: any) {
        const createdAt = entry?.occurredAt ? new Date(entry.occurredAt) : new Date();
        const payload = {
          before: entry?.before ?? null,
          after: entry?.after ?? null,
          meta: entry?.meta ?? null,
        };
        await pool.query(
          `INSERT INTO dos.audit_trail
             (tenant_id, actor_id, action, entity_type, entity_id, module, payload, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            entry?.tenantId ?? null,
            entry?.actorId ?? null,
            entry?.action ?? 'unknown',
            entry?.resourceType ?? null,
            entry?.resourceId ?? null,
            entry?.module ?? null,
            payload,
            createdAt,
          ],
        );
      },
    },
    aiDeps: {
      resolveContext: async (req: any) => {
        const ctx = await resolveContext(req);
        return { tenantId: ctx.tenantId, userId: ctx.userId };
      },
    },
  };

  for (const k of depsKeys) options[k] = commonCrudDeps;

  const result: any = deps.registerCompliance(options);
  const innerRouter: ExpressRouter | null = result?.router ?? result ?? null;
  if (!innerRouter) return null;

  const outer = Router();
  const optionalAuth = deps.dauth.optionalAuthenticate;
  outer.use(typeof optionalAuth === 'function' ? optionalAuth : (_req, _res, next) => next());
  outer.use(innerRouter);
  return outer;
}

