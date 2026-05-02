/**
 * Contract tests for the PlatformNotifications port.
 *
 * Verifies:
 *   - sendEmail / sendTemplatedEmail delegate to a registered provider
 *   - sendEmailWithAttachments throws clearly when no provider (binary
 *     payloads cannot use the event-bus fanback)
 *   - render*/list*/upsert* operations require an in-process provider
 *     and throw a clear error when none is registered
 *   - clearNotificationProvider isolates state across tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setNotificationProvider,
  clearNotificationProvider,
  sendEmail,
  sendTemplatedEmail,
  sendEmailWithAttachments,
  renderEmailTemplate,
  renderInvitationEmail,
  listEmailTemplates,
  upsertEmailTemplate,
  getEmailSendLog,
  NOTIFICATIONS_SEND_EMAIL_EVENT,
  NOTIFICATIONS_SEND_TEMPLATED_EVENT,
  type PlatformNotifications,
} from '../notifications/notifications';

function makeProvider(overrides: Partial<PlatformNotifications> = {}): PlatformNotifications {
  return {
    sendEmail: vi.fn().mockResolvedValue(undefined),
    sendTemplatedEmail: vi.fn().mockResolvedValue(undefined),
    sendEmailWithAttachments: vi.fn().mockResolvedValue(undefined),
    renderEmailTemplate: vi.fn().mockResolvedValue('<html>rendered</html>'),
    renderInvitationEmail: vi.fn().mockResolvedValue('<html>invite</html>'),
    ...overrides,
  };
}

describe('PlatformNotifications port — contract', () => {
  beforeEach(() => {
    clearNotificationProvider();
  });

  it('sendEmail delegates to registered provider', async () => {
    const provider = makeProvider();
    setNotificationProvider(provider);

    await sendEmail('to@example.com', 'Hi', 'body');
    expect(provider.sendEmail).toHaveBeenCalledWith('to@example.com', 'Hi', 'body', undefined);
  });

  it('sendTemplatedEmail delegates to registered provider', async () => {
    const provider = makeProvider();
    setNotificationProvider(provider);

    await sendTemplatedEmail('to@example.com', 'welcome', { name: 'Ada' });
    expect(provider.sendTemplatedEmail).toHaveBeenCalledWith('to@example.com', 'welcome', { name: 'Ada' });
  });

  it('sendEmailWithAttachments throws cleanly when no provider', async () => {
    await expect(
      sendEmailWithAttachments('to@example.com', 'Sub', 'body', [
        { filename: 'a.txt', content: 'hello' },
      ]),
    ).rejects.toThrow(/sendEmailWithAttachments requires an in-process/);
  });

  it('renderEmailTemplate throws clearly when no provider', async () => {
    await expect(renderEmailTemplate('welcome', {})).rejects.toThrow(
      /renderEmailTemplate\(\) requires an in-process/,
    );
  });

  it('renderInvitationEmail throws clearly when no provider', async () => {
    await expect(renderInvitationEmail({})).rejects.toThrow(
      /renderInvitationEmail\(\) requires an in-process/,
    );
  });

  it('listEmailTemplates is unsupported when provider lacks the method', async () => {
    setNotificationProvider(makeProvider()); // no listEmailTemplates
    await expect(listEmailTemplates('tenant-1')).rejects.toThrow(
      /listEmailTemplates\(\) not supported/,
    );
  });

  it('upsertEmailTemplate routes to optional method when present', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'tpl-1' });
    setNotificationProvider(makeProvider({ upsertEmailTemplate: upsert }));

    const result = await upsertEmailTemplate('tenant-1', {
      templateKey: 'welcome',
      nameEn: 'Welcome',
      subjectEn: 'Hi',
      bodyHtmlEn: '<p>hi</p>',
    });
    expect(upsert).toHaveBeenCalled();
    expect(result).toEqual({ id: 'tpl-1' });
  });

  it('getEmailSendLog throws when provider lacks the method', async () => {
    setNotificationProvider(makeProvider());
    await expect(getEmailSendLog('tenant-1')).rejects.toThrow(
      /getEmailSendLog\(\) not supported/,
    );
  });

  it('exports stable bus event channel constants', () => {
    expect(NOTIFICATIONS_SEND_EMAIL_EVENT).toBe('notifications.send-email');
    expect(NOTIFICATIONS_SEND_TEMPLATED_EVENT).toBe('notifications.send-templated');
  });
});
