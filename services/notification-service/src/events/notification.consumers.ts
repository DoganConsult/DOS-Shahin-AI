import { RedisStreamEventBus } from '@dos/event-backbone';
import { createNotification } from '../domain/notification.service';
import { deliverViaEmail, deliverViaMjml, renderEmailTemplate } from '../domain/delivery.service';
import { postSlackAiAlert } from '../adapters/slack.adapter';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

const DEFAULT_APP_URL = 'https://shahin-ai.com';
/**
 * Resolve a non-empty string from a chain of env candidates. Uses explicit
 * truthiness + trim so that an accidentally-set `FOO=""` (empty string) or
 * `FOO="   "` (whitespace) does not satisfy `||` and propagate an empty
 * value into downstream `.replace()` calls. Returns `fallback` (a compile-time
 * constant string) when every candidate is absent or blank.
 */
function firstNonEmpty(candidates: Array<string | undefined>, fallback: string): string {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return fallback;
}
const APP_URL = firstNonEmpty([process.env.APP_URL], DEFAULT_APP_URL);
const PLATFORM_URL = firstNonEmpty([process.env.PLATFORM_URL], 'https://dogan-ai.com');
const VERIFY_URL = firstNonEmpty([process.env.EMAIL_VERIFY_URL], `${APP_URL}/verify-email`);
/** Public gateway base for new-user journey verify link (outbox: auth.verification_email_requested). */
function publicGatewayBase(): string {
  const raw = firstNonEmpty(
    [process.env.GATEWAY_PUBLIC_URL, process.env.APP_PUBLIC_URL, process.env.APP_URL],
    APP_URL,
  );
  return raw.replace(/\/$/, '');
}
const RESET_URL = process.env.PASSWORD_RESET_URL || `${APP_URL}/reset-password`;
const INVITE_URL = process.env.INVITATION_ACCEPT_URL || `${APP_URL}/invitations/accept`;

