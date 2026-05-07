#!/usr/bin/env node
// A11y label probe — enumerates form-label / aria-label violations.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), '../..');

const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
if (showHelp) {
  console.log(`
Usage: node scripts/audits/a11y-label-probe.mjs [OPTIONS]

Enumerates form-label / aria-label violations on canonical workspace routes.

Options:
  --base <url>         Base URL (default: http://localhost:3000)
  --routes <list>      Comma-separated routes to probe (default: /,/login,/workspace-home)
  --auth <jwt>         JWT token for authenticated routes
  --tenant <id>        Tenant ID for auth
  --user <id>          User ID for auth
  --out <path>         Output JSON path
  --strict             Enable strict mode
  --help, -h           Show this help message

Behavior:
  - Evidence-only: no fixes, only collection
  - Reports selectors, accessible-name resolution chain, and unlabeled reasons
  - Probes both anonymous and authenticated routes when --auth provided

Examples:
  # Probe default routes
  node scripts/audits/a11y-label-probe.mjs

  # Probe with auth
  node scripts/audits/a11y-label-probe.mjs --auth <jwt> --tenant <id> --user <id>

  # Custom base and routes
  node scripts/audits/a11y-label-probe.mjs --base http://localhost:4000 --routes /,/workspace-home
`);
  process.exit(0);
}

function parseArgs(argv) {
  const o = { base: 'http://localhost:3000', routes: '/,/login,/workspace-home', out: null, auth: null, tenant: null, user: null, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base')    o.base = argv[++i];
    else if (a === '--routes')  o.routes = argv[++i];
    else if (a === '--auth')    o.auth = argv[++i];
    else if (a === '--out')     o.out = argv[++i];
    else if (a === '--tenant')  o.tenant = argv[++i];
    else if (a === '--user')    o.user = argv[++i];
    else if (a === '--strict')  o.strict = true;
  }
  return o;
}

