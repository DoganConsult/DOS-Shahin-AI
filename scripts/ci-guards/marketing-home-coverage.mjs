#!/usr/bin/env node
/**
 * marketing-home-coverage.mjs — Phase M1 CI gate.
 *
 * Verifies the canonical 19-region marketing.home.page is wired coherently:
 *   ① The marketing-home page source declares all 19 region ids in the
 *      MARKETING_HOME_REGIONS literal.
 *   ② Every section id appears as a [data-section-id="…"] hook in the
 *      template body (so renderers/tests can target sections selector-safely).
 *   ③ The agentic-proof section is gated by `flag('landingAgenticProof')`
 *      AND embeds <dos-agent-status-strip> (M0.5 contract).
 *   ④ The `marketing.home.page` component_key is seeded in
 *      20260503_0026_marketing_home_page.sql with vendor='ibm-carbon'.
 *   ⑤ component-map.ts registers `marketing.home.page`.
 *   ⑥ archetype-map.mjs resolves `marketing.home.page` to a canonical
 *      archetype + template_export.
 *
 * Set MARKETING_HOME_COVERAGE_ENFORCE=1 to fail CI; otherwise SHADOW.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapComponentKeyToArchetype } from '../ui-registry/lib/archetype-map.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGE_SRC = join(REPO, 'platform/ui-system/dos-ui-system/src/marketing/marketing-home.page.ts');
const SEED_SQL = join(REPO, 'platform/dos/migrations/public/20260503_0026_marketing_home_page.sql');
const COMP_MAP = join(REPO, 'platform/dos/registry/component-map.ts');

const SECTIONS = [
  'public-header','breadcrumb-row','hero','trust-pills','value-props',
  'agentic-proof','download-kit','platform-overview','modules','industries',
  'architecture','ai-and-agents','pricing-teaser','testimonials','logos',
  'resources','faq','cta-banner','footer',
];

const enforce = process.env.MARKETING_HOME_COVERAGE_ENFORCE === '1';
const tag = '[marketing-home-coverage]';
const violations = [];

function need(path, label) {
  if (!existsSync(path)) violations.push(`${label} missing: ${path}`);
}
need(PAGE_SRC, 'marketing-home.page.ts');
need(SEED_SQL, 'marketing-home seed migration');
need(COMP_MAP, 'component-map.ts');

if (violations.length === 0) {
  const src = readFileSync(PAGE_SRC, 'utf8');
  const seed = readFileSync(SEED_SQL, 'utf8');
  const map  = readFileSync(COMP_MAP, 'utf8');

  // ① + ② Section coverage in source AND template hooks.
  for (const id of SECTIONS) {
    if (!src.includes(`'${id}'`))
      violations.push(`region id '${id}' not declared in MARKETING_HOME_REGIONS`);
    if (!src.includes(`data-section-id="${id}"`))
      violations.push(`region '${id}' missing [data-section-id] template hook`);
  }

  // ③ Agentic-proof gating + status strip embed.
  if (!/flag\('landingAgenticProof'\)/.test(src))
    violations.push(`agentic-proof section not gated by flag('landingAgenticProof')`);
  if (!/<dos-agent-status-strip/.test(src))
    violations.push(`agentic-proof section does not embed <dos-agent-status-strip>`);

  // ④ DB seed
  if (!seed.includes(`'marketing.home.page'`))
    violations.push(`marketing-home seed missing 'marketing.home.page' row`);
  if (!/'ibm-carbon'/.test(seed))
    violations.push(`marketing-home seed missing vendor='ibm-carbon'`);

  // ⑤ component-map
  if (!/['"]marketing\.home\.page['"]/.test(map))
    violations.push(`component-map.ts missing 'marketing.home.page' entry`);

  // ⑥ archetype-map resolve
  const m = mapComponentKeyToArchetype('marketing.home.page', '/');
  if (!m || !m.archetype || !m.template_export)
    violations.push(`archetype-map.mjs does not resolve 'marketing.home.page'`);
}

if (violations.length > 0) {
  for (const m of violations) console.error(`${tag} FAIL ${m}`);
  if (enforce) process.exit(1);
  console.warn(`${tag} SHADOW (${violations.length} violation${violations.length === 1 ? '' : 's'}). Set MARKETING_HOME_COVERAGE_ENFORCE=1 to enforce.`);
  process.exit(0);
}
console.log(`${tag} OK — ${SECTIONS.length} regions wired, agentic-proof gated, registry coherent.`);
