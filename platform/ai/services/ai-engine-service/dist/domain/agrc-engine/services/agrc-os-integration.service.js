// @ts-nocheck
import { logger } from '../ports/logger.port';
// ================================================================
// Shahin — AGRC-OS Integration Service (Product)
// Bridges All Autonomy Gaps:
//
// Gap 1: Activation rule evaluation → on-demand agent triggers
// Gap 2: Domain event subscriptions → reactive agent runs
// Gap 3: Persistent cooperation (DB-backed handoffs/context)
// Gap 4: Workload → auto-delegation to agent shadows
// Gap 5: Onboarding profile → agent monitoring targets
// Gap 6: Task completion feedback → agent priority tuning
//
// NOTE: This is an AGRC product service residing
// in the platform directory. Law 2 ownership: agrc.
// ================================================================
import { safeQuery, tenantSchema } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience/resilient-catch';
// Maps domain event types to the agent IDs that should react
const EVENT_AGENT_MAP = {
    'risk.created': ['A07'],
    'risk.updated': ['A07', 'A06'],
    'risk.score_changed': ['A07', 'A09'],
    'control.failed': ['A04', 'A06'],
    'control.created': ['A03', 'A04'],
    'evidence.expired': ['A05'],
    'evidence.uploaded': ['A05', 'A06'],
    'policy.expired': ['A08'],
    'policy.created': ['A08', 'A03'],
    'policy.updated': ['A08'],
    'incident.created': ['A07', 'A10'],
    'incident.escalated': ['A07'],
    'vendor.risk_changed': ['A09'],
    'compliance.gap_found': ['A06', 'A03'],
    'audit.finding_created': ['A10', 'A06'],
    'framework.adopted': ['A01', 'A03'],
    'task.completed': ['feedback'], // special: feeds back to priority tuning
    'task.rejected': ['feedback'],
};
// Maps trigger_type to the SQL check that evaluates whether the condition is met
const TRIGGER_EVALUATORS = {
    overdue_task: async (schema, config) => {
        const threshold = config.thresholdCount || 5;
        const res = await safeQuery(`SELECT COUNT(*)::int AS n FROM "${schema}".tasks WHERE status = 'open' AND due_date < NOW()`);
        const count = getFirstRow(res)?.n || 0;
        return { triggered: count >= threshold, context: { overdueCount: count, threshold } };
    },
    evidence_gap: async (schema, config) => {
        const threshold = config.thresholdCount || 3;
        const res = await safeQuery(`SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (SELECT 1 FROM "${schema}".evidence e WHERE e.linked_entity_id = c.id)`);
        const count = getFirstRow(res)?.n || 0;
        return { triggered: count >= threshold, context: { controlsWithoutEvidence: count, threshold } };
    },
    risk_threshold: async (schema, config) => {
        const maxScore = config.maxScore || 15;
        const res = await safeQuery(`SELECT COUNT(*)::int AS n, MAX(risk_score)::int AS max_score
       FROM "${schema}".risks WHERE risk_score > $1 AND status != 'closed'`, [maxScore]);
        const count = getFirstRow(res)?.n || 0;
        return { triggered: count > 0, context: { highRiskCount: count, maxScore: getFirstRow(res)?.max_score || 0 } };
    },
    control_failure: async (schema, config) => {
        const threshold = config.thresholdCount || 1;
        const res = await safeQuery(`SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls WHERE test_status = 'failed'`);
        const count = getFirstRow(res)?.n || 0;
        return { triggered: count >= threshold, context: { failedControls: count, threshold } };
    },
    policy_expiry: async (schema, config) => {
        const daysAhead = config.daysAhead || 30;
        const res = await safeQuery(`SELECT COUNT(*)::int AS n FROM "${schema}".policies
       WHERE review_date BETWEEN NOW() AND NOW() + INTERVAL '1 day' * $1 AND status = 'published'`, [daysAhead]);
        const count = getFirstRow(res)?.n || 0;
        return { triggered: count > 0, context: { expiringPolicies: count, daysAhead } };
    },
    compliance_drop: async (schema, config) => {
        const minScore = config.minScore || 70;
        const res = await safeQuery(`SELECT AVG(score)::numeric(5,1) AS avg FROM "${schema}".compliance_assessments
       WHERE created_at > NOW() - INTERVAL '30 days'`);
        const avg = Number(getFirstRow(res)?.avg || 100);
        return { triggered: avg < minScore, context: { avgComplianceScore: avg, minScore } };
    },
    workload_spike: async (schema, config) => {
        const maxTasks = config.maxTasksPerMember || 20;
        const res = await safeQuery(`SELECT assigned_to, COUNT(*)::int AS n FROM "${schema}".tasks
       WHERE status = 'open' GROUP BY assigned_to HAVING COUNT(*) > $1`, [maxTasks]);
        const overloaded = res.rows || [];
        return { triggered: overloaded.length > 0, context: { overloadedMembers: overloaded, threshold: maxTasks } };
    },
    schedule_cron: async (_schema, _config) => {
        // Cron-based triggers are handled by the job scheduler, not here
        return { triggered: false, context: {} };
    },
    domain_event: async (_schema, _config) => {
        // Domain event triggers are handled by the event subscription, not here
        return { triggered: false, context: {} };
    },
};
// ================================================================
// GAP 1: Activation Rule Evaluator
// Scans all enabled activation rules across all agent shadows
// and triggers the appropriate agent when conditions are met.
// ================================================================
export async function evaluateActivationRules(tenantId) {
    const schema = tenantSchema(tenantId);
    const actions = [];
    let evaluated = 0;
    let triggered = 0;
    // Get all enabled shadows with their rules
    const shadows = await safeQuery(`SELECT s.shadow_id, s.user_id, s.team_id, s.agent_name, s.activation_mode, s.enabled,
            s.raci_mirror, s.capabilities, s.auto_actions
     FROM "${schema}".member_agent_shadows s
     WHERE s.enabled = TRUE AND s.activation_mode IN ('hybrid', 'agrc_os')`);
    for (const shadow of shadows.rows || []) {
        const rules = await safeQuery(`SELECT * FROM "${schema}".agent_activation_rules
       WHERE shadow_id = $1 AND enabled = TRUE ORDER BY priority`, [shadow.shadow_id]);
        for (const rule of rules.rows || []) {
            evaluated++;
            const triggerType = rule.trigger_type;
            const evaluator = TRIGGER_EVALUATORS[triggerType];
            if (!evaluator)
                continue;
            try {
                const { triggered: fired, context } = await evaluator(schema, rule.trigger_config || {});
                if (!fired)
                    continue;
                // Cooldown check: don't re-trigger within 30 minutes
                if (rule.last_triggered_at) {
                    const lastTriggered = new Date(rule.last_triggered_at).getTime();
                    const cooldownMs = (rule.trigger_config?.cooldownMinutes || 30) * 60 * 1000;
                    if (Date.now() - lastTriggered < cooldownMs)
                        continue;
                }
                triggered++;
                const actionDesc = await executeActivationAction(tenantId, schema, shadow, rule, context);
                actions.push(actionDesc);
                // Update rule trigger timestamp and count
                await safeQuery(`UPDATE "${schema}".agent_activation_rules
           SET last_triggered_at = NOW(), trigger_count = trigger_count + 1
           WHERE rule_id = $1`, [rule.rule_id]);
                // Update shadow last_action_at
                await safeQuery(`UPDATE "${schema}".member_agent_shadows
           SET last_action_at = NOW(), total_actions = total_actions + 1
           WHERE shadow_id = $1`, [shadow.shadow_id]);
            }
            catch (err) {
                logger.warn(`[AGRC-OS] Rule ${rule.rule_id} evaluation failed: ${toErrorMessage(err)}`);
            }
        }
    }
    return { evaluated, triggered, actions };
}
async function executeActivationAction(tenantId, schema, shadow, rule, triggerContext) {
    const actionType = rule.action_type;
    const actionConfig = rule.action_config || {};
    switch (actionType) {
        case 'run_agent': {
            // Determine which agent to run based on shadow capabilities or config
            const agentId = actionConfig.agentId || mapShadowToAgent(shadow);
            if (agentId) {
                const { runAgent } = await import('../../runtime/ai/services/agents/core/agent-runner.service');
                const result = await runAgent(tenantId, agentId);
                const desc = `Agent ${agentId} triggered by rule "${rule.rule_name}": ${result.actionsExecuted} actions`;
                await eventBus.publish({
                    eventType: 'agent.activation_triggered',
                    tenantId, sourceService: 'agrc-os-integration',
                    severity: 'info',
                    payload: { ruleId: rule.rule_id, agentId, shadowId: shadow.shadow_id, ...triggerContext },
                });
                return desc;
            }
            return `No agent mapped for shadow ${shadow.agent_name}`;
        }
        case 'create_task': {
            const { createTask } = await import('../../workflow/services/tasks/task-board.service');
            await createTask(tenantId, {
                title: actionConfig.taskTitle || `[Auto] ${rule.rule_name}`,
                description: `Triggered by activation rule: ${JSON.stringify(triggerContext)}`,
                assignedTo: shadow.user_id,
                dueDate: new Date(Date.now() + (actionConfig.dueDays || 3) * 86_400_000).toISOString().split('T')[0],
            });
            return `Task created for ${shadow.user_id} via rule "${rule.rule_name}"`;
        }
        case 'send_notification': {
            const { createNotification } = await import('../../notification/services/notification.service');
            await createNotification(tenantId, {
                userId: shadow.user_id,
                type: 'agent_activation',
                title: actionConfig.notificationTitle || `Agent Activation: ${rule.rule_name}`,
                body: `Condition met: ${JSON.stringify(triggerContext)}`,
                link: actionConfig.link || '/team-management',
            });
            return `Notification sent to ${shadow.user_id} via rule "${rule.rule_name}"`;
        }
        case 'delegate_to_agent': {
            const agentId = actionConfig.agentId || mapShadowToAgent(shadow);
            if (agentId) {
                await autoDelegateToAgent(tenantId, shadow.user_id, agentId, shadow.team_id, triggerContext);
                return `Delegation granted to ${agentId} for ${shadow.user_id}`;
            }
            return `No agent to delegate to for shadow ${shadow.agent_name}`;
        }
        default:
            return `Unknown action type: ${actionType}`;
    }
}
// Maps shadow capabilities/name to the best-matching agent ID
function mapShadowToAgent(shadow) {
    const capabilities = shadow.capabilities || [];
    const name = (shadow.agent_name || '').toLowerCase();
    const capMap = {
        regulatory_compliance: 'A01', compliance_monitor: 'A01',
        risk_assessment: 'A02', risk_analyst: 'A02',
        evidence_management: 'A03', evidence_gatherer: 'A03',
        policy_lifecycle: 'A04', policy_writer: 'A04',
        internal_audit: 'A05', audit_support: 'A05',
        vendor_risk: 'A06', vendor_monitor: 'A06',
        incident_response: 'A07', incident_handler: 'A07',
        awareness_training: 'A08', training_facilitator: 'A08',
        reporting_analytics: 'A09', report_builder: 'A09',
        erp_data_sync: 'A10', erp_integrator: 'A10',
    };
    for (const cap of capabilities) {
        if (capMap[cap])
            return capMap[cap];
    }
    // Fallback: match by name
    if (name.includes('compliance'))
        return 'A01';
    if (name.includes('risk'))
        return 'A07';
    if (name.includes('evidence'))
        return 'A05';
    if (name.includes('policy'))
        return 'A08';
    if (name.includes('audit'))
        return 'A10';
    if (name.includes('vendor'))
        return 'A09';
    if (name.includes('incident'))
        return 'A07';
    return null;
}
// ================================================================
// GAP 2: Domain Event → Reactive Agent Triggers
// Subscribe to domain events and fire targeted agents immediately.
// ================================================================
let _eventSubscriptionsInitialized = false;
export function initEventDrivenAgentTriggers() {
    if (_eventSubscriptionsInitialized)
        return;
    _eventSubscriptionsInitialized = true;
    // Subscribe to all mapped domain events
    for (const [eventType, agentIds] of Object.entries(EVENT_AGENT_MAP)) {
        eventBus.subscribe(eventType, `agrc-os-reactive-${eventType}`, async (event) => {
            const tenantId = event.tenantId;
            if (!tenantId)
                return;
            if (agentIds.includes('feedback')) {
                // Gap 6: feedback loop
                await processTaskFeedback(tenantId, event).catch((err) => logger.warn(`[AGRC-OS] Feedback processing failed: ${toErrorMessage(err)}`));
                return;
            }
            // Rate-limit: max 1 reactive run per agent per tenant per 5 minutes
            for (const agentId of agentIds) {
                const cacheKey = `reactive:${tenantId}:${agentId}`;
                if (reactiveCooldown.has(cacheKey))
                    continue;
                reactiveCooldown.set(cacheKey, Date.now());
                setTimeout(() => reactiveCooldown.delete(cacheKey), 5 * 60 * 1000);
                try {
                    const { runAgent } = await import('../../runtime/ai/services/agents/core/agent-runner.service');
                    const result = await runAgent(tenantId, agentId);
                    logger.info(`[AGRC-OS] Reactive run ${agentId} for ${eventType}: ${result.actionsExecuted} actions`);
                    await recordAudit({
                        tenantId, userId: `agrc-os`, module: 'agrc_os_integration',
                        action: 'create', entityType: 'reactive_agent_run', entityId: agentId,
                        afterState: {
                            trigger: eventType, agentId, actionsExecuted: result.actionsExecuted,
                            summary: result.summary, sourceEvent: event.eventId,
                        },
                    }).catch(catchHandler(EC.AGENT_ACTION, {}));
                }
                catch (err) {
                    logger.warn(`[AGRC-OS] Reactive agent ${agentId} failed: ${toErrorMessage(err)}`);
                }
            }
        });
    }
    logger.info(`[AGRC-OS] Event-driven agent triggers initialized (${Object.keys(EVENT_AGENT_MAP).length} event types)`);
}
const reactiveCooldown = new Map();
// ================================================================
// GAP 3: Persistent Cooperation — DB-backed handoffs & context
// Replace in-memory Map with PostgreSQL for cross-PM2 safety.
// ================================================================
export async function persistHandoff(tenantId, fromAgent, toAgent, handoffType, priority, payload) {
    const schema = tenantSchema(tenantId);
    const id = `ho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await safeQuery(`INSERT INTO "${schema}".agent_handoffs (id, from_agent, to_agent, handoff_type, priority, status, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW())
     ON CONFLICT (id) DO NOTHING`, [id, fromAgent, toAgent, handoffType, priority, JSON.stringify(payload)]);
    return id;
}
export async function getPersistentPendingHandoffs(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`SELECT * FROM "${schema}".agent_handoffs
     WHERE to_agent = $1 AND status = 'pending'
     ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at`, [agentId]);
    return res.rows || [];
}
export async function completePersistentHandoff(tenantId, handoffId, result) {
    const schema = tenantSchema(tenantId);
    await safeQuery(`UPDATE "${schema}".agent_handoffs SET status = 'completed', completed_at = NOW(),
       payload = payload || $2::jsonb WHERE id = $1`, [handoffId, JSON.stringify({ result })]);
}
export async function getActiveCycleContext(tenantId) {
    const schema = tenantSchema(tenantId);
    const res = await safeQuery(`SELECT * FROM "${schema}".agent_cycle_summaries
     WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`, [tenantId]);
    return getFirstRow(res) || null;
}
// ================================================================
// GAP 4: Workload → Auto-Delegation to Agent Shadows
// When a member's open task count exceeds threshold, automatically
// create a delegation grant for their agent shadow.
// ================================================================
export async function evaluateWorkloadDelegation(tenantId) {
    const schema = tenantSchema(tenantId);
    const details = [];
    let evaluated = 0;
    let delegated = 0;
    // Find members with enabled agent shadows in hybrid/agrc_os mode
    const shadows = await safeQuery(`SELECT s.shadow_id, s.user_id, s.team_id, s.agent_name, s.activation_mode,
            s.capabilities, s.auto_actions
     FROM "${schema}".member_agent_shadows s
     WHERE s.enabled = TRUE AND s.activation_mode IN ('hybrid', 'agrc_os')`);
    for (const shadow of shadows.rows || []) {
        evaluated++;
        // Count open tasks for this member
        const taskRes = await safeQuery(`SELECT COUNT(*)::int AS open_tasks FROM "${schema}".tasks
       WHERE assigned_to = $1 AND status = 'open'`, [shadow.user_id]);
        const openTasks = getFirstRow(taskRes)?.open_tasks || 0;
        // Threshold: configurable per shadow or default 15
        const threshold = 15;
        if (openTasks < threshold)
            continue;
        // Check if delegation already active
        const existingGrant = await safeQuery(`SELECT grant_id FROM "${schema}".delegation_grants
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`, [shadow.user_id]);
        if (existingGrant.rows.length > 0)
            continue;
        // Auto-delegate
        const agentId = mapShadowToAgent(shadow);
        if (!agentId)
            continue;
        await autoDelegateToAgent(tenantId, shadow.user_id, agentId, shadow.team_id, {
            reason: 'workload_threshold_exceeded',
            openTasks,
            threshold,
        });
        delegated++;
        details.push(`Delegated ${agentId} for ${shadow.user_id} (${openTasks} open tasks > ${threshold})`);
    }
    return { evaluated, delegated, details };
}
async function autoDelegateToAgent(tenantId, userId, agentId, teamId, context) {
    try {
        const { createDelegationGrant } = await import('../../runtime/ai/services/delegation/agent-delegation.service');
        await createDelegationGrant(tenantId, userId, `AGENT-${agentId}`, ['assessment', 'evidence_upload', 'risk_seeding'], 24 * 60);
        await eventBus.publish({
            eventType: 'agent.auto_delegated',
            tenantId, sourceService: 'agrc-os-integration',
            severity: 'info',
            payload: { userId, agentId, teamId, ...context },
        });
        await recordAudit({
            tenantId, userId: 'agrc-os', module: 'agrc_os_integration',
            action: 'create', entityType: 'auto_delegation', entityId: `AGENT-${agentId}`,
            afterState: { userId, agentId, teamId, ...context },
        }).catch(catchHandler(EC.AGENT_ACTION, {}));
        logger.info(`[AGRC-OS] Auto-delegated ${agentId} for user ${userId} (${context.reason || 'workload'})`);
    }
    catch (err) {
        logger.warn(`[AGRC-OS] Auto-delegation failed for ${userId} → ${agentId}: ${toErrorMessage(err)}`);
    }
}
// ================================================================
// GAP 5: Onboarding Profile → Agent Monitoring Targets
// After provisioning completes, seed agent-specific focus areas
// based on what the tenant configured during onboarding.
// ================================================================
export async function seedAgentTargetsFromProfile(tenantId) {
    const targets = [];
    // Load tenant profile
    const tenantRes = await safeQuery(`SELECT org_type, primary_sector_id, sector_ids, critical_infrastructure,
            data_classification_level, cloud_providers, uses_ai_ml,
            processes_payment_cards, has_ot_scada, has_ciso, has_dpo,
            grc_maturity_level, settings
     FROM tenants WHERE tenant_id = $1`, [tenantId]);
    if (!tenantRes.rows.length)
        return { seeded: 0, targets: [] };
    const profile = getFirstRow(tenantRes);
    const schema = tenantSchema(tenantId);
    // Ensure agent_monitoring_targets table
    await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_monitoring_targets (
      target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id VARCHAR(10) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_config JSONB NOT NULL DEFAULT '{}',
      priority VARCHAR(10) DEFAULT 'medium',
      source VARCHAR(50) DEFAULT 'onboarding',
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(agent_id, target_type)
    );
  `);
    const upsertTarget = async (agentId, targetType, config, priority) => {
        await safeQuery(`INSERT INTO "${schema}".agent_monitoring_targets (agent_id, target_type, target_config, priority)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agent_id, target_type) DO UPDATE SET target_config = $3, priority = $4`, [agentId, targetType, JSON.stringify(config), priority]);
        targets.push(`${agentId}:${targetType}`);
    };
    // A01 — Health Monitor: focus on org completeness gaps
    await upsertTarget('A01', 'org_completeness', {
        requiredFields: ['org_type', 'primary_sector_id', 'employee_count', 'data_classification_level'],
        hasCiso: profile.has_ciso, hasDpo: profile.has_dpo,
    }, 'high');
    // A03 — Framework Mapping: prioritize adopted frameworks
    const frameworks = profile.settings?.profileResolution?.adoptedFrameworks || profile.sector_ids || [];
    await upsertTarget('A03', 'framework_focus', { frameworks, sectors: profile.sector_ids || [] }, 'high');
    // A05 — Evidence: focus on data classification level
    await upsertTarget('A05', 'evidence_sensitivity', {
        dataClassification: profile.data_classification_level,
        criticalInfra: profile.critical_infrastructure,
    }, profile.critical_infrastructure ? 'critical' : 'medium');
    // A07 — Risk: set risk appetite from profile
    const riskAppetite = profile.settings?.profileResolution?.riskAppetite || 'moderate';
    await upsertTarget('A07', 'risk_appetite', {
        appetite: riskAppetite,
        maxAcceptableScore: riskAppetite === 'conservative' ? 10 : riskAppetite === 'aggressive' ? 25 : 15,
    }, 'high');
    // A08 — Policy: compliance complexity
    const complexity = profile.settings?.profileResolution?.complianceComplexity || 'standard';
    await upsertTarget('A08', 'policy_cadence', {
        complexity,
        reviewCycleDays: complexity === 'complex' ? 90 : complexity === 'simple' ? 365 : 180,
    }, 'medium');
    // A09 — Vendor Risk: cloud providers and payment card processing
    if (profile.cloud_providers?.length > 0 || profile.processes_payment_cards) {
        await upsertTarget('A09', 'vendor_focus', {
            cloudProviders: profile.cloud_providers || [],
            processesPaymentCards: profile.processes_payment_cards,
            usesAiMl: profile.uses_ai_ml,
        }, 'high');
    }
    // A10 — Reporting: cadence from profile
    const cadence = profile.settings?.profileResolution?.reportingCadence || 'monthly';
    await upsertTarget('A10', 'reporting_cadence', {
        cadence,
        intervalDays: cadence === 'weekly' ? 7 : cadence === 'daily' ? 1 : cadence === 'quarterly' ? 90 : 30,
    }, 'medium');
    // OT/SCADA-specific monitoring
    if (profile.has_ot_scada) {
        await upsertTarget('A04', 'ot_scada_controls', {
            hasOtScada: true,
            focusAreas: ['network_segmentation', 'scada_access_control', 'industrial_monitoring'],
        }, 'critical');
    }
    return { seeded: targets.length, targets };
}
// ================================================================
// GAP 6: Task Completion/Rejection → Agent Priority Tuning
// When humans complete or reject agent-proposed tasks, adjust
// the agent's confidence and future action priorities.
// ================================================================
async function processTaskFeedback(tenantId, event) {
    const schema = tenantSchema(tenantId);
    const entityId = event.entityId;
    if (!entityId)
        return;
    // Check if this task was created by an agent
    const taskRes = await safeQuery(`SELECT title, description, assigned_to, status FROM "${schema}".tasks WHERE task_id = $1`, [entityId]);
    if (!taskRes.rows.length)
        return;
    const task = getFirstRow(taskRes);
    // Agent-created tasks have "[AXX]" prefix
    const agentMatch = (task.title || '').match(/^\[(A\d{2})\]/);
    if (!agentMatch)
        return;
    const agentId = agentMatch[1];
    const isCompleted = event.eventType === 'task.completed' || task.status === 'completed';
    const isRejected = event.eventType === 'task.rejected' || task.status === 'rejected';
    // Ensure feedback table
    await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_feedback_log (
      feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id VARCHAR(10) NOT NULL,
      task_id UUID,
      feedback_type VARCHAR(20) NOT NULL,
      task_title TEXT,
      responded_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    await safeQuery(`INSERT INTO "${schema}".agent_feedback_log (agent_id, task_id, feedback_type, task_title, responded_by)
     VALUES ($1, $2, $3, $4, $5)`, [agentId, entityId, isCompleted ? 'accepted' : isRejected ? 'rejected' : 'other',
        task.title, task.assigned_to]);
    // Update agent performance metrics with acceptance/rejection ratio
    await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".agent_priority_weights (
      agent_id VARCHAR(10) PRIMARY KEY,
      acceptance_rate NUMERIC(5,2) DEFAULT 100,
      total_accepted INT DEFAULT 0,
      total_rejected INT DEFAULT 0,
      priority_boost NUMERIC(3,2) DEFAULT 1.0,
      last_updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    if (isCompleted) {
        await safeQuery(`INSERT INTO "${schema}".agent_priority_weights (agent_id, total_accepted, acceptance_rate)
       VALUES ($1, 1, 100)
       ON CONFLICT (agent_id) DO UPDATE SET
         total_accepted = agent_priority_weights.total_accepted + 1,
         acceptance_rate = ROUND(
           (agent_priority_weights.total_accepted + 1)::numeric /
           NULLIF(agent_priority_weights.total_accepted + agent_priority_weights.total_rejected + 1, 0) * 100, 2
         ),
         priority_boost = LEAST(1.5, agent_priority_weights.priority_boost + 0.05),
         last_updated_at = NOW()`, [agentId]);
    }
    else if (isRejected) {
        await safeQuery(`INSERT INTO "${schema}".agent_priority_weights (agent_id, total_rejected, acceptance_rate)
       VALUES ($1, 1, 0)
       ON CONFLICT (agent_id) DO UPDATE SET
         total_rejected = agent_priority_weights.total_rejected + 1,
         acceptance_rate = ROUND(
           agent_priority_weights.total_accepted::numeric /
           NULLIF(agent_priority_weights.total_accepted + agent_priority_weights.total_rejected + 1, 0) * 100, 2
         ),
         priority_boost = GREATEST(0.5, agent_priority_weights.priority_boost - 0.1),
         last_updated_at = NOW()`, [agentId]);
    }
    logger.info(`[AGRC-OS] Feedback: ${agentId} task ${isCompleted ? 'accepted' : 'rejected'} by ${task.assigned_to}`);
}
// ================================================================
// Unified Entry Point — Called by Job Scheduler
// ================================================================
export async function runAgrcOsIntegrationCycle(tenantId) {
    // Gap 1: Evaluate activation rules
    const activation = await swallowDefault(EC.FALLBACK_QUERY, { evaluated: 0, triggered: 0, actions: [] }, evaluateActivationRules(tenantId), { tenantId: tenantId, operation: 'fallback query' });
    // Gap 4: Evaluate workload delegation
    const workload = await swallowDefault(EC.FALLBACK_QUERY, { evaluated: 0, delegated: 0, details: [] }, evaluateWorkloadDelegation(tenantId), { tenantId: tenantId, operation: 'fallback query' });
    if (activation.triggered > 0 || workload.delegated > 0) {
        logger.info(`[AGRC-OS] Integration cycle: ${activation.triggered} rules triggered, ${workload.delegated} delegations`);
    }
    return {
        activationRules: { evaluated: activation.evaluated, triggered: activation.triggered },
        workloadDelegation: { evaluated: workload.evaluated, delegated: workload.delegated },
    };
}
//# sourceMappingURL=agrc-os-integration.service.js.map