const A11Y_PROBE_FN = () => {
  const issues = [];
  // Extension/3rd-party DOM exclusion. Anything inside one of these
  // roots is OUT OF APP SCOPE — browser extensions (Aitopia, Vue
  // devtools overlays, password managers, etc.) are not part of the
  // SPA's render tree and cannot be addressed by ShellHost /
  // SurfaceRenderer / UI-OS resolver changes.
  const EXTENSION_SELECTORS = [
    '.aitopia',
    '[data-aitopia]',
    '[id^="aitopia"]',
    '[class*="aitopia"]',
    '[data-v-app]',           // Vue extension overlays
    '[data-extension]',
    'extension-host',
    '[data-tampermonkey]',
    '[data-grammarly-shadow-root]',
    '[data-lt-installed]',    // LanguageTool
    '[data-1p-shadow-host]',  // 1Password
    '[data-bw-installed]',    // Bitwarden
  ];
  const isInExtensionRoot = (el) => {
    for (const sel of EXTENSION_SELECTORS) {
      try { if (el.closest(sel)) return true; } catch { /* invalid sel */ }
    }
    return false;
  };
  const cssPath = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 8) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
      if (cur.className && typeof cur.className === 'string') {
        const c = cur.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (c) part += `.${c}`;
      }
      const sib = cur.parentElement ? Array.from(cur.parentElement.children).filter(s => s.tagName === cur.tagName) : [];
      if (sib.length > 1) part += `:nth-of-type(${sib.indexOf(cur) + 1})`;
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  };
  const getAccName = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria != null) return { value: aria, source: 'aria-label' };
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ids = labelledBy.split(/\s+/).filter(Boolean);
      const refs = ids.map(id => document.getElementById(id));
      const text = refs.map(r => r?.textContent?.trim() || '').join(' ').trim();
      return { value: text, source: 'aria-labelledby', targets: ids, missingTargets: ids.filter(id => !document.getElementById(id)) };
    }
    if (el.id) {
      const lab = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lab) return { value: lab.textContent?.trim() || '', source: 'label[for]' };
    }
    const wrapping = el.closest('label');
    if (wrapping) return { value: wrapping.textContent?.trim() || '', source: 'wrapping-label' };
    const title = el.getAttribute('title');
    if (title) return { value: title, source: 'title' };
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
      const txt = el.textContent?.trim() || '';
      if (txt) return { value: txt, source: 'text-content' };
    }
    return { value: '', source: 'none' };
  };
  // 1) Form controls without name
  const controls = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="reset"]):not([type="button"]),select,textarea,[role="combobox"],[role="searchbox"],[role="textbox"],[role="spinbutton"],[role="slider"]',
  );
  controls.forEach((el) => {
    if (isInExtensionRoot(el)) return;
    const name = getAccName(el);
    const placeholder = el.getAttribute('placeholder') || '';
    const type = el.getAttribute('type') || el.tagName.toLowerCase();
    const reasons = [];
    if (!name.value) reasons.push('no-accessible-name');
    if (name.source === 'aria-label' && (name.value === 'undefined' || name.value === 'null')) reasons.push('aria-label-literal-undefined');
    if (name.source === 'aria-labelledby' && name.missingTargets?.length) reasons.push('aria-labelledby-missing-target');
    if (!name.value && placeholder) reasons.push('placeholder-only');
    if (reasons.length) {
      issues.push({
        selector: cssPath(el),
        tag: el.tagName.toLowerCase(),
        type,
        accessibleName: name,
        placeholder,
        reasons,
        outerHTMLPrefix: (el.outerHTML || '').slice(0, 240),
      });
    }
  });
  // 2) Icon-only buttons / links without name
  const interactives = document.querySelectorAll('button,[role="button"],a[href]');
  interactives.forEach((el) => {
    if (isInExtensionRoot(el)) return;
    const name = getAccName(el);
    const txt = el.textContent?.trim() || '';
    const hasIcon = !!el.querySelector('svg, [class*="icon"], [data-icon]');
    if (!name.value && !txt && hasIcon) {
      issues.push({
        selector: cssPath(el),
        tag: el.tagName.toLowerCase(),
        type: 'icon-only-control',
        accessibleName: name,
        reasons: ['icon-only-no-accessible-name'],
        outerHTMLPrefix: (el.outerHTML || '').slice(0, 240),
      });
    } else if (name.source === 'aria-label' && (name.value === 'undefined' || name.value === 'null')) {
      issues.push({
        selector: cssPath(el),
        tag: el.tagName.toLowerCase(),
        type: 'interactive',
        accessibleName: name,
        reasons: ['aria-label-literal-undefined'],
        outerHTMLPrefix: (el.outerHTML || '').slice(0, 240),
      });
    }
  });
  // 3) Orphan <label> with empty for=""
  document.querySelectorAll('label').forEach((lab) => {
    if (isInExtensionRoot(lab)) return;
    const f = lab.getAttribute('for');
    if (f && !document.getElementById(f)) {
      issues.push({
        selector: cssPath(lab),
        tag: 'label',
        type: 'orphan-label',
        accessibleName: { value: lab.textContent?.trim() || '', source: 'label-text' },
        reasons: ['label-for-target-missing'],
        targetId: f,
        outerHTMLPrefix: (lab.outerHTML || '').slice(0, 240),
      });
    }
  });
  // 4) Universal attribute-undefined sweep — anything outside an
  //    extension root must NEVER carry the literal string "undefined"
  //    in aria-label / aria-labelledby / id.
  const ATTRS = ['aria-label', 'aria-labelledby', 'id'];
  document.querySelectorAll('*').forEach((el) => {
    if (isInExtensionRoot(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v === 'undefined' || v === 'null') {
        issues.push({
          selector: cssPath(el),
          tag: el.tagName.toLowerCase(),
          type: 'attr-literal-undefined',
          attribute: a,
          currentValue: v,
          reasons: [`${a}-literal-${v}`],
          outerHTMLPrefix: (el.outerHTML || '').slice(0, 240),
        });
      }
    }
  });
  // 5) Named-control DOM snippets (proof artifacts).
  const SNIPPET_TARGETS = [
    { name: 'settings-button',     selector: '[data-renderer-key="shell.settings-action"]' },
    { name: 'account-button',      selector: '[data-renderer-key="shell.user-menu"]' },
    { name: 'sidebar-empty-state', selector: '[data-testid="dos-shell-sidebar-nav__empty"]' },
    { name: 'sidebar-nav-root',    selector: '[data-renderer-key="shell.sidebar-nav"]' },
    { name: 'main-empty-state',    selector: '[data-renderer-key="shell.empty-state"], dos-empty-state' },
    { name: 'brand',               selector: '[data-renderer-key="shell.brand"]' },
    { name: 'workspace-title',     selector: '[data-renderer-key="shell.workspace-title"]' },
    { name: 'module-cards',        selector: '[data-renderer-key="shell.module-cards"]' },
  ];
  const snippets = SNIPPET_TARGETS.map((t) => {
    const el = document.querySelector(t.selector);
    if (!el || isInExtensionRoot(el)) {
      return { name: t.name, selector: t.selector, present: false };
    }
    // Inner clickable button (Carbon icon-button wraps a real <button>).
    const innerBtn = el.tagName === 'BUTTON' ? el : el.querySelector('button');
    return {
      name: t.name,
      selector: t.selector,
      present: true,
      tag: el.tagName.toLowerCase(),
      ariaLabel: el.getAttribute('aria-label'),
      innerButton: innerBtn
        ? {
            ariaLabel: innerBtn.getAttribute('aria-label'),
            ariaHasPopup: innerBtn.getAttribute('aria-haspopup'),
            ariaExpanded: innerBtn.getAttribute('aria-expanded'),
            disabled: innerBtn.disabled === true,
          }
        : null,
      outerHTMLPrefix: (el.outerHTML || '').slice(0, 480),
    };
  });
  return {
    url: location.href,
    title: document.title,
    issueCount: issues.length,
    issues,
    snippets,
    extensionSelectorsExcluded: EXTENSION_SELECTORS,
  };
};

