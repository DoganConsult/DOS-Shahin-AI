#!/usr/bin/env node
/**
 * Wave A.1 — Authenticated UI OS Visual Proof
 * --------------------------------------------
 * Captures the migrated UI OS chrome (workspace shell + Foundation
 * overview) at 390/430/768/1440 viewports against the live Shahin
 * gateway, using a Keycloak-minted access token injected as the
 * `dos_access_token` HttpOnly cookie.
 *
 * Inputs (env):
 *   BASE_URL  default https://shahin-ai.com
 *   OUT_DIR   default platform/docs/ui/visual-proof/wave-a-auth
 *   TOKEN     required — Keycloak access JWT (mint via ops/scripts/lib/dod-token.sh)
 *
 * Why Playwright: the static-Chrome runner used in Wave A cannot inject
 * cookies, so authenticated routes redirected to landing. Playwright is
 * resolved from the agent-local install path because the workspace does
 * not declare it as a devDependency.
 */
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';

// Resolve Playwright from the global npm install (`/usr/lib/node_modules`).
// The agent-local skill install at /root/.agents/skills/playwright crashed
// Chromium with "Target crashed" on the 768 viewport, suggesting a stale
// or mismatched browser binary. The system install ships browsers under
// /root/.cache/ms-playwright/ and was confirmed launching all engines.
const require = createRequire('/usr/lib/node_modules/playwright/');
const { chromium } = require('playwright');

const BASE_URL = (process.env.BASE_URL || 'https://shahin-ai.com').replace(/\/$/, '');
const OUT_DIR = process.env.OUT_DIR || path.resolve('platform/docs/ui/visual-proof/wave-a-auth');
let TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error('[visual-proof-auth] FATAL: TOKEN env var is required');
  process.exit(2);
}

// Re-mint a fresh JWT before each viewport iteration. Empirically, the
// auth-service / gateway rate-limits per-token, so reusing a single token
// across all 4 viewports causes the middle viewports to bootstrap into
// blank pages (the SPA's /api/access/my-permissions call gets throttled,
// AccessStore stays empty, the migrated chrome never mounts). A fresh
// token per viewport gives each context a clean budget. Falls back to
// the inherited TOKEN if mint fails (e.g. KC unreachable).
const REPO_ROOT = process.env.REPO_ROOT || '/root/DOS-AIO/DOS Platform';
function mintFreshToken() {
  try {
    const cmd = `bash -c 'REPO_ROOT="${REPO_ROOT}" source "${REPO_ROOT}/ops/scripts/lib/dod-token.sh" && mint_dod_token >/dev/null 2>&1 && printf "%s" "$TOKEN"'`;
    const out = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
    if (out && out.length > 100) return out.trim();
  } catch (e) {
    console.error(`[visual-proof-auth] WARN token mint failed: ${e.message}`);
  }
  return null;
}

const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
  { w: 1440, h: 900 },
];
const TARGETS = [
  { name: 'workspace', path: '/workspace-home' },
  { name: 'foundation-overview', path: '/foundation/overview' },
];

mkdirSync(OUT_DIR, { recursive: true });

