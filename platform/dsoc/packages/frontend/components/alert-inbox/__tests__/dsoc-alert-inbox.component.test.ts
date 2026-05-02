/**
 * Logic-level test for DsocAlertInboxComponent — no Angular TestBed.
 * Verifies the file's surface (selector, class name, port reference,
 * standalone flag) so the build catches accidental regressions.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(process.cwd(), 'platform/dsoc/packages/frontend/components/alert-inbox/dsoc-alert-inbox.component.ts'),
  'utf8',
);

describe('DsocAlertInboxComponent — file surface', () => {
  it('is a standalone Angular component with the expected selector', () => {
    expect(SRC).toMatch(/standalone:\s*true/);
    expect(SRC).toMatch(/selector:\s*['"]dsoc-alert-inbox['"]/);
    expect(SRC).toMatch(/export class DsocAlertInboxComponent/);
  });

  it('uses OnPush change detection', () => {
    expect(SRC).toMatch(/changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });

  it('declares tenantId as a required input', () => {
    expect(SRC).toMatch(/@Input\(\{\s*required:\s*true\s*\}\)\s+tenantId/);
  });

  it('injects DSOC_ALERT_INBOX_PORT (no direct DSOC core import)', () => {
    expect(SRC).toMatch(/inject<DSOCAlertInboxPort>\(DSOC_ALERT_INBOX_PORT\)/);
    expect(SRC).not.toMatch(/from ['"]@dos\/dsoc-core/);
  });

  it('implements refresh / acknowledge / resolve handlers', () => {
    expect(SRC).toMatch(/async refresh\(\)/);
    expect(SRC).toMatch(/async acknowledge\(id: number\)/);
    expect(SRC).toMatch(/async resolve\(id: number\)/);
  });

  it('renders severity badges (template includes sev-* classes)', () => {
    expect(SRC).toMatch(/'sev-' \+ a\.severity/);
    for (const sev of ['critical', 'high', 'medium', 'low', 'info']) {
      expect(SRC).toMatch(new RegExp(`\\.sev-${sev}`));
    }
  });

  it('handles loading + error + empty states distinctly', () => {
    expect(SRC).toMatch(/loading\(\)/);
    expect(SRC).toMatch(/error\(\)\s+as\s+err/);
    expect(SRC).toMatch(/dsoc-alert-inbox__empty/);
  });

  it('uses signals for reactive state', () => {
    expect(SRC).toMatch(/from '@angular\/core'.*signal/s);
    expect(SRC).toMatch(/this\._alerts\.set/);
  });
});