async function probeRoute(page, base, route, auth) {
  const url = `${base}${route}`;
  const navStart = Date.now();
  const consoleErrors = [];
  page.removeAllListeners('console');
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  let response = null;
  try {
    response = await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
  } catch (e) {
    return { route, url, error: `navigation: ${e.message}`, consoleErrors };
  }
  await page.waitForTimeout(800);
  const html = await page.content();
  const result = await page.evaluate(A11Y_PROBE_FN);
  return {
    route,
    url,
    httpStatus: response?.status() ?? null,
    landedAt: page.url(),
    elapsedMs: Date.now() - navStart,
    htmlLength: html.length,
    title: result.title,
    issueCount: result.issueCount,
    issues: result.issues,
    consoleErrors: consoleErrors.slice(0, 20),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const routes = args.routes.split(',').map(s => s.trim()).filter(Boolean);
  // Clean profile: headless chromium with --disable-extensions and a
  // throw-away user-data-dir. No persisted cache, no installed extensions,
  // no shared profile state. Confirms the audit measures app-owned DOM
  // only.
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
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: args.tenant && args.user ? {
      'x-user-sub': args.user,
      'x-tenant-id': args.tenant,
      'x-dos-tenant-id': args.tenant,
      'x-dos-user-id': args.user,
      'x-user-roles': 'platform_admin',
    } : {},
  });
  const page = await ctx.newPage();
  const results = [];
  for (const r of routes) {
    // eslint-disable-next-line no-console
    console.log(`[a11y-probe] ${r}`);
    results.push(await probeRoute(page, args.base, r, args.auth));
  }
  await browser.close();
  const totalIssues = results.reduce((n, r) => n + (r.issueCount || 0), 0);
  const report = {
    generatedAt: new Date().toISOString(),
    base: args.base,
    routes,
    cleanProfile: true,
    strict: args.strict,
    totalIssues,
    routeResults: results,
  };
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, JSON.stringify(report, null, 2), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`[a11y-probe] wrote ${args.out} (totalIssues=${totalIssues}, strict=${args.strict})`);
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
  }
  // DOM guard: --strict exits non-zero when any app-owned violation is
  // present. Suitable for CI gate wiring.
  if (args.strict && totalIssues > 0) process.exit(1);
}

main().catch((e) => { console.error('[a11y-probe] FATAL', e); process.exit(2); });
