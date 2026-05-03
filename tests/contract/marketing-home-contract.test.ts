/**
 * Phase M1 — `marketing.home.page` contract test.
 *
 * Source-level (no DOM) verification that the 16-section public landing
 * surface stays coherent with the registry / brand-asset / agentic
 * contracts. Runs under `tests/vitest.contracts.config.mjs`.
 *
 * Asserts:
 *   ① MARKETING_HOME_SECTIONS literal exposes all 16 canonical ids.
 *   ② Every section id appears as a [data-section-id="…"] hook in the
 *      template (selector-safe for Playwright probes).
 *   ③ The agentic-proof section is gated by `flag('landingAgenticProof')`
 *      AND embeds <dos-agent-status-strip> from M0.5.
 *   ④ The page imports DosBrandEagleComponent and resolves agent tiles
 *      through BrandResolverService — never an inline `<img>` literal.
 *   ⑤ The page is AccessStore-free (public surface) and tenant-free.
 *   ⑥ DB seed (20260503_0026) registers `marketing.home.page` with
 *      vendor='ibm-carbon' + approval_status='approved' AND inserts the
 *      public root route (tenant_id IS NULL, path '/').
 *   ⑦ `marketing.home.page` is registered in component-map.ts.
 *   ⑧ Brand-asset contract carries the agent-tile kind + asset_code
 *      discriminator added by M0.5.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Source-only contract test — we deliberately do NOT import the Angular
// component module (which would require the JIT compiler). Instead we
// parse the source file to read the locked section ordering.
const REPO = resolve(__dirname, '..', '..');
const PAGE_SRC = resolve(REPO, 'platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts');
const SEED_SQL = resolve(REPO, 'platform/dos/migrations/public/20260503_0026_marketing_home_page.sql');
const COMP_MAP = resolve(REPO, 'platform/dos/registry/component-map.ts');
const BRAND_ASSET_CONTRACT = resolve(REPO, 'platform/ui-system/dos-ui-system/src/brand/brand-asset.contract.ts');

const EXPECTED_SECTIONS = [
  'hero','trust-pills','value-props','agentic-proof','download-kit',
  'platform-overview','modules','industries','architecture',
  'ai-and-agents','pricing-teaser','testimonials','logos',
  'resources','faq','cta-banner','footer',
] as const;

function extractSectionLiteral(src: string): string[] {
  const m = src.match(/MARKETING_HOME_SECTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
  if (!m) throw new Error('MARKETING_HOME_SECTIONS literal not found');
  return Array.from(m[1].matchAll(/'([a-z-]+)'/g)).map((x) => x[1]);
}

describe('M1 — marketing.home.page contract', () => {
  const src  = readFileSync(PAGE_SRC, 'utf8');
  const seed = readFileSync(SEED_SQL, 'utf8');
  const map  = readFileSync(COMP_MAP, 'utf8');
  const ba   = readFileSync(BRAND_ASSET_CONTRACT, 'utf8');

  it('declares the locked 17-section ordering (M1.5 inserts download-kit)', () => {
    const sections = extractSectionLiteral(src);
    expect(sections).toEqual([...EXPECTED_SECTIONS]);
    expect(sections).toHaveLength(17);
  });

  it('every section id has a [data-section-id] template hook', () => {
    for (const id of EXPECTED_SECTIONS) {
      expect(src).toContain(`data-section-id="${id}"`);
    }
  });

  it('agentic-proof is flag-gated and embeds <dos-agent-status-strip>', () => {
    expect(src).toMatch(/flag\('landingAgenticProof'\)/);
    expect(src).toMatch(/<dos-agent-status-strip\b/);
    // The gate must wrap the agentic-proof section.
    expect(src).toMatch(/showAgenticProof\(\)[\s\S]+data-section-id="agentic-proof"/);
  });

  it('renders the brand mark via <dos-brand-eagle> (not inline SVG)', () => {
    expect(src).toMatch(/<dos-brand-eagle\b/);
    expect(src).toContain('DosBrandEagleComponent');
  });

  it('resolves agent tiles through BrandResolverService', () => {
    expect(src).toContain('BrandResolverService');
    expect(src).toMatch(/tileAsset\(/);
    expect(src).toMatch(/assetKind === 'agent-tile'/);
  });

  it('is AccessStore-free and tenant-free (public surface invariant)', () => {
    // Strip /* … */ block comments and // line comments before checking the
    // executable source. The header comment intentionally documents these
    // invariants ("NEVER imports AccessStore. NEVER reads tenant context.").
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bAccessStore\b/);
    expect(code).not.toMatch(/\btenantId\b/);
  });

  it('component-map registers marketing.home.page', () => {
    expect(map).toMatch(/['"]marketing\.home\.page['"]\s*:[\s\S]+DosMarketingHomePageComponent/);
  });

  it('DB seed registers marketing.home.page (carbon, approved) + public root route', () => {
    expect(seed).toContain(`'marketing.home.page'`);
    expect(seed).toMatch(/'ibm-carbon'/);
    expect(seed).toMatch(/'approved'/);
    expect(seed).toMatch(/tenant_id\s+IS\s+NULL[\s\S]+path_pattern\s*=\s*'\/'/i);
    expect(seed).toMatch(/'marketing'/);
  });

  it('brand-asset contract carries agent-tile kind + asset_code discriminator', () => {
    expect(ba).toMatch(/'agent-tile'/);
    expect(ba).toMatch(/assetCode\??:\s*string/);
  });
});
