// ============================================
// Shahin-Ai — Regulatory Change Impact Assessment
// Function 10: Given regulation changes (diffs),
// identify affected controls, obligations, and
// owners. Generate suggested action items and
// emit events for task creation.
// ============================================

import { v4 as uuid } from "uuid";
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getDiffResults, getAffectedEntities } from "../misc/regulation-diff.service";
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ============================================================================
// Types
// ============================================================================

export interface AffectedControl {
  controlId: string;
  controlTitle: string;
  /** Clause reference that triggered the impact */
  clauseRef: string;
  /** Current control status */
  currentStatus: string;
  /** Required action */
  requiredAction: "update" | "review" | "retire" | "create";
}

export interface AffectedObligation {
  obligationId: string;
  obligationTitle: string;
  clauseRef: string;
  currentStatus: string;
  requiredAction: "update" | "review" | "archive" | "create";
}

export interface AffectedOwner {
  ownerId: string;
  ownerName: string;
  /** Number of controls owned that are affected */
  affectedControlCount: number;
  /** Number of obligations owned that are affected */
  affectedObligationCount: number;
  /** Combined impact severity for this owner */
  ownerImpactSeverity: "critical" | "high" | "medium" | "low";
}

export interface SuggestedAction {
  actionId: string;
  /** Target entity type and ID */
  entityType: "control" | "obligation";
  entityId: string;
  entityTitle: string;
  /** Assigned owner */
  ownerId: string | null;
  ownerName: string | null;
  /** Action description in English */
  actionEn: string;
  /** Action description in Arabic */
  actionAr: string;
  /** Priority of the action */
  priority: "critical" | "high" | "medium" | "low";
  /** Suggested deadline in days */
  suggestedDeadlineDays: number;
}

export interface ImpactAssessmentResult {
  diffId: string;
  affectedControls: AffectedControl[];
  affectedObligations: AffectedObligation[];
  affectedOwners: AffectedOwner[];
  suggestedActions: SuggestedAction[];
  impactSeverity: "critical" | "high" | "medium" | "low";
}

// ============================================================================
// Table Initialization
// ============================================================================

let tablesInitialized = false;