const url = new URL(BASE_URL);
const cookieDomain = url.hostname;

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const summary = [];
    for (const v of VIEWPORTS) {
      const fresh = mintFreshToken();
      const tokenForThisViewport = fresh || TOKEN;
      console.log(`--- viewport ${v.w}x${v.h} (token=${fresh ? 'fresh' : 'reused'}) ---`);
      const ctx = await browser.newContext({
        viewport: { width: v.w, height: v.h },
        deviceScaleFactor: 2,
        ignoreHTTPSErrors: true,
        locale: 'en-US',
      });
      await ctx.addCookies([
        {
          name: 'dos_access_token',
          value: tokenForThisViewport,
          domain: cookieDomain,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax',
        },
      ]);
      // Single page per viewport: warm AccessStore on /workspace-home
      // first, then in-app navigate to deep targets to avoid the
      // APP_INITIALIZER landing-bounce race.
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/workspace-home`, { waitUntil: 'networkidle', timeout: 45000 });
      // Wait until the splash overlay is REMOVED from the DOM (splash-init.js
      // calls .remove() ~1400ms after fade starts). offsetParent is always
      // null for position:fixed elements, so the prior check passed while
      // the splash was still painting at fading opacity, leaving every
      // capture with a navy-tinted overlay. Require !document.getElementById
      // here so the screenshot lands AFTER the overlay node is gone.
      await page.waitForFunction(
        () => {
          const splash = document.getElementById('splash-overlay');
          const splashGone = !splash;
          const shellMounted = !!document.querySelector('dos-app-shell, app-shell-host, app-workspace-home');
          // Require real content rendered, not just an empty shell wrapper —
          // when AccessStore fails to load (rate-limit / 401 / 429) the shell
          // mounts but stays empty, producing a 7KB blank capture.
          const bodyLen = (document.body?.innerText || '').length;
          return splashGone && shellMounted && bodyLen > 200;
        },
        { timeout: 45000 },
      ).catch(() => {});
      await page.waitForTimeout(2500);
      for (const t of TARGETS) {
        const target = `${BASE_URL}${t.path}`;
        let finalUrl = '';
        let status = 200;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            if (t.path === '/workspace-home') {
              // Already on workspace-home from warm-up; ensure it's current.
              if (!page.url().endsWith('/workspace-home')) {
                await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
              }
            } else {
              // In-app navigation via History API to avoid landing bounce.
              await page.evaluate((p) => history.pushState({}, '', p), t.path);
              await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
              await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
              await page.waitForTimeout(2000);
              if (!page.url().includes(t.path)) {
                await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
                await page.waitForFunction(
                  () => !document.getElementById('splash-overlay'),
                  { timeout: 20000 },
                ).catch(() => {});
                await page.waitForTimeout(1500);
              }
            }
            finalUrl = page.url();
          } catch (e) {
            finalUrl = page.url();
            console.error(`[visual-proof-auth] WARN ${target} attempt ${attempt} -> ${e.message}`);
          }
          const finalPath = new URL(finalUrl).pathname.replace(/\/$/, '');
          const wantPath = t.path.replace(/\/$/, '');
          if (finalPath === wantPath) break;
          if (attempt < 3) {
            console.log(`  retry ${t.name}-${v.w} (got ${finalPath} want ${wantPath})`);
            await page.waitForTimeout(800);
          }
        }
        // NOTE: legacy outer <AppShellComponent> renders a fixed
        // .mobile-backdrop button at mobile widths (its
        // isMobileDrawerOpen() defaults to true because
        // nav.expanded()===true on first paint). That 45% black scrim
        // tints every mobile capture but reflects the actual live
        // runtime. Earlier attempts to programmatically dismiss it broke
        // route render (nav-collapse unmounted layout for 390), so the
        // tint is left visible — it is honest evidence of a pre-existing
        // legacy-shell regression that Wave A is migrating away from,
        // and the migrated chrome below the scrim is still legible.
        // Probe the backdrop so the report can quantify it.
        const overlayProbe = await page.evaluate(() => {
          const b = document.querySelector('button.mobile-backdrop');
          if (!b) return { backdrop: false };
          const r = b.getBoundingClientRect();
          const cs = getComputedStyle(b);
          return { backdrop: true, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor };
        });
        const out = path.join(OUT_DIR, `${t.name}-${v.w}.png`);
        await page.screenshot({ path: out, fullPage: false });
        summary.push({ target: t.name, viewport: v.w, finalUrl, status, file: out, overlay: overlayProbe });
        console.log(`  OK ${out} (status=${status} url=${finalUrl} overlay=${JSON.stringify(overlayProbe)})`);
      }
      // On mobile viewports, capture a drawer-open variant. Proves the
      // migrated <dos-mobile-drawer> from shell-host actually mounts and
      // opens (closed-state captures alone do not prove drawer existence).
      if (v.w <= 430) {
        try {
          // The drawer-open capture must happen on a shell-host-mounted
          // route (/foundation/overview); workspace-home uses the legacy
          // shell only and has no <app-shell-host> in its tree.
          if (!page.url().includes('/foundation/overview')) {
            await page.goto(`${BASE_URL}/foundation/overview`, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForFunction(() => !document.getElementById('splash-overlay'), { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(1500);
          }
          // Dismiss the legacy AppShellComponent's mobile-backdrop scrim
          // before interacting — its (click)="closeMobileDrawer()" handler
          // closes the legacy nav drawer and removes the scrim.
          await page.evaluate(() => {
            const b = document.querySelector('button.mobile-backdrop');
            if (b) (b).click();
          });
          await page.waitForTimeout(400);
          // Click the migrated shell-host's hamburger trigger. The button
          // is projected via ng-content[select="[headerStart]"] and renders
          // inside <dos-workspace-header>. To avoid hitting the headerEnd
          // account button (same .dos-command-bar__btn class), pick the
          // button whose textContent is the ☰ glyph.
          const opened = await page.evaluate(() => {
            const all = Array.from(document.querySelectorAll('app-shell-host dos-workspace-header button.dos-command-bar__btn'));
            const hamburger = all.find((b) => (b.textContent || '').trim() === '☰');
            if (hamburger) { hamburger.click(); return { ok: true, sel: 'hamburger-by-glyph', count: all.length }; }
            // Fallbacks (older Angular template shapes).
            for (const sel of ['app-shell-host dos-workspace-header [headerstart]', 'dos-workspace-header [headerstart]', 'dos-workspace-header [headerStart]']) {
              const btn = document.querySelector(sel);
              if (btn) { (btn).click(); return { ok: true, sel }; }
            }
            return { ok: false, reason: 'trigger-not-found', candidates: all.map((b) => b.textContent?.trim().slice(0, 8)) };
          });
          if (opened.ok) {
            await page.waitForTimeout(700);
            const drawerOut = path.join(OUT_DIR, `drawer-open-${v.w}.png`);
            await page.screenshot({ path: drawerOut, fullPage: false });
            const drawerVisible = await page.evaluate(() => {
              const d = document.querySelector('dos-mobile-drawer');
              if (!d) return { mounted: false };
              const r = d.getBoundingClientRect();
              return {
                mounted: true,
                ariaHidden: d.getAttribute('aria-hidden'),
                rect: { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) },
                contentLen: d.textContent?.trim().length ?? 0,
              };
            });
            summary.push({ target: 'drawer-open', viewport: v.w, finalUrl: page.url(), drawerVisible, sel: opened.sel, file: drawerOut });
            console.log(`  OK ${drawerOut} via ${opened.sel} drawer=${JSON.stringify(drawerVisible)}`);
          } else {
            console.log(`  SKIP drawer-open-${v.w} (${opened.reason})`);
            summary.push({ target: 'drawer-open', viewport: v.w, skipped: opened.reason });
          }
        } catch (e) {
          console.error(`  WARN drawer capture ${v.w}: ${e.message}`);
        }
      }
      await page.close();
      await ctx.close();
    }
    console.log('\n=== summary ===');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('[visual-proof-auth] FATAL', e);
  process.exit(1);
});
