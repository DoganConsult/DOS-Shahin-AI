/**
 * PlatformNotifications adapter — delegates to the real email delivery
 * service (Microsoft Graph API → SMTP fallback) that lives in this service.
 *
 * Registered via setNotificationProvider() at service bootstrap so any code
 * calling sendEmail() from @dos/platform-core/notifications hits this
 * single-source-of-truth adapter.
 */

import {
  setNotificationProvider,
  type PlatformNotifications,
  type EmailAttachment,
  type UpsertEmailTemplateInput,
} from '@dos/platform-core/notifications';
import { logger } from '@dos/platform-core/observability';
import * as nodemailer from 'nodemailer';
import {
  deliverViaEmail,
  deliverViaMjml,
  renderEmailTemplate as renderLegacyTemplate,
  type EmailTemplateName,
  type EmailTemplateData,
  type EmailDeliveryResult,
} from '../domain/delivery.service';
import { renderEmail, type TemplateId as MjmlTemplateId, type Lang as MjmlLang } from '../domain/mjml-renderer.service';

const KNOWN_MJML_TEMPLATES: readonly MjmlTemplateId[] = [
  'verification-email',
  'welcome-email',
  'password-reset',
  'mfa-code',
  'ai-alert-warning',
  'ai-alert-critical',
  'copilot-lead-thanks',
] as const;

function isMjmlTemplate(id: string): id is MjmlTemplateId {
  return (KNOWN_MJML_TEMPLATES as readonly string[]).includes(id);
}

function coerceRecipient(to: string | string[]): string[] {
  return Array.isArray(to) ? to : [to];
}

function resolveLang(vars: Record<string, unknown>): MjmlLang {
  const candidate = (vars.lang ?? vars.locale) as string | undefined;
  return candidate === 'ar' ? 'ar' : 'en';
}

/**
 * Coerce a variables map into the strict EmailTemplateData shape that
 * deliverViaEmail's templated path expects. Required fields fall back
 * to safe defaults so a malformed call still renders something readable.
 */
function toEmailTemplateData(subject: string, body: string, variables: Record<string, unknown>): EmailTemplateData {
  const lang = resolveLang(variables);
  return {
    title: (variables.title as string) ?? subject,
    body: (variables.body as string) ?? body,
    recipientName: variables.recipientName as string | undefined,
    ctaLabel: variables.ctaLabel as string | undefined,
    ctaUrl: variables.ctaUrl as string | undefined,
    footerNote: variables.footerNote as string | undefined,
    language: lang,
  };
}

async function throwOnFailure(
  result: EmailDeliveryResult,
  ctx: { to: string | string[]; subject?: string; template?: string },
): Promise<void> {
  if (!result.success) {
    logger.error('[notifications-adapter] Email delivery failed', {
      to: ctx.to,
      subject: ctx.subject,
      template: ctx.template,
      attempts: result.attempts,
      provider: result.provider,
      error: result.error,
    });
    throw new Error(`Email delivery failed after ${result.attempts} attempts: ${result.error ?? 'unknown'}`);
  }
}

export class NotificationServiceAdapter implements PlatformNotifications {
  async sendEmail(
    to: string | string[],
    subject: string,
    body: string,
    _opts?: { from?: string; html?: boolean },
  ): Promise<void> {
    const recipients = coerceRecipient(to);
    for (const recipient of recipients) {
      const result = await deliverViaEmail(recipient, subject, body);
      await throwOnFailure(result, { to: recipient, subject });
    }
  }

  async sendTemplatedEmail(
    to: string | string[],
    templateId: string,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const recipients = coerceRecipient(to);

    if (isMjmlTemplate(templateId)) {
      const lang = resolveLang(variables);
      for (const recipient of recipients) {
        const result = await deliverViaMjml(recipient, templateId, lang, variables);
        await throwOnFailure(result, { to: recipient, template: templateId });
      }
      return;
    }

    // Legacy/simple templates rendered via renderEmailTemplate +
    // deliverViaEmail. Subject comes from variables.subject if provided,
    // otherwise we fall back to the template id.
    const subject = (variables.subject as string) ?? templateId;
    const body = (variables.body as string) ?? '';
    const templateData = toEmailTemplateData(subject, body, variables);
    for (const recipient of recipients) {
      const result = await deliverViaEmail(
        recipient,
        subject,
        body,
        templateId as EmailTemplateName,
        templateData,
      );
      await throwOnFailure(result, { to: recipient, subject, template: templateId });
    }
  }

  async sendEmailWithAttachments(
    to: string | string[],
    subject: string,
    body: string,
    attachments: EmailAttachment[],
  ): Promise<void> {
    // delivery.service.ts doesn't expose an attachments path directly; use
    // nodemailer transport inline for this case. Reuses the same SMTP
    // credentials as the fallback path in deliver.service.
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        '[notifications-adapter] Attachments path requires SMTP_HOST/SMTP_USER/SMTP_PASS. ' +
          'Graph API path does not support attachments in this adapter; configure SMTP.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = `<div style="font-family:sans-serif;padding:20px">${body}</div>`;
    const mailAttachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    }));

    const recipients = coerceRecipient(to);
    for (const recipient of recipients) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || smtpUser,
          to: recipient,
          subject,
          html,
          text: body,
          attachments: mailAttachments,
        });
      } catch (err: unknown) {
        logger.error('[notifications-adapter] sendEmailWithAttachments failed', {
          to: recipient,
          subject,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }
  }

  async renderEmailTemplate(templateId: string, variables: Record<string, unknown>): Promise<string> {
    if (isMjmlTemplate(templateId)) {
      const lang = resolveLang(variables);
      const rendered = renderEmail(templateId, lang, variables);
      return rendered.html;
    }
    // Legacy template path
    const subject = (variables.subject as string) ?? templateId;
    const body = (variables.body as string) ?? '';
    return renderLegacyTemplate(templateId as EmailTemplateName, toEmailTemplateData(subject, body, variables));
  }

  async renderInvitationEmail(variables: Record<string, unknown>): Promise<string> {
    // The MJML 'invitation' template is not in KNOWN_MJML_TEMPLATES yet;
    // use the legacy 'invitation' template if available, else a minimal
    // inline HTML. Real invitation templates can be added to mjml-renderer
    // without touching this adapter.
    const subject = (variables.subject as string) ?? 'You are invited';
    const body = (variables.body as string) ?? '';
    try {
      return renderLegacyTemplate('invitation' as EmailTemplateName, toEmailTemplateData(subject, body, variables));
    } catch {
      const name = (variables.name as string) ?? 'there';
      const link = (variables.invitationUrl as string) ?? '#';
      return `<div style="font-family:sans-serif;padding:20px">
        <h2>You're invited</h2>
        <p>Hi ${name},</p>
        <p><a href="${link}">Accept the invitation</a></p>
      </div>`;
    }
  }
}

let _registered = false;

/** Idempotent registration of the PlatformNotifications adapter. */
export function registerNotificationsAdapter(): void {
  if (_registered) return;
  setNotificationProvider(new NotificationServiceAdapter());
  _registered = true;
  logger.info('[notifications-adapter] Registered NotificationServiceAdapter with @dos/platform-core/notifications');
}