async function ensureTables(tenantId: string): Promise<void> {
  if (tablesInitialized) return;
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".regulatory_impact_assessments (
      assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      diff_id UUID NOT NULL,
      affected_controls JSONB DEFAULT '[]',
      affected_obligations JSONB DEFAULT '[]',
      affected_owners JSONB DEFAULT '[]',
      suggested_actions JSONB DEFAULT '[]',
      impact_severity VARCHAR(20) DEFAULT 'low',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reg_impact_diff_id
      ON "${schema}".regulatory_impact_assessments (diff_id);

    CREATE TABLE IF NOT EXISTS "${schema}".regulatory_impact_actions (
      action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      diff_id UUID NOT NULL,
      entity_type VARCHAR(30) NOT NULL,
      entity_id UUID NOT NULL,
      entity_title TEXT,
      owner_id UUID,
      action_en TEXT NOT NULL,
      action_ar TEXT,
      priority VARCHAR(20) DEFAULT 'medium',
      suggested_deadline_days INTEGER DEFAULT 30,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_reg_impact_actions_diff_id
      ON "${schema}".regulatory_impact_actions (diff_id);
    CREATE INDEX IF NOT EXISTS idx_reg_impact_actions_owner
      ON "${schema}".regulatory_impact_actions (owner_id, status);
  `);

  tablesInitialized = true;
}

// ============================================================================
// Impact Severity Calculation
// ============================================================================

/**
 * Determine deadline days based on impact severity and action type.
 */
function getDeadlineDays(
  severity: "critical" | "high" | "medium" | "low",
  action: string,
): number {
  const deadlineMap: Record<string, Record<string, number>> = {
    critical: { update: 7, review: 14, retire: 7, create: 14 },
    high: { update: 14, review: 21, retire: 14, create: 21 },
    medium: { update: 30, review: 30, retire: 30, create: 45 },
    low: { update: 45, review: 60, retire: 60, create: 60 },
  };
  return deadlineMap[severity]?.[action] || 30;
}

/**
 * Compute impact severity for an individual owner based on their affected entities.
 */
function computeOwnerSeverity(
  controlCount: number,
  obligationCount: number,
): "critical" | "high" | "medium" | "low" {
  const total = controlCount + obligationCount;
  if (total >= 10) return "critical";
  if (total >= 5) return "high";
  if (total >= 2) return "medium";
  return "low";
}

// ============================================================================
// Core Impact Assessment
// ============================================================================

/**
 * Assess the impact of regulatory changes identified by a diff.
 *
 * Traverses the linkage graph:
 *   Changed clauses -> Linked obligations -> Linked controls -> Control owners
 *
 * Generates action items for each affected owner and classifies
 * overall impact severity.
 *
 * @param tenantId - Tenant identifier for schema scoping
 * @param diffId   - UUID of the regulation diff to assess
 * @returns Impact assessment with affected entities, owners, and suggested actions
 */
export async function assessChangeImpact(
  tenantId: string,
  diffId: string,
): Promise<ImpactAssessmentResult> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  // Step 1: Retrieve the diff result
  const diff = await getDiffResults(tenantId, diffId);

  // Step 2: Get affected entities from the diff
  const affectedEntitiesRaw = await getAffectedEntities(tenantId, diffId);

  // Step 3: Build affected controls list with current status
  const affectedControls: AffectedControl[] = [];
  for (const entity of affectedEntitiesRaw.filter((e) => e.entityType === "control")) {
    const controlResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT control_id, title, status, owner_id
       FROM "${schema}".controls
       WHERE control_id = $1`,
      [entity.entityId],
    ), { tenantId: tenantId, operation: 'query controls' });

    const control = controlResult.rows[0];
    const requiredAction = mapImpactToControlAction(entity.impactType);

    affectedControls.push({
      controlId: entity.entityId,

      controlTitle: control?.title || entity.entityTitle || "Unknown",
      clauseRef: entity.clauseRef,

      currentStatus: control?.status || "any",
      requiredAction,
    });
  }

  // Step 4: Build affected obligations list with current status
  const affectedObligations: AffectedObligation[] = [];
  for (const entity of affectedEntitiesRaw.filter((e) => e.entityType === "obligation")) {
    const oblResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT obligation_id, title_en, status, owner_id
       FROM "${schema}".compliance_obligations
       WHERE obligation_id = $1 AND deleted_at IS NULL`,
      [entity.entityId],
    ), { tenantId: tenantId, operation: 'query compliance_obligations' });

    const obl = oblResult.rows[0];
    const requiredAction = mapImpactToObligationAction(entity.impactType);

    affectedObligations.push({
      obligationId: entity.entityId,

      obligationTitle: obl?.title_en || entity.entityTitle || "Unknown",
      clauseRef: entity.clauseRef,

      currentStatus: obl?.status || "any",
      requiredAction,
    });
  }

  // Step 5: Identify affected owners by traversing controls and obligations
  const ownerMap = new Map<
    string,
    { ownerName: string; controlCount: number; obligationCount: number }
  >();

  // Gather owners from affected controls
  for (const control of affectedControls) {
    const ownerResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT owner_id, title, status FROM "${schema}".controls WHERE control_id = $1`,
      [control.controlId],
    ), { tenantId: tenantId, operation: 'query controls' });

    const ownerId = ownerResult.rows[0]?.owner_id;
    if (ownerId) {
      const existing = ownerMap.get((ownerId as any)) || {
        ownerName: "",
        controlCount: 0,
        obligationCount: 0,
      };
      existing.controlCount++;

      // Resolve owner name
      if (!existing.ownerName) {
        const userResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT full_name, email FROM "${schema}".users WHERE user_id = $1`,
          [ownerId],
        ), { tenantId: tenantId, operation: 'query users' });
        (existing as any).ownerName =
          userResult.rows[0]?.full_name || userResult.rows[0]?.email || ownerId;
      }

      ownerMap.set((ownerId as any), existing);
    }
  }

  // Gather owners from affected obligations
  for (const obl of affectedObligations) {
    const oblResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT owner_id FROM "${schema}".compliance_obligations WHERE obligation_id = $1`,
      [obl.obligationId],
    ), { tenantId: tenantId, operation: 'query compliance_obligations' });

    const ownerId = oblResult.rows[0]?.owner_id;
    if (ownerId) {
      const existing = ownerMap.get((ownerId as any)) || {
        ownerName: "",
        controlCount: 0,
        obligationCount: 0,
      };
      existing.obligationCount++;

      if (!existing.ownerName) {
        const userResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
          `SELECT full_name, email FROM "${schema}".users WHERE user_id = $1`,
          [ownerId],
        ), { tenantId: tenantId, operation: 'query users' });
        (existing as any).ownerName =
          userResult.rows[0]?.full_name || userResult.rows[0]?.email || ownerId;
      }

      ownerMap.set((ownerId as any), existing);
    }
  }

  const affectedOwners: AffectedOwner[] = Array.from(ownerMap.entries()).map(
    ([ownerId, data]) => ({
      ownerId,
      ownerName: data.ownerName,
      affectedControlCount: data.controlCount,
      affectedObligationCount: data.obligationCount,
      ownerImpactSeverity: computeOwnerSeverity(
        data.controlCount,
        data.obligationCount,
      ),
    }),
  );

  // Step 6: Generate suggested actions
  const suggestedActions: SuggestedAction[] = [];

  for (const control of affectedControls) {
    const owner = affectedOwners.find((o) =>
      ownerMap.get(o.ownerId)?.controlCount ?? 0 > 0,
    );
    const actionId = uuid();
    const priority = diff.impactSeverity;
    const deadlineDays = getDeadlineDays(priority, control.requiredAction);

    suggestedActions.push({
      actionId,
      entityType: "control",
      entityId: control.controlId,
      entityTitle: control.controlTitle,
      ownerId: owner?.ownerId || null,
      ownerName: owner?.ownerName || null,
      actionEn: `${capitalizeFirst(control.requiredAction)} control "${control.controlTitle}" due to regulatory change in clause ${control.clauseRef}.`,
      actionAr: `${mapActionToArabic(control.requiredAction)} الضابط "${control.controlTitle}" بسبب تغيير تنظيمي في البند ${control.clauseRef}.`,
      priority,
      suggestedDeadlineDays: deadlineDays,
    });
  }

  for (const obl of affectedObligations) {
    const owner = affectedOwners.find((o) =>
      ownerMap.get(o.ownerId)?.obligationCount ?? 0 > 0,
    );
    const actionId = uuid();
    const priority = diff.impactSeverity;
    const deadlineDays = getDeadlineDays(priority, obl.requiredAction);

    suggestedActions.push({
      actionId,
      entityType: "obligation",
      entityId: obl.obligationId,
      entityTitle: obl.obligationTitle,
      ownerId: owner?.ownerId || null,
      ownerName: owner?.ownerName || null,
      actionEn: `${capitalizeFirst(obl.requiredAction)} obligation "${obl.obligationTitle}" due to regulatory change in clause ${obl.clauseRef}.`,
      actionAr: `${mapActionToArabic(obl.requiredAction)} الالتزام "${obl.obligationTitle}" بسبب تغيير تنظيمي في البند ${obl.clauseRef}.`,
      priority,
      suggestedDeadlineDays: deadlineDays,
    });
  }

  // Step 7: Persist assessment
  const assessmentId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".regulatory_impact_assessments
     (assessment_id, diff_id, affected_controls, affected_obligations,
      affected_owners, suggested_actions, impact_severity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      assessmentId,
      diffId,
      JSON.stringify(affectedControls),
      JSON.stringify(affectedObligations),
      JSON.stringify(affectedOwners),
      JSON.stringify(suggestedActions),
      diff.impactSeverity,
    ],
  );

  // Step 8: Emit impact assessment event
  await eventBus.publish({
    eventType: "delta.impact_assessed" as any,
    tenantId,

    sourceService: "RegulatoryChangeImpactService",
    entityType: "impact_assessment",
    entityId: assessmentId,
    severity:
      diff.impactSeverity === "critical"
        ? "critical"
        : diff.impactSeverity === "high"
          ? "warning"
          : "info",
    payload: {
      diffId,
      affectedControlCount: affectedControls.length,
      affectedObligationCount: affectedObligations.length,
      affectedOwnerCount: affectedOwners.length,
      suggestedActionCount: suggestedActions.length,
      impactSeverity: diff.impactSeverity,
    },
  });

  return {
    diffId,
    affectedControls,
    affectedObligations,
    affectedOwners,
    suggestedActions,
    impactSeverity: diff.impactSeverity,
  };
}

