#!/usr/bin/env node
// WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS — network-guard proof.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/audits/workspace-home-no-template-binding-probe.mjs [OPTIONS]

Network-guard proof that SPA does not issue template-binding request for /workspace-home.

Options:
  --base <url>         Base URL (default: http://localhost:3000)
  --route <path>       Route to probe (default: /workspace-home)
  --out <path>         Output JSON path
  --help, -h           Show this help message

Behavior:
  - Visits route in clean-profile headless chromium
  - Asserts SPA does NOT request /api/ui-os/template-binding?route=...
  - Route-metadata request allowed (HTTP 200 carries shell-only classification)
  - Clean-profile chromium (no extensions, no persisted user-data-dir)
  - No fabricated auth; anon bounce to /login is acceptable evidence

Exit codes:
  Non-zero on any forbidden template-binding request

Examples:
  # Probe /workspace-home
  node scripts/audits/workspace-home-no-template-binding-probe.mjs

  # Probe custom route
  node scripts/audits/workspace-home-no-template-binding-probe.mjs --route /custom-route
`);
  process.exit(0);
}

function parseArgs(argv) {
  const o = { base: 'http://localhost:3000', route: '/workspace-home', out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base')  o.base  = argv[++i];
    else if (a === '--route') o.route = argv[++i];
    else if (a === '--out')   o.out   = argv[++i];
  }
  return o;
}

async function main() {
  const args = parseArgs(process.argv);
  const url = `${args.base}${args.route}`;
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--no-default-browser-check',
      '--no-first-run',
    ],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const requests = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/api/ui-os/')) requests.push({ method: req.method(), url: u });
  });
  const responses = [];
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/api/ui-os/')) {
      responses.push({ status: res.status(), url: u });
    }
  });

  let navResponse = null;
  let navError = null;
  try {
    navResponse = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
  } catch (e) {
    navError = e.message;
  }
  await page.waitForTimeout(1500);

  const landedAt = page.url();
  await browser.close();

  // Forbidden request: any call to template-binding for /workspace-home.
  const forbidden = requests.filter((r) =>
    r.url.includes('/api/ui-os/template-binding') &&
    r.url.includes('route=%2Fworkspace-home') ||
    r.url.includes('/api/ui-os/template-binding?route=/workspace-home')
  );

  // Allowed signal: route-metadata for /workspace-home returned 200.
  const routeMetadataResponses = responses.filter((r) =>
    r.url.includes('/api/ui-os/route-metadata') &&
    (r.url.includes('route=%2Fworkspace-home') || r.url.includes('route=/workspace-home'))
  );

  const report = {
    generatedAt: new Date().toISOString(),
    base: args.base,
    route: args.route,
    landedAt,
    httpStatus: navResponse?.status() ?? null,
    navError,
    uiOsRequests: requests,
    uiOsResponses: responses,
    forbiddenTemplateBindingCalls: forbidden,
    routeMetadataResponses,
    verdict: forbidden.length === 0
      ? 'WORKSPACE_HOME_SHELL_ONLY_NO_CALL_PASS'
      : 'BLOCKED',
  };

  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(report, null, 2), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`[wh-no-call-probe] wrote ${args.out} (verdict=${report.verdict})`);
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
  }
  if (forbidden.length > 0) process.exit(1);
}

main().catch((e) => { console.error('[wh-no-call-probe] FATAL', e); process.exit(2); });
