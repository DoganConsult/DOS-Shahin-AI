#!/usr/bin/env node
// Multi-role UX validation. Logs in as each of 4 canonical roles, captures
// the left-nav tree + visible CTAs on the Foundation Overview page, and
// writes a persona-diff report.
//
// Proves: role-based divergence is visible at the UI layer, not just DB.
//
// Required env:
//   SHAHIN_WEB_BASE          — frontend URL, default http://127.0.0.1:4200
//   TENANT_ID                — tenant to log into
//   ADMIN_USERNAME/PASSWORD      — tenant_admin persona
//   MANAGER_USERNAME/PASSWORD    — risk_manager persona
//   AUDITOR_USERNAME/PASSWORD    — auditor persona
//   VIEWER_USERNAME/PASSWORD     — viewer persona
//
// Output per persona:
//   ops/scripts/lifecycle-proofs/role-ux/<role>-nav.json
//   ops/scripts/lifecycle-proofs/role-ux/<role>-ctas.json
//   ops/scripts/lifecycle-proofs/role-ux/<role>-screenshot.png
// Plus a diff report:
//   ops/scripts/lifecycle-proofs/role-ux/diff-report.md

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PERSONAS = [
  { key: 'admin',   userEnv: 'ADMIN_USERNAME',   passEnv: 'ADMIN_PASSWORD' },
  { key: 'manager', userEnv: 'MANAGER_USERNAME', passEnv: 'MANAGER_PASSWORD' },
  { key: 'auditor', userEnv: 'AUDITOR_USERNAME', passEnv: 'AUDITOR_PASSWORD' },
  { key: 'viewer',  userEnv: 'VIEWER_USERNAME',  passEnv: 'VIEWER_PASSWORD' },
];

async function main() {
  const webBase = process.env.SHAHIN_WEB_BASE || 'http://127.0.0.1:4200';

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('Playwright not installed. Run: pnpm add -D playwright && pnpm exec playwright install chromium');
    process.exit(2);
  }

  const results = {};

  for (const persona of PERSONAS) {
    const username = process.env[persona.userEnv];
    const password = process.env[persona.passEnv];
    if (!username || !password) {
      console.warn(`[role-ux] skipping ${persona.key}: ${persona.userEnv}/${persona.passEnv} missing`);
      continue;
    }

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    try {
      // Shahin /login is a redirect-only route that hands off to the
      // Keycloak-hosted Dogan-themed login page. The Keycloak form uses
      // the standard base-theme selectors: #username, #password, #kc-login.
      await page.goto(`${webBase}/login`, { waitUntil: 'networkidle', timeout: 20000 });
      // Wait for the redirect to land on Keycloak (look for the Keycloak form).
      await page.waitForSelector('input#username, input[name="username"]', { timeout: 15000 });
      await page.fill('input#username, input[name="username"]', username);
      await page.fill('input#password, input[name="password"]', password);
      await page.click('input#kc-login, button[name="login"], input[type="submit"]');
      await page.waitForLoadState('networkidle', { timeout: 20000 });

      // Post-login the BFF returns the browser to Shahin. Go to Foundation.
      await page.goto(`${webBase}/foundation/overview`, { waitUntil: 'networkidle', timeout: 20000 });

      const navEntries = await page.$$eval('nav a, [role="navigation"] a', (els) =>
        els.map((el) => ({
          text: el.textContent?.trim() || '',
          href: el.getAttribute('href') || '',
        })),
      );

      const ctas = await page.$$eval('button, a.btn-primary, .btn-primary', (els) =>
        els.map((el) => (el.textContent || '').trim()).filter((t) => t.length > 0 && t.length < 80),
      );

      const screenshotPath = path.join(__dirname, `${persona.key}-screenshot.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      fs.writeFileSync(
        path.join(__dirname, `${persona.key}-nav.json`),
        JSON.stringify(navEntries, null, 2) + '\n',
      );
      fs.writeFileSync(
        path.join(__dirname, `${persona.key}-ctas.json`),
        JSON.stringify(ctas, null, 2) + '\n',
      );

      results[persona.key] = { navCount: navEntries.length, ctaCount: ctas.length };
      console.log(`[role-ux] ${persona.key}: ${navEntries.length} nav entries, ${ctas.length} CTAs`);
    } catch (err) {
      console.error(`[role-ux] ${persona.key} failed: ${err.message}`);
      results[persona.key] = { error: err.message };
    } finally {
      await browser.close();
    }
  }

  // Write diff report
  const adminCtaCount = results.admin?.ctaCount ?? 0;
  const viewerCtaCount = results.viewer?.ctaCount ?? 0;
  const ctaReduction = adminCtaCount ? (adminCtaCount - viewerCtaCount) / adminCtaCount : 0;
  const pass = ctaReduction >= 0.4; // viewer must have ≥40% fewer CTAs

  const report = `# Role UX Diff Report

Generated: ${new Date().toISOString()}

| Persona | Nav entries | CTAs |
|---------|-------------|------|
${PERSONAS.map((p) => `| ${p.key} | ${results[p.key]?.navCount ?? '—'} | ${results[p.key]?.ctaCount ?? '—'} |`).join('\n')}

## Divergence check
- Admin CTAs: ${adminCtaCount}
- Viewer CTAs: ${viewerCtaCount}
- CTA reduction (viewer vs admin): ${(ctaReduction * 100).toFixed(1)}%
- Required: ≥40%
- **Result: ${pass ? 'PASS' : 'FAIL'}**
`;
  fs.writeFileSync(path.join(__dirname, 'diff-report.md'), report);

  console.log(pass ? '[role-ux] PASS' : '[role-ux] FAIL');
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
