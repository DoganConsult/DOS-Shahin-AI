// @ts-nocheck
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { logger } from '../ports/logger.port';
// ============================================
// Shahin — AGRC-OS Notification Bridge (Product)
// Wires EventBus events to the notification
// service for real-time user alerts.
// NOTE: This is an AGRC product service residing
// in the platform directory. Law 2 ownership: agrc.
// ============================================

import { eventBus, type PlatformEvent } from '../ports/events.port';
import { query as _query, safeQuery } from '../ports/database.port';
import { getFirstRow } from '@dos/db';

const NOTIFICATION_DEDUP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const recentNotificationKeys = new Map<string, number>();

/**
 * Register EventBus subscribers that push notifications
 * to relevant users when critical AGRC-OS events occur.
 */
export function registerNotificationBridge(): void {
  // gate.blocked → notify the requestor + tenant admins
  eventBus.subscribe('gate.blocked', 'notification-gate-blocked', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_gate_blocked',
      title: `[AGRC-OS] Gate Blocked: ${event.payload.subjectName || event.entityId}`,

      body: `Enforcement gate blocked ${event.payload.gateType || 'release'} for "${event.payload.subjectName || event.entityId}". Reasons: ${(event.payload.blockReasons || []).join(', ')}`,
      link: '/agrc-os',
    });
  });

  // delta.detected → notify tenant admins
  eventBus.subscribe('delta.detected', 'notification-delta-detected', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_regulatory_delta',
      title: `[AGRC-OS] Regulatory Change Detected`,
      body: `A regulatory delta was detected for instrument ${event.entityId}. ${event.payload.summary || 'Review required.'}`,
      link: '/agrc-os',
    });
  });

  // constitution.breach → notify escalation chain (owners)
  eventBus.subscribe('constitution.breach', 'notification-constitution-breach', async (event) => {
    await notifyOwners(event, {
      type: 'agrc_constitution_breach',
      title: `[AGRC-OS] Constitution Breach`,
      body: `Governance constitution breach: ${event.payload.reason || event.payload.category || 'Unknown'}. Risk score ${event.payload.riskScore || '?'} exceeds appetite ${event.payload.maxScore || '?'}.`,
      link: '/agrc-os',
    });
  });

  // risk.exceeded_appetite → notify risk managers + owners
  eventBus.subscribe('risk.exceeded_appetite', 'notification-risk-appetite', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_risk_appetite_breach',
      title: `[AGRC-OS] Risk Appetite Exceeded`,
      body: `Risk "${event.payload.riskName || event.entityId}" in category "${event.payload.category}" scored ${event.payload.riskScore}, exceeding appetite threshold of ${event.payload.maxScore}.`,
      link: '/agrc-os',
    });
  });

  // telemetry.threat_high → notify security officers
  eventBus.subscribe('telemetry.threat_high', 'notification-threat-high', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_high_threat',
      title: `[AGRC-OS] High Threat Detected`,
      body: `Telemetry indicates high threat probability for "${event.payload.subjectKey || event.entityId}". Probability: ${event.payload.probability || '?'}`,
      link: '/agrc-os',
    });
  });

  // incident.created → notify admins
  eventBus.subscribe('incident.created', 'notification-incident-created', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_incident_created',
      title: `[AGRC-OS] New Incident`,
      body: `Incident "${event.payload.title || event.entityId}" created with severity ${event.severity}.`,
      link: '/incidents',
    });
  });

  // cycle.failed → notify admins about orchestration failure
  eventBus.subscribe('cycle.failed', 'notification-cycle-failed', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_cycle_failed',
      title: `[AGRC-OS] Orchestration Cycle Failed`,
      body: `AGRC-OS orchestration cycle failed: ${event.payload.error || 'Unknown error'}. Manual review recommended.`,
      link: '/agrc-os',
    });
  });

  // event.dlq_permanent_failure → notify admins about permanent DLQ failures
  eventBus.subscribe('event.dlq_permanent_failure', 'notification-dlq-permanent-failure', async (event) => {
    await notifyAdmins(event, {
      type: 'agrc_dlq_permanent_failure',
      title: `[AGRC-OS] Event Handler Permanent Failure`,
      body: `Event handler "${event.payload.handlerName}" permanently failed after ${event.payload.retryCount}/${event.payload.maxRetries} retries for event "${event.payload.eventType}". Last error: ${event.payload.lastError || 'Unknown'}. Manual intervention required.`,
      link: '/agrc-os/events/dlq',
    });
  });

  // attestation.draft_generated → notify compliance managers
  eventBus.subscribe('attestation.draft_generated', 'notification-attestation-draft', async (event) => {
    await notifyAdmins(event, {
      type: 'attestation_draft_ready',
      title: `[Continuous Attestation] Draft Generated`,

      body: `Attestation draft generated for ${event.payload.entityType || 'entity'} "${event.payload.entityName || event.entityId}" with readiness score ${event.payload.readinessScore?.overallScore || 'N/A'}%. Review and approve when ready.`,
      link: '/compliance/attestations',
    });
  });

  // policy.impact_simulated → notify policy owners
  eventBus.subscribe('policy.impact_simulated', 'notification-policy-impact', async (event) => {
    await notifyAdmins(event, {
      type: 'policy_impact_simulated',
      title: `[Policy Impact] Simulation Complete`,
      body: `Impact simulation completed for policy "${event.payload.policyName || event.entityId}". ${event.payload.impactedEntitiesCount || 0} entities affected. Review impact report for details.`,
      link: '/governance/policies',
    });
  });

  // audit.workpaper_generated → notify auditors
  eventBus.subscribe('audit.workpaper_generated', 'notification-workpaper-generated', async (event) => {
    await notifyAdmins(event, {
      type: 'audit_workpaper_ready',
      title: `[Audit] Workpaper Generated`,
      body: `Workpaper generated for audit "${event.payload.auditName || event.entityId}" with ${event.payload.workpaperCount || 0} workpapers. Includes traceability matrix and evidence bundle.`,
      link: '/audit/workpapers',
    });
  });

  // qiyas.benchmark_published → notify analytics users (optional, low priority)
  eventBus.subscribe('qiyas.benchmark_published', 'notification-benchmark-published', async (event) => {
    await notifyAdmins(event, {
      type: 'benchmark_published',
      title: `[Qiyas] Benchmark Published`,
      body: `New benchmark data published for ${event.payload.sectorCount || 0} sectors. Your organization's percentile rankings are available.`,
      link: '/analytics/benchmarks',
    });
  });

  // ai.query.executed → log only (no notification needed, but can be added for audit trail)
  // Note: This is intentionally not sending notifications to avoid spam from frequent queries

  // vendor.fourth_party_flagged → notify vendor risk managers
  eventBus.subscribe('vendor.fourth_party_flagged', 'notification-vendor-fourth-party', async (event) => {
    await notifyAdmins(event, {
      type: 'vendor_fourth_party_flagged',
      title: `[Vendor Risk] Fourth-Party Vendor Detected`,
      body: `Fourth-party vendor "${event.payload.subVendorName || event.payload.subVendorId || 'Unknown'}" detected under vendor "${event.payload.vendorName || event.entityId}". Review supply chain risk and concentration exposure.`,
      link: '/vendors',
    });
  });

  // vendor.concentration_high → notify vendor risk managers
  eventBus.subscribe('vendor.concentration_high', 'notification-vendor-concentration', async (event) => {
    await notifyAdmins(event, {
      type: 'vendor_concentration_high',
      title: `[Vendor Risk] High Concentration Risk`,
      body: `High vendor concentration risk detected: ${event.payload.concentrationPercentage || '?'}% of ${event.payload.metricType || 'operations'} concentrated in ${event.payload.vendorCount || '?'} vendor(s). Risk score: ${event.payload.riskScore || '?'}.`,
      link: '/vendors/concentration',
    });
  });

  // platform management events → report directly to platform admins
  eventBus.subscribe('admin.config_changed', 'notification-platform-config-changed', async (event) => {
    await notifyPlatformAdmins(event, {
      type: 'platform_admin_config_changed',
      title: `[Platform Management] Configuration Changed`,
      body: `Platform configuration was changed${event.payload?.changedBy ? ` by ${event.payload.changedBy}` : ''}. Review for governance and compliance impact.`,
      link: '/admin-hub',
    });
  });

  eventBus.subscribe('admin.plan_upgraded', 'notification-platform-plan-upgraded', async (event) => {
    await notifyPlatformAdmins(event, {
      type: 'platform_admin_plan_upgraded',
      title: `[Platform Management] Tenant Plan Upgraded`,
      body: `A tenant subscription plan was upgraded${event.entityId ? ` (tenant: ${event.entityId})` : ''}. Validate policy, guardrails, and feature access alignment.`,
      link: '/admin-hub',
    });
  });

  eventBus.subscribe('admin.tenant_suspended', 'notification-platform-tenant-suspended', async (event) => {
    await notifyPlatformAdmins(event, {
      type: 'platform_admin_tenant_suspended',
      title: `[Platform Management] Tenant Suspended`,
      body: `Tenant suspension detected${event.entityId ? ` (tenant: ${event.entityId})` : ''}. Confirm suspension rationale and downstream impact.`,
      link: '/admin-hub',
    });
  });

  eventBus.subscribe('admin.tenant_activated', 'notification-platform-tenant-activated', async (event) => {
    await notifyPlatformAdmins(event, {
      type: 'platform_admin_tenant_activated',
      title: `[Platform Management] Tenant Activated`,
      body: `Tenant activation detected${event.entityId ? ` (tenant: ${event.entityId})` : ''}. Confirm baseline controls, onboarding, and monitoring are active.`,
      link: '/admin-hub',
    });
  });

  // AGRC-OS reporting escalations should auto-report to platform admins
  eventBus.subscribe('report.overdue', 'notification-platform-report-overdue', async (event) => {
    await notifyPlatformAdmins(event, {
      type: 'platform_admin_report_overdue',
      title: `[Platform Management] Report Schedule Overdue`,
      body: `A report schedule is overdue${event.payload?.reportType ? ` (${event.payload.reportType})` : ''}. Escalate and recover reporting SLA.`,
      link: '/reports-hub',
    });
  });

  // ── AI OS Event Notifications ──────────────────────────────────────────
  eventBus.subscribe('ai.run.failed', 'notification-ai-run-failed', async (event) => {
    await notifyAdmins(event, {
      type: 'ai_run_failed',
      title: `[AI OS] Agent Run Failed`,
      body: `Agent ${event.payload?.agentId || '?'} run failed: ${event.payload?.error || 'Unknown error'}. Review agent runtime configuration.`,
      link: '/ai-recommendation-inbox',
    });
  });

  eventBus.subscribe('ai.run.escalated', 'notification-ai-run-escalated', async (event) => {
    await notifyAdmins(event, {
      type: 'ai_run_escalated',
      title: `[AI OS] Agent Run Escalated`,
      body: `Agent ${event.payload?.agentId || '?'} run ${event.payload?.runId || ''} was escalated (${event.payload?.escalationType || 'notify'}). Manual intervention may be required.`,
      link: '/ai-recommendation-inbox',
    });
  });

  eventBus.subscribe('ai.guard.blocked', 'notification-ai-guard-blocked', async (event) => {
    await notifyAdmins(event, {
      type: 'ai_guard_blocked',
      title: `[AI OS] AI Guard Blocked Action`,
      body: `Policy rule "${event.payload?.ruleName || event.payload?.ruleId || '?'}" blocked agent ${event.payload?.agentId || '?'} from performing ${event.payload?.actionType || 'action'}.`,
      link: '/ai-policy-rules',
    });
  });

  eventBus.subscribe('ai.recommendation.created', 'notification-ai-recommendation-created', async (event) => {
    await notifyAdmins(event, {
      type: 'ai_recommendation_created',
      title: `[AI OS] New AI Recommendation`,
      body: `Agent ${event.payload?.agentId || '?'} created recommendation "${event.payload?.title || 'Untitled'}". Review and accept/reject in the inbox.`,
      link: '/ai-recommendation-inbox',
    });
  });

  eventBus.subscribe('ai.agent.disabled', 'notification-ai-agent-disabled', async (event) => {
    await notifyAdmins(event, {
      type: 'ai_agent_disabled',
      title: `[AI OS] Agent Disabled`,
      body: `Agent ${event.payload?.agentId || '?'} was disabled${event.payload?.updatedBy ? ` by ${event.payload.updatedBy}` : ''}. No further runs will execute until re-enabled.`,
      link: '/ai-recommendation-inbox',
    });
  });

  eventBus.subscribe('ai.policy.violated', 'notification-ai-policy-violated', async (event) => {
    await notifyOwners(event, {
      type: 'ai_policy_violated',
      title: `[AI OS] AI Policy Violation`,
      body: `AI policy violation detected: ${event.payload?.reason || event.payload?.ruleId || 'Unknown'}. Immediate review required.`,
      link: '/ai-policy-rules',
    });
  });

  logger.info('[AGRC-OS] Notification bridge registered (18 event subscribers, dedup enabled)');
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function notifyAdmins(event: PlatformEvent, notif: { type: string; title: string; body: string; link: string }): Promise<void> {
  try {
    if (!shouldSendNotification(event, notif.type)) return;

    const { createNotification } = await import('../../notification/services/notification.service');
    const admins = await safeQuery(
      `SELECT user_id FROM users WHERE tenant_id=$1 AND role IN ('admin', 'owner', 'compliance_officer', 'risk_manager') LIMIT 10`,
      [event.tenantId]
    );
    for (const admin of admins.rows) {
      await createNotification(event.tenantId, { userId: admin.user_id, ...notif }).catch(catchHandler(EC.AGENT_ACTION, {}));
    }

    // Outbound channels for critical events
    if (event.severity === 'critical') {
      await sendOutboundNotifications(event.tenantId, notif);
    }
  } catch { /* best effort */ }
}