export function registerNotificationConsumers(bus: RedisStreamEventBus): void {
  bus.subscribe('auth.session.created', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.userId,
        title: 'New session started',
        body: 'A new login session was created for your account.',
        type: 'info',
        channel: 'inbox',
        module: 'auth',
        entityType: 'session',
        entityId: (event.payload as any)?.sessionId,
      });
    } catch {}
  });

  bus.subscribe('auth.login.failure', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.userId,
        title: 'Failed login attempt',
        body: 'A failed login attempt was detected on your account.',
        type: 'warning',
        channel: 'inbox',
        module: 'auth',
        entityType: 'session',
      });
    } catch {}
  });

  bus.subscribe('auth.password.changed', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.userId,
        title: 'Password changed',
        body: 'Your account password was recently changed.',
        type: 'info',
        channel: 'inbox',
        module: 'auth',
      });
    } catch {}
  });

  bus.subscribe('workflow.task.assigned', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.assigneeId,
        title: 'Task assigned to you',
        body: `You have been assigned task: ${(event.payload as any)?.taskTitle || (event.payload as any)?.taskId}`,
        type: 'action_required',
        channel: 'inbox',
        module: 'workflow',
        entityType: 'task',
        entityId: (event.payload as any)?.taskId,
      });
    } catch {}
  });

  bus.subscribe('workflow.task.completed', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.requesterId,
        title: 'Task completed',
        body: `Task "${(event.payload as any)?.taskTitle || (event.payload as any)?.taskId}" has been completed.`,
        type: 'info',
        channel: 'inbox',
        module: 'workflow',
        entityType: 'task',
        entityId: (event.payload as any)?.taskId,
      });
    } catch {}
  });

  bus.subscribe('workflow.task.cancelled', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.assigneeId,
        title: 'Task cancelled',
        body: `Task "${(event.payload as any)?.taskTitle || (event.payload as any)?.taskId}" has been cancelled.`,
        type: 'info',
        channel: 'inbox',
        module: 'workflow',
        entityType: 'task',
        entityId: (event.payload as any)?.taskId,
      });
    } catch {}
  });

  bus.subscribe('tenant.user.invited', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.invitedUserId,
        title: 'You have been invited',
        body: 'You have been invited to join the organization.',
        type: 'info',
        channel: 'inbox',
        module: 'tenant',
        entityType: 'invitation',
        entityId: (event.payload as any)?.invitationId,
      });
    } catch {}
  });

  bus.subscribe('tenant.user.removed', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.removedUserId,
        title: 'Removed from organization',
        body: 'You have been removed from the organization.',
        type: 'info',
        channel: 'inbox',
        module: 'tenant',
      });
    } catch {}
  });

  bus.subscribe('tenant.user.role.changed', async (event) => {
    try {
      await createNotification({
        tenantId: event.tenantId,
        userId: (event.payload as any)?.userId,
        title: 'Your role was updated',
        body: `Your role in the organization has been changed to ${(event.payload as any)?.newRole}.`,
        type: 'info',
        channel: 'inbox',
        module: 'tenant',
        entityType: 'membership',
        entityId: (event.payload as any)?.membershipId,
      });
    } catch {}
  });

  // ═══════════════════════════════════════════════════════════════
  // EMAIL DELIVERY CONSUMERS — send actual emails via Graph API
  // Platform emails: info@doganconsult.com (MFA, password reset, system)
  // Product emails: info@shahin-ai.com (welcome, reports, GRC alerts)
  // ═══════════════════════════════════════════════════════════════

  // Password reset — from PLATFORM (info@doganconsult.com)
  bus.subscribe('dauth.password_reset.requested', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.email;
      const token = p?.resetToken;
      if (!email) return;
      const resetLink = `${RESET_URL}?token=${token}`;
      await deliverViaEmail(
        email,
        'Password Reset — DOS Platform',
        `Click the link to reset your password: ${resetLink}`,
        'password_reset',
        {
          title: 'Password Reset Request',
          body: `A password reset was requested for your account. If you did not request this, please ignore this email. The link expires in 1 hour.`,
          ctaLabel: 'Reset Password',
          ctaUrl: resetLink,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'platform',
      );
      logger.info('[email-consumer] Password reset email sent', { to: email });
    } catch (err: any) { logger.error('[email-consumer] Password reset email failed', { error: err?.message }); }
  });

  // Email verification — legacy event name; same verify URL as auth.verification_email_requested (?t=)
  bus.subscribe('dauth.email_verification.requested', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.email;
      const token = p?.verificationToken;
      if (!email) return;
      const verifyLink = token
        ? `${publicGatewayBase()}/api/public/onboarding/new-user/verify-email?t=${encodeURIComponent(token)}`
        : `${VERIFY_URL}`;
      await deliverViaEmail(
        email,
        'Verify Your Email — Shahin-AI GRC',
        `Please verify your email address: ${verifyLink}`,
        'email_verification',
        {
          title: 'Email Verification',
          body: `Welcome! Please verify your email address to activate your account and start your GRC onboarding.`,
          ctaLabel: 'Verify Email',
          ctaUrl: verifyLink,
          recipientName: p?.userName,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'platform',
      );
      logger.info('[email-consumer] Verification email sent', { to: email });
    } catch (err: any) { logger.error('[email-consumer] Verification email failed', { error: err?.message }); }
  });

  // New-user registration — verify via onboarding-service public route (opaque ?t=)
  // Routed through MJML renderer (Phase 8.2): bilingual EN/AR, RTL-aware.
  bus.subscribe('auth.verification_email_requested', async (event) => {
    try {
      const p = event.payload as Record<string, unknown> | null;
      const email = typeof p?.email === 'string' ? p.email : '';
      const token = typeof p?.verificationToken === 'string' ? p.verificationToken : '';
      if (!email || !token) return;
      const verifyUrl = `${publicGatewayBase()}/api/public/onboarding/new-user/verify-email?t=${encodeURIComponent(token)}`;
      const lang = (p?.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
      await deliverViaMjml(
        email,
        'verification-email',
        lang,
        {
          verifyUrl,
          recipientName: typeof p?.userName === 'string' ? p.userName : '',
        },
        'product',
      );
      logger.info('[email-consumer] Journey verification email sent (MJML)', { to: email, lang });
    } catch (err: unknown) {
      logger.error('[email-consumer] Journey verification email failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // MFA code — from PLATFORM (info@doganconsult.com)
  bus.subscribe('dauth.mfa.code_sent', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.email;
      const code = p?.code;
      if (!email || !code) return;
      await deliverViaEmail(
        email,
        'Your verification code — DOS Platform',
        `Your MFA verification code is: ${code}`,
        'notification',
        {
          title: 'Verification Code',
          body: `Your one-time verification code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong><br><br>This code expires in 10 minutes. Do not share it with anyone.`,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'platform',
      );
      logger.info('[email-consumer] MFA code email sent', { to: email });
    } catch (err: any) { logger.error('[email-consumer] MFA code email failed', { error: err?.message }); }
  });

  // Invitation — from PRODUCT (info@shahin-ai.com)
  bus.subscribe('tenant.user.invited', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.invitedEmail;
      const token = p?.invitationToken;
      const orgName = p?.orgName || 'your organization';
      if (!email) return;
      const acceptLink = token ? `${INVITE_URL}?token=${token}` : APP_URL;
      await deliverViaEmail(
        email,
        `You're invited to join ${orgName} — Shahin-AI GRC`,
        `You have been invited to join ${orgName} on Shahin-AI GRC platform.`,
        'invitation',
        {
          title: `Invitation to ${orgName}`,
          body: `You have been invited to join <strong>${orgName}</strong> on the Shahin-AI GRC platform. Click the button below to accept the invitation and set up your account.`,
          ctaLabel: 'Accept Invitation',
          ctaUrl: acceptLink,
          recipientName: p?.invitedName,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'product',
      );
      logger.info('[email-consumer] Invitation email sent', { to: email });
    } catch (err: any) { logger.error('[email-consumer] Invitation email failed', { error: err?.message }); }
  });

  // Slice-1 carry #10 — Welcome-on-registration via Microsoft Graph 365.
  // Fires the moment a new tenant is bootstrapped from the Keycloak callback
  // (auth-service emits `workspace.provisioning.requested`). Distinct from
  // the post-onboarding `tenant.onboarding.completed` welcome below.
  bus.subscribe('workspace.provisioning.requested', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.email;
      const orgName = p?.companyName || 'your organization';
      if (!email) return;
      await deliverViaEmail(
        email,
        `Welcome to Shahin-AI — ${orgName}`,
        `Your Shahin-AI workspace is being provisioned. We will notify you the moment it is ready.`,
        'welcome',
        {
          title: 'Welcome to Shahin-AI',
          body: `Thanks for registering <strong>${orgName}</strong>. We are now provisioning your workspace on the Dogan-AI-OS platform — this usually completes within a minute. You will receive a second notification the moment it is ready.`,
          ctaLabel: 'Open Onboarding',
          ctaUrl: `${APP_URL}/onboarding`,
          recipientName: p?.userName || p?.firstName,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'product',
      );
      logger.info('[email-consumer] Registration welcome email sent', { to: email, tenantId: event.tenantId });
    } catch (err: any) {
      logger.error('[email-consumer] Registration welcome email failed', { error: err?.message });
    }
  });

  // Welcome — from PRODUCT (info@shahin-ai.com)
  bus.subscribe('tenant.onboarding.completed', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.ownerEmail;
      const orgName = p?.orgName || 'your organization';
      if (!email) return;
      await deliverViaEmail(
        email,
        `Welcome to Shahin-AI GRC — ${orgName}`,
        `Your workspace is ready! Log in to start managing governance, risk, and compliance.`,
        'welcome',
        {
          title: `Welcome to Shahin-AI GRC!`,
          body: `Your GRC workspace for <strong>${orgName}</strong> is fully provisioned and ready. You can now manage governance, risk, compliance, and audit across 52 integrated modules.`,
          ctaLabel: 'Open Workspace',
          ctaUrl: `${APP_URL}/workspace-home`,
          recipientName: p?.ownerName,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'product',
      );
      logger.info('[email-consumer] Welcome email sent', { to: email });
    } catch (err: any) { logger.error('[email-consumer] Welcome email failed', { error: err?.message }); }
  });

  // Approval request — from PRODUCT (info@shahin-ai.com)
  bus.subscribe('workflow.approval.requested', async (event) => {
    try {
      const p = event.payload as any;
      if (!p?.approverEmail) return;
      await deliverViaEmail(
        p.approverEmail,
        `Approval Required — ${p?.entityTitle || 'Action Pending'}`,
        `You have a pending approval request in ${p?.moduleCode || 'the platform'}.`,
        'approval_request',
        {
          title: 'Approval Required',
          body: `<strong>${p?.requestorName || 'A team member'}</strong> has submitted <strong>${p?.entityTitle || 'an item'}</strong> for your approval in the ${p?.moduleCode || ''} module.`,
          ctaLabel: 'Review & Approve',
          ctaUrl: p?.approvalUrl || `${APP_URL}/workflow/approvals`,
          recipientName: p?.approverName,
          language: (p?.language as 'en' | 'ar') || 'en',
        },
        'product',
      );
    } catch (err: any) { logger.error('[email-consumer] Approval email failed', { error: err?.message }); }
  });

  // Incident alert — from PRODUCT (info@shahin-ai.com)
  bus.subscribe('incident.created', async (event) => {
    try {
      const p = event.payload as any;
      if (!p?.notifyEmails?.length) return;
      for (const email of p.notifyEmails) {
        await deliverViaEmail(
          email,
          `Incident Reported — ${p?.title || 'New Incident'}`,
          `A new ${p?.severity || ''} incident has been reported: ${p?.title}`,
          'incident_alert',
          {
            title: `${(p?.severity || 'NEW').toUpperCase()} Incident`,
            body: `<strong>${p?.title}</strong><br>${p?.description || ''}<br><br>Severity: <strong>${p?.severity || 'unknown'}</strong>`,
            ctaLabel: 'View Incident',
            ctaUrl: p?.incidentUrl || `${APP_URL}/incidents/${p?.incidentId}`,
          },
          'product',
        );
      }
    } catch (err: any) { logger.error('[email-consumer] Incident alert email failed', { error: err?.message }); }
  });

  // ═══════════════════════════════════════════════════════════════
  // AI-OS ALERT FIRED — Wave 6 alert-rules-runner emits this when a rule
  // breaches. Fans out to: (a) inbox notification for routing/auditability,
  // (b) bilingual MJML email to per-tenant operator distribution list,
  // (c) Slack channel post for both warning and critical severities.
  //
  // Source of truth for the alert payload is the engine-side Breach object
  // emitted by alert-rules-runner.service.ts. We treat this consumer as a
  // pure dispatcher — durable record already exists in public.ai_activity_alerts.
  // ═══════════════════════════════════════════════════════════════
  bus.subscribe('ai.alert.fired', async (event) => {
    try {
      const p = (event.payload || {}) as Record<string, unknown>;
      const ruleName = String(p.ruleName ?? p.rule_name ?? 'unknown_rule');
      const severityRaw = String(p.severity ?? 'warning').toLowerCase();
      const severity: 'info' | 'warning' | 'critical' =
        severityRaw === 'critical' ? 'critical' : severityRaw === 'info' ? 'info' : 'warning';
      const message = String(p.message ?? `${ruleName} fired`);
      const tenantId = (event.tenantId ?? (p.tenantId as string) ?? null) as string | null;
      const entityType = (p.entityType as string | null) ?? null;
      const entityId = (p.entityId as string | null) ?? null;
      const metadata = (p.metadata as Record<string, unknown> | undefined) || {};
      const firedAt = String(p.firedAt ?? new Date().toISOString());
      const lang: 'en' | 'ar' = p.language === 'ar' ? 'ar' : 'en';

      const dnocUrl = `${APP_URL}/workspace/dnoc/ai-ops`;
      const dsocUrl = `${APP_URL}/workspace/dsoc/ai-security`;
      const alertUrl = severity === 'critical' ? dsocUrl : dnocUrl;
      const metricSummary = formatMetricSummary(metadata);

      // (a) Inbox notification — routes to the AI-Ops inbox for dispatcher
      // routing / per-user feed. Type maps to the FE notification badge.
      // Skip when tenantId is null (platform-wide rules) since the
      // dos.notifications table requires a tenant scope.
      if (tenantId) {
        try {
          await createNotification({
            tenantId,
            userId: 'platform-ops',
            title: `[${severity.toUpperCase()}] ${ruleName}`,
            body: message,
            type: severity === 'critical' ? 'critical' : 'warning',
            channel: 'inbox',
            module: 'ai',
            entityType: entityType ?? 'ai_alert_rule',
            entityId: entityId ?? null,
          });
        } catch (err) {
          logger.warn('[ai-alert-consumer] inbox notification failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // (b) Bilingual MJML email to per-tenant ops distribution list.
      const recipients = await resolveAiAlertRecipients(tenantId);
      if (recipients.length > 0) {
        const templateId = severity === 'critical' ? 'ai-alert-critical' : 'ai-alert-warning';
        for (const to of recipients) {
          try {
            await deliverViaMjml(
              to,
              templateId,
              lang,
              {
                ruleName,
                tenantId: tenantId ?? 'all-tenants',
                metricSummary,
                alertUrl,
                firedAt,
              },
              'platform',
            );
          } catch (err) {
            logger.warn('[ai-alert-consumer] email delivery failed', {
              to, ruleName, templateId,
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6).join(' | ') : undefined,
            });
          }
        }
        logger.info('[ai-alert-consumer] AI alert email fan-out', {
          ruleName, severity, recipients: recipients.length,
        });
      } else {
        logger.debug?.('[ai-alert-consumer] no AI-alert recipients configured', { tenantId, ruleName });
      }

      // (c) Slack — best-effort, no-op if webhook not set.
      await postSlackAiAlert({
        ruleName, severity, message, tenantId, entityType, entityId,
        metricSummary, alertUrl, firedAt,
      });
    } catch (err) {
      logger.error('[ai-alert-consumer] handler failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC COPILOT LEAD CAPTURED — A13 / landing copilot fires this
  // event when an anonymous visitor submits an email along with their
  // chat message. We send a single confirmation email so the visitor
  // knows the message landed; Sales follows up via copilot-leads UI.
  // ═══════════════════════════════════════════════════════════════
  bus.subscribe('ai.copilot.lead.captured', async (event) => {
    try {
      const p = (event.payload || {}) as Record<string, unknown>;
      const email = typeof p.email === 'string' ? p.email : null;
      if (!email) return;  // anonymous lead with no email — no confirmation possible
      const intent = String(p.intent ?? 'general');
      const message = String(p.message ?? '');
      const lang = (p.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
      const intentLabelByLang: Record<string, Record<string, string>> = {
        en: { demo: 'A product demo', pricing: 'Pricing information', contact: 'Contacting our team', docs: 'Documentation', general: 'General Q&A' },
        ar: { demo: 'عرض توضيحي للمنتج', pricing: 'معلومات الأسعار', contact: 'التواصل مع الفريق', docs: 'الوثائق', general: 'استفسار عام' },
      };
      const intentLabel = intentLabelByLang[lang][intent] ?? intent;
      await deliverViaMjml(
        email,
        'copilot-lead-thanks',
        lang,
        {
          recipientName: typeof p.company === 'string' ? p.company : '',
          intentLabel,
          message: message.slice(0, 500),
          ctaUrl: APP_URL,
        },
        'product',  // from info@shahin-ai.com
      );
      logger.info('[email-consumer] Copilot lead-thanks email sent', { to: email, intent, lang });
    } catch (err: unknown) {
      logger.error('[email-consumer] Copilot lead-thanks email failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Team invite from onboarding — sends invitation email to the invitee
  bus.subscribe('dauth.team_invite.requested', async (event) => {
    try {
      const p = event.payload as any;
      const email = p?.email;
      if (!email) return;

      // Resolve org name from tenant
      let orgName = 'your organization';
      if (event.tenantId) {
        try {
          const tenantResult = await safeQuery(
            'SELECT org_name FROM public.tenants WHERE tenant_id = $1',
            [event.tenantId],
          );
          if (tenantResult.rows[0]?.org_name) orgName = tenantResult.rows[0].org_name;
        } catch {}
      }

      const acceptLink = p?.inviteToken
        ? `${INVITE_URL}?token=${p.inviteToken}&tenant=${event.tenantId || ''}`
        : APP_URL;

      await deliverViaEmail(
        email,
        `You're invited to join ${orgName} — Shahin-AI GRC`,
        `You have been invited to join ${orgName} on Shahin-AI GRC platform as ${p?.role || 'team member'}.`,
        'invitation',
        {
          title: `Invitation to ${orgName}`,
          body: `You have been invited to join <strong>${orgName}</strong> on the Shahin-AI GRC platform as <strong>${p?.role || 'team member'}</strong>. Click the button below to accept the invitation and set up your account.`,
          ctaLabel: 'Accept Invitation',
          ctaUrl: acceptLink,
          recipientName: p?.name || email.split('@')[0],
          language: 'en',
        },
        'product',
      );
      logger.info('[email-consumer] Team invite email sent', { to: email, tenant: event.tenantId });
    } catch (err: any) { logger.error('[email-consumer] Team invite email failed', { error: err?.message }); }
  });
}

/**
 * Build a one-line metric summary from the breach metadata for display in
 * email + Slack. Picks the well-known fields the alert-rules-runner emits
 * (pct, spent, cap, errorRate, runs, pending, denyRate, count) and falls
 * back to JSON.stringify for unknown shapes.
 */
function formatMetricSummary(meta: Record<string, unknown>): string {
  if (!meta || typeof meta !== 'object') return '—';
  const m = meta as Record<string, number | string | undefined>;
  if (m.pct != null && m.spent != null && m.cap != null) {
    return `${m.pct}% of cap ($${Number(m.spent).toFixed(2)} / $${Number(m.cap).toFixed(2)})`;
  }
  if (m.errorRate != null && m.runs != null) {
    const pct = (Number(m.errorRate) * 100).toFixed(1);
    return `error rate ${pct}% over ${m.runs} runs (${m.agentName ?? m.agentId ?? 'agent'})`;
  }
  if (m.pending != null) {
    const oldest = m.oldestAgeSeconds != null ? Math.floor(Number(m.oldestAgeSeconds) / 60) : null;
    return `${m.pending} pending HITL items${oldest != null ? ` (oldest ${oldest}min)` : ''}`;
  }
  if (m.denyRate != null && m.allowed != null && m.denied != null) {
    return `deny rate ${Number(m.denyRate).toFixed(1)}% (${m.denied}/${Number(m.allowed) + Number(m.denied)})`;
  }
  if (m.count != null && m.windowHours != null) {
    return `${m.count} events in last ${m.windowHours}h`;
  }
  try {
    const compact = Object.entries(m)
      .filter(([, v]) => v !== undefined && v !== null && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    return compact || JSON.stringify(m).slice(0, 160);
  } catch {
    return '—';
  }
}

/**
 * Resolve the email recipients for AI-OS alerts.
 *
 * Lookup order:
 *  1. dos.tenants.config -> ai_ops_alert_emails (jsonb array on the tenant row)
 *  2. AI_OPS_ALERT_EMAILS env var (comma-separated) — global fallback
 *
 * No tenants.config table query failure should block the alert; on any
 * error we fall back to the env list.
 */
async function resolveAiAlertRecipients(tenantId: string | null): Promise<string[]> {
  const envList = (process.env.AI_OPS_ALERT_EMAILS || '')
    .split(',').map((s) => s.trim()).filter((s) => s.length > 0);

  if (!tenantId) return envList;

  try {
    const r = await safeQuery(
      `SELECT settings -> 'ai_ops_alert_emails' AS emails
         FROM dos.tenants
        WHERE tenant_id = $1
        LIMIT 1`,
      [tenantId],
    );
    const raw = r.rows?.[0]?.emails;
    if (Array.isArray(raw)) {
      const tenantList = raw.filter((e: unknown): e is string => typeof e === 'string' && e.includes('@'));
      if (tenantList.length > 0) return Array.from(new Set([...tenantList, ...envList]));
    }
  } catch {
    // settings JSONB key may not be set on every tenant — fall through to
    // env list. The breach is already durably recorded in ai_activity_alerts.
  }
  return envList;
}
