import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(process.cwd(), 'platform/dauth/packages/frontend/components/access-inspector/dauth-access-inspector.component.ts'),
  'utf8',
);

describe('DauthAccessInspectorComponent — file surface', () => {
  it('is a standalone Angular component with the expected selector', () => {
    expect(SRC).toMatch(/standalone:\s*true/);
    expect(SRC).toMatch(/selector:\s*['"]dauth-access-inspector['"]/);
    expect(SRC).toMatch(/export class DauthAccessInspectorComponent/);
  });

  it('uses OnPush change detection', () => {
    expect(SRC).toMatch(/changeDetection:\s*ChangeDetectionStrategy\.OnPush/);
  });

  it('uses FormsModule for ngModel-driven form', () => {
    expect(SRC).toMatch(/FormsModule/);
    expect(SRC).toMatch(/\[\(ngModel\)\]="action"/);
    expect(SRC).toMatch(/\[\(ngModel\)\]="resourceType"/);
  });

  it('injects DAuthHttpClient (no direct DAuth core import)', () => {
    expect(SRC).toMatch(/inject\(DAuthHttpClient\)/);
    expect(SRC).not.toMatch(/from ['"]@dos\/dauth-core/);
  });

  it('run() handler calls checkAccess through the HTTP client', () => {
    expect(SRC).toMatch(/async run\(\):\s*Promise<void>/);
    expect(SRC).toMatch(/this\.client\.checkAccess\(\{/);
  });

  it('parses the roles CSV into an array before submitting', () => {
    expect(SRC).toMatch(/this\.rolesCsv[\s\S]*\.split\(','\)/);
  });

  it('renders distinct allow / deny styles', () => {
    expect(SRC).toMatch(/h3\.allow/);
    expect(SRC).toMatch(/h3\.deny/);
  });

  it('handles busy + error + result states via signals', () => {
    expect(SRC).toMatch(/readonly busy = signal/);
    expect(SRC).toMatch(/readonly error = signal/);
    expect(SRC).toMatch(/readonly result = signal/);
  });
});