/**
 * Auto-create action items from an impact assessment.
 * Persists each suggested action as a trackable action item
 * and emits task creation events for downstream processing.
 *
 * @param tenantId - Tenant identifier for schema scoping
 * @param diffId   - UUID of the regulation diff
 * @returns Array of created action IDs
 */
export async function createImpactActions(
  tenantId: string,
  diffId: string,
): Promise<string[]> {
  await ensureTables(tenantId);
  const schema = tenantSchema(tenantId);

  // Retrieve the stored assessment
  const assessmentResult = await safeQuery(
    `SELECT suggested_actions, impact_severity
     FROM "${schema}".regulatory_impact_assessments
     WHERE diff_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [diffId],
  );

  if (assessmentResult.rows.length === 0) {
    // No assessment found; run one first
    await assessChangeImpact(tenantId, diffId);
    return createImpactActions(tenantId, diffId);
  }

  const row = assessmentResult.rows[0];
  const actions: SuggestedAction[] =
    typeof row.suggested_actions === "string"
      ? JSON.parse(row.suggested_actions)
      : row.suggested_actions || [];

  const createdIds: string[] = [];

  for (const action of actions) {
    const actionId = uuid();

    await safeQuery(
      `INSERT INTO "${schema}".regulatory_impact_actions
       (action_id, diff_id, entity_type, entity_id, entity_title,
        owner_id, action_en, action_ar, priority, suggested_deadline_days, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
      [
        actionId,
        diffId,
        action.entityType,
        action.entityId,
        action.entityTitle,
        action.ownerId,
        action.actionEn,
        action.actionAr,
        action.priority,
        action.suggestedDeadlineDays,
      ],
    );

    createdIds.push(actionId);

    // Emit task creation event for each action
    await eventBus.publish({
      eventType: "task.auto_created" as any,
      tenantId,

      sourceService: "RegulatoryChangeImpactService",
      entityType: action.entityType,
      entityId: action.entityId,
      severity: "info",
      payload: {
        actionId,
        diffId,
        ownerId: action.ownerId,
        actionEn: action.actionEn,
        priority: action.priority,
        deadlineDays: action.suggestedDeadlineDays,
      },
    });
  }

  return createdIds;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Map a diff impact type to a control action.
 */
function mapImpactToControlAction(
  impactType: string,
): "update" | "review" | "retire" | "create" {
  switch (impactType) {
    case "requires_update":
      return "update";
    case "deprecated":
      return "retire";
    case "new_requirement":
      return "create";
    default:
      return "review";
  }
}

/**
 * Map a diff impact type to an obligation action.
 */
function mapImpactToObligationAction(
  impactType: string,
): "update" | "review" | "archive" | "create" {
  switch (impactType) {
    case "requires_update":
      return "update";
    case "deprecated":
      return "archive";
    case "new_requirement":
      return "create";
    default:
      return "review";
  }
}

/**
 * Capitalize the first letter of a string.
 */
function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Map action types to Arabic descriptions.
 */
function mapActionToArabic(action: string): string {
  const map: Record<string, string> = {
    update: "تحديث",
    review: "مراجعة",
    retire: "إيقاف",
    archive: "أرشفة",
    create: "إنشاء",
  };
  return map[action] || "مراجعة";
}