async function notifyOwners(event: PlatformEvent, notif: { type: string; title: string; body: string; link: string }): Promise<void> {
  try {
    if (!shouldSendNotification(event, notif.type)) return;

    const { createNotification } = await import('../../notification/services/notification.service');
    const owners = await safeQuery(
      `SELECT user_id FROM users WHERE tenant_id=$1 AND role='owner' LIMIT 5`,
      [event.tenantId]
    );
    for (const owner of owners.rows) {
      await createNotification(event.tenantId, { userId: owner.user_id, ...notif }).catch(catchHandler(EC.AGENT_ACTION, {}));
    }

    // Outbound channels for owner-level notifications
    await sendOutboundNotifications(event.tenantId, notif);
  } catch { /* best effort */ }
}

// ── Outbound Notification Channels ─────────────────────────────────────────

async function sendOutboundNotifications(
  tenantId: string,
  notif: { type: string; title: string; body: string; link: string }
): Promise<void> {
  try {
    // Get tenant notification settings
    const tenantResult = await safeQuery(
      `SELECT settings FROM tenants WHERE tenant_id=$1`, [tenantId]
    );
    const settings = getFirstRow(tenantResult)?.settings || {};
    const channels = settings.notification_channels || {};

    // Email channel
    if (channels.email?.enabled && channels.email?.recipients?.length > 0) {
      try {
        const { sendEmail } = await import('@dos/platform-core/notifications');
        for (const recipient of channels.email.recipients) {
          await sendEmail(
            recipient,
            notif.title,
            `<h3>${notif.title}</h3><p>${notif.body}</p><p><a href="${notif.link}">View in AGRC-OS</a></p>`
          ).catch(catchHandler(EC.AGENT_ACTION, {}));
        }
      } catch { /* email service may not be configured */ }
    }

    // Slack webhook channel
    if (channels.slack?.enabled && channels.slack?.webhookUrl) {
      try {
        const payload = {
          text: notif.title,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: notif.title } },
            { type: 'section', text: { type: 'mrkdwn', text: notif.body } },
            { type: 'section', text: { type: 'mrkdwn', text: `<${notif.link}|View in AGRC-OS>` } },
          ],
        };
        await fetch(channels.slack.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(catchHandler(EC.AGENT_ACTION, {}));
      } catch { /* Slack not reachable */ }
    }

    // Microsoft Teams webhook channel
    if (channels.teams?.enabled && channels.teams?.webhookUrl) {
      try {
        const payload = {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          summary: notif.title,
          themeColor: '0076D7',
          title: notif.title,
          sections: [{ activityTitle: notif.title, text: notif.body }],
          potentialAction: [{
            '@type': 'OpenUri',
            name: 'View in AGRC-OS',
            targets: [{ os: 'default', uri: notif.link }],
          }],
        };
        await fetch(channels.teams.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(catchHandler(EC.AGENT_ACTION, {}));
      } catch { /* Teams not reachable */ }
    }
  } catch { /* outbound notification failure is non-fatal */ }
}

