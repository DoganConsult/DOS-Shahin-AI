/**
 * Wave 18 — unit tests for channel adapter pure renderers + validators.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { SlackAdapter } = require('../../dist/infrastructure/integrations/notification-channels/slack.adapter.js');
const { TeamsAdapter } = require('../../dist/infrastructure/integrations/notification-channels/teams.adapter.js');
const { EmailAdapter } = require('../../dist/infrastructure/integrations/notification-channels/email.adapter.js');
const { listRegisteredChannels } = require('../../dist/infrastructure/integrations/notification-channels/channel.contract.js');

const samplePayload = {
  tenantId: 'tenant-1',
  title: 'Compliance Gap Detected',
  body: 'Control AC-2(1) failed effectiveness test on resource arn:aws:iam::1234:user/foo',
  severity: 'critical',
  fields: [
    { name: 'Control', value: 'AC-2(1)' },
    { name: 'Framework', value: 'NIST 800-53' },
    { name: 'Resource', value: 'arn:aws:iam::1234:user/foo' },
  ],
  actions: [{ label: 'View Gap', url: 'https://shahin-ai.com/compliance/gaps/123' }],
  eventCode: 'compliance.gap_detected',
  idempotencyKey: 'sha256-of-tenant-event-correlation',
};

test('all 3 channel adapters registered', () => {
  const channels = listRegisteredChannels();
  assert.ok(channels.includes('slack'));
  assert.ok(channels.includes('teams'));
  assert.ok(channels.includes('email'));
});

test('Slack validate: requires hooks.slack.com URL', () => {
  const a = new SlackAdapter();
  assert.equal(a.validate({ webhookUrl: 'https://hooks.slack.com/services/T/B/X' }).ok, true);
  assert.equal(a.validate({ webhookUrl: 'https://example.com/webhook' }).ok, false);
  assert.equal(a.validate({}).ok, false);
});

test('Slack render: severity icon + color attachment', () => {
  const a = new SlackAdapter();
  const out = a.renderSlackBlocks(samplePayload, { webhookUrl: 'https://hooks.slack.com/services/X/Y/Z' });
  assert.ok(out.attachments);
  assert.equal(out.attachments[0].color, '#d50200');
  const blocks = out.attachments[0].blocks;
  assert.equal(blocks[0].type, 'header');
  assert.match(blocks[0].text.text, /🔴/);
  // Has facts section + actions section + context
  assert.ok(blocks.find((b) => b.type === 'section' && b.fields));
  assert.ok(blocks.find((b) => b.type === 'actions'));
  assert.ok(blocks.find((b) => b.type === 'context'));
});

test('Teams validate: webhook.office.com or logic.azure.com', () => {
  const a = new TeamsAdapter();
  assert.equal(a.validate({ webhookUrl: 'https://outlook.webhook.office.com/abc' }).ok, true);
  assert.equal(a.validate({ webhookUrl: 'https://prod-12.westeurope.logic.azure.com:443/workflows/x/triggers/manual' }).ok, true);
  assert.equal(a.validate({ webhookUrl: 'https://example.com/webhook' }).ok, false);
});

test('Teams render: AdaptiveCard 1.5 with FactSet + actions', () => {
  const a = new TeamsAdapter();
  const out = a.renderAdaptiveCard(samplePayload);
  assert.equal(out.type, 'message');
  const card = out.attachments[0].content;
  assert.equal(card.type, 'AdaptiveCard');
  assert.equal(card.version, '1.5');
  // Has FactSet
  const factSet = card.body.find((b) => b.type === 'FactSet');
  assert.ok(factSet);
  assert.ok(factSet.facts.find((f) => f.title === 'Control'));
  assert.ok(factSet.facts.find((f) => f.title === 'Tenant'));
  // Critical → Attention color
  const headerBlock = card.body[0];
  assert.equal(headerBlock.color, 'Attention');
  // Action.OpenUrl
  assert.equal(card.actions[0].type, 'Action.OpenUrl');
});

test('Email validate: requires non-empty to + valid from', () => {
  const a = new EmailAdapter();
  assert.equal(a.validate({ to: ['x@y.com'], from: 'a@b.com', smtpHost: 'smtp.x' }).ok, true);
  assert.equal(a.validate({ to: [], from: 'a@b.com' }).ok, false);
  assert.equal(a.validate({ to: ['x@y.com'], from: 'not-email' }).ok, false);
  assert.equal(a.validate({ to: ['x@y.com'], from: 'a@b.com', transport: 'ses' }).ok, false); // missing apiKeyRef
  assert.equal(a.validate({ to: ['x@y.com'], from: 'a@b.com', transport: 'ses', apiKeyRef: 'k' }).ok, true);
});

test('Email render: HTML escapes user input', () => {
  const a = new EmailAdapter();
  const html = a.renderHtml({
    ...samplePayload,
    title: '<script>alert(1)</script>',
    body: 'XSS attempt: <img src=x>',
  });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img src=x&gt;'));
});

test('Email render: text body preserves structure', () => {
  const a = new EmailAdapter();
  const text = a.renderText(samplePayload);
  assert.ok(text.includes('CRITICAL'));
  assert.ok(text.includes('Control: AC-2(1)'));
  assert.ok(text.includes('https://shahin-ai.com/compliance/gaps/123'));
  assert.ok(text.includes('Tenant: tenant-1'));
});
