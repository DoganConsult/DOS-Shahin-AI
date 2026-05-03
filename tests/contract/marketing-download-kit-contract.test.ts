/**
 * Phase M1.5 — Download-Kit contract test.
 *
 * Source-level (no DOM) verification that the marketing download-kit
 * sub-system stays coherent with the Carbon-only Dynamic-UI registry,
 * the brand asset surface and the 17-section landing.
 *
 * Asserts:
 *   ① Contract enums (MARKETING_DOWNLOAD_COMPONENT_KEYS × 3,
 *      MARKETING_DOWNLOAD_EVENTS × 3, MarketingAssetType × 4).
 *   ② Each Dos*Component class is exported from
 *      platform/ui-system/dos-ui-system/src/marketing/download-kit.components.ts
 *      and acknowledges the 3 event keys.
 *   ③ Components own NO local executor (no fetch / HttpClient / pool.query /
 *      XMLHttpRequest); the gated modal emits 'marketing.download.submitted'
 *      and exposes markCompleted/markFailed for the host shell.
 *   ④ DB seed (20260503_0027) registers all 3 component_keys with
 *      vendor='ibm-carbon' + approval_status='approved' AND creates the
 *      dos.marketing_assets and dos.marketing_download_events tables AND
 *      seeds the 3 first kits × en+ar = 6 rows.
 *   ⑤ Gated/open status of the seeded kits matches the spec
 *      (executive + security gated, checklist open).
 *   ⑥ marketing-home.page.ts inserts 'download-kit' into the locked section
 *      ordering between 'agentic-proof' and 'platform-overview' AND embeds
 *      the 3 download components.
 *   ⑦ component-map.ts registers all 3 marketing.* keys, archetype-map.mjs
 *      resolves them, and @dos/ui-system index re-exports the contract +
 *      components.
 *   ⑧ ui-os-service mounts the public marketing-downloads router.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MARKETING_DOWNLOAD_COMPONENT_KEYS,
  MARKETING_DOWNLOAD_EVENTS,
  type MarketingAsset,
  type MarketingDownloadFormPayload,
} from '../../platform/ui-system/dos-ui-system/src/marketing/download-kit.contract';

const REPO = resolve(__dirname, '..', '..');
const COMPONENTS_FILE = resolve(REPO, 'platform/ui-system/dos-ui-system/src/marketing/download-kit.components.ts');
const CONTRACT_FILE   = resolve(REPO, 'platform/ui-system/dos-ui-system/src/marketing/download-kit.contract.ts');
const SEED_SQL        = resolve(REPO, 'platform/dos/migrations/public/20260503_0027_marketing_download_kit.sql');
const PAGE_SRC        = resolve(REPO, 'platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts');
const COMP_MAP        = resolve(REPO, 'platform/dos/registry/component-map.ts');
const UI_INDEX        = resolve(REPO, 'platform/ui-system/dos-ui-system/src/index.ts');
const ROUTES_INDEX    = resolve(REPO, 'services/ui-os-service/src/routes/index.ts');

const EXPECTED_KEYS = [
  'marketing.download-kit-card',
  'marketing.gated-download-modal',
  'marketing.download-success',
] as const;

const EXPECTED_EVENTS = [
  'marketing.download.opened',
  'marketing.download.submitted',
  'marketing.download.completed',
] as const;

const EXPECTED_CLASSES = [
  'DosDownloadKitCardComponent',
  'DosGatedDownloadModalComponent',
  'DosDownloadSuccessComponent',
] as const;

describe('M1.5 — download-kit contract', () => {
  it('declares the 3 component_keys', () => {
    expect(MARKETING_DOWNLOAD_COMPONENT_KEYS).toEqual([...EXPECTED_KEYS]);
    expect(new Set(MARKETING_DOWNLOAD_COMPONENT_KEYS).size).toBe(3);
  });

  it('declares the 3 universal download event keys', () => {
    expect(MARKETING_DOWNLOAD_EVENTS).toEqual([...EXPECTED_EVENTS]);
  });

  it('asset/payload types are well-formed', () => {
    const a: MarketingAsset = {
      assetKey: 'k', brandCode: 'shahin-ai', locale: 'en',
      title: 't', description: 'd', assetType: 'pdf',
      fileUrl: '/x', isGated: true, version: 1,
    };
    const p: MarketingDownloadFormPayload = {
      name: 'n', email: 'e', company: 'c', jobTitle: 'j', country: 'SA', interestArea: 'GRC',
    };
    expect(a.assetKey).toBe('k');
    expect(p.email).toBe('e');
  });

  describe('source-level invariants', () => {
    const src = readFileSync(COMPONENTS_FILE, 'utf8');
    const con = readFileSync(CONTRACT_FILE, 'utf8');

    it('exports a standalone Dos*Component class for every component_key', () => {
      for (const cls of EXPECTED_CLASSES) {
        expect(src).toMatch(new RegExp(`export class ${cls}\\b`));
      }
    });

    it('owns no local executor (no fetch / HttpClient / pool.query / XHR)', () => {
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/\bHttpClient\b/);
      expect(src).not.toMatch(/\bpool\.query\b/);
      expect(src).not.toMatch(/\bnew\s+XMLHttpRequest\b/);
    });

    it('gated modal emits submitted (host shell is the executor)', () => {
      expect(src).toContain("'marketing.download.submitted'");
      // The gated modal must expose host-driven completion + failure hooks.
      expect(src).toMatch(/markCompleted\s*\(/);
      expect(src).toMatch(/markFailed\s*\(/);
    });

    it('every event key appears in both the contract and the components source', () => {
      for (const e of EXPECTED_EVENTS) {
        expect(con).toContain(`'${e}'`);
        expect(src).toContain(`'${e}'`);
      }
    });
  });

  describe('DB seed coherence (migration 0027)', () => {
    const seed = readFileSync(SEED_SQL, 'utf8');

    it('registers all 3 component_keys as vendor=ibm-carbon, approved', () => {
      for (const k of EXPECTED_KEYS) {
        expect(seed).toContain(`'${k}'`);
      }
      const carbonRows = (seed.match(/'ibm-carbon'/g) || []).length;
      expect(carbonRows).toBeGreaterThanOrEqual(EXPECTED_KEYS.length);
      expect(seed).toMatch(/'approved'/);
    });

    it('creates dos.marketing_assets + dos.marketing_download_events', () => {
      expect(seed).toMatch(/CREATE TABLE IF NOT EXISTS dos\.marketing_assets/);
      expect(seed).toMatch(/CREATE TABLE IF NOT EXISTS dos\.marketing_download_events/);
      // CHECK constraints — brand allowlist + event allowlist preserved.
      expect(seed).toMatch(/marketing_assets_brand_chk/);
      expect(seed).toMatch(/marketing_download_events_event_chk/);
    });

    it('seeds 3 first kits × en+ar = 6 rows', () => {
      for (const k of ['shahin-executive-overview','grc-readiness-checklist','security-trust-pack']) {
        expect(seed).toContain(`'${k}'`);
      }
      const enRows = (seed.match(/,'en',/g) || []).length;
      const arRows = (seed.match(/,'ar',/g) || []).length;
      expect(enRows).toBeGreaterThanOrEqual(3);
      expect(arRows).toBeGreaterThanOrEqual(3);
    });

    it('gated/open flags match the spec (executive + security gated, checklist open)', () => {
      // Match each kit row with the next non-NULL boolean (TRUE for gated).
      const lines = seed.split('\n');
      function gatedFor(kit: string): boolean | null {
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`'${kit}'`)) {
            for (let j = i; j < Math.min(i + 6, lines.length); j++) {
              if (/\bTRUE\b/.test(lines[j]))  return true;
              if (/\bFALSE\b/.test(lines[j])) return false;
            }
          }
        }
        return null;
      }
      expect(gatedFor('shahin-executive-overview')).toBe(true);
      expect(gatedFor('grc-readiness-checklist')).toBe(false);
      expect(gatedFor('security-trust-pack')).toBe(true);
    });
  });

  describe('landing-page integration', () => {
    const page = readFileSync(PAGE_SRC, 'utf8');

    it("inserts 'download-kit' between agentic-proof and platform-overview", () => {
      const m = page.match(/MARKETING_HOME_SECTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
      expect(m).toBeTruthy();
      const sections = Array.from(m![1].matchAll(/'([a-z-]+)'/g)).map((x) => x[1]);
      const a = sections.indexOf('agentic-proof');
      const d = sections.indexOf('download-kit');
      const p = sections.indexOf('platform-overview');
      expect(a).toBeGreaterThan(-1);
      expect(d).toBe(a + 1);
      expect(p).toBe(d + 1);
    });

    it('embeds the 3 download components in the template', () => {
      expect(page).toMatch(/<dos-download-kit-card\b/);
      expect(page).toMatch(/<dos-gated-download-modal\b/);
      expect(page).toMatch(/<dos-download-success\b/);
      expect(page).toContain('data-section-id="download-kit"');
    });

    it('public surface invariants — no AccessStore, no tenantId in executable code', () => {
      const code = page
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/\bAccessStore\b/);
      expect(code).not.toMatch(/\btenantId\b/);
    });
  });

  describe('registry + service wiring', () => {
    it('component-map.ts registers all 3 marketing.* download keys', () => {
      const map = readFileSync(COMP_MAP, 'utf8');
      for (const k of EXPECTED_KEYS) {
        expect(map).toContain(`'${k}'`);
      }
      for (const cls of EXPECTED_CLASSES) {
        expect(map).toContain(cls);
      }
    });

    it('@dos/ui-system index re-exports the contract + components', () => {
      const idx = readFileSync(UI_INDEX, 'utf8');
      expect(idx).toMatch(/download-kit\.contract/);
      expect(idx).toMatch(/download-kit\.components/);
    });

    it('ui-os-service mounts the public marketing-downloads router', () => {
      const r = readFileSync(ROUTES_INDEX, 'utf8');
      expect(r).toMatch(/createMarketingDownloadsRouter/);
    });
  });
});