async function notifyPlatformAdmins(
  event: PlatformEvent,
  notif: { type: string; title: string; body: string; link: string }
): Promise<void> {
  try {
    if (!shouldSendNotification(event, notif.type)) return;

    const { createNotification } = await import('../../notification/services/notification.service');

    // Prefer super admins / owner admins in platform-management tenant context
    let admins = await safeQuery(
      `SELECT user_id
       FROM users
       WHERE tenant_id=$1
         AND (COALESCE(is_super_admin, FALSE)=TRUE OR role IN ('owner', 'admin'))
       ORDER BY COALESCE(is_super_admin, FALSE) DESC, created_at ASC
       LIMIT 10`,
      [event.tenantId]
    );

    // Backward-compatible fallback for older schemas lacking is_super_admin
    if (!admins.rows.length) {
      admins = await safeQuery(
        `SELECT user_id FROM users WHERE tenant_id=$1 AND role IN ('owner', 'admin') LIMIT 10`,
        [event.tenantId]
      );
    }

    for (const admin of admins.rows) {
      await createNotification(event.tenantId, { userId: admin.user_id, ...notif }).catch(catchHandler(EC.AGENT_ACTION, {}));
    }

    if (event.severity === 'critical' || event.eventType === 'report.overdue') {
      await sendOutboundNotifications(event.tenantId, notif);
    }
  } catch { /* best effort */ }
}

function shouldSendNotification(event: PlatformEvent, type: string): boolean {
  const now = Date.now();

  // Light cleanup to keep map bounded
  for (const [key, ts] of recentNotificationKeys.entries()) {
    if (now - ts > NOTIFICATION_DEDUP_WINDOW_MS) recentNotificationKeys.delete(key);
  }

  const payloadSignature = JSON.stringify(event.payload || {}).slice(0, 240);
  const dedupKey = [
    event.tenantId,
    type,
    event.eventType,
    event.entityType || '',
    event.entityId || '',
    event.severity,
    payloadSignature,
  ].join('|');

  const lastSentAt = recentNotificationKeys.get(dedupKey);
  if (lastSentAt && now - lastSentAt < NOTIFICATION_DEDUP_WINDOW_MS) {
    return false;
  }

  recentNotificationKeys.set(dedupKey, now);
  return true;
}
