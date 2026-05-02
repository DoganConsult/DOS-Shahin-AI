#!/usr/bin/env node
/**
 * Wave A — UI OS Visual Proof
 * ----------------------------
 * Captures screenshots of the Shahin workspace shell and Foundation
 * overview at 390 / 430 / 768 / 1440 viewports using headless Chrome.
 *
 * Inputs (env):
 *   BASE_URL    default http://127.0.0.1:8765
 *   OUT_DIR     default platform/docs/ui/visual-proof/wave-a
 *   CHROME_BIN  default /usr/bin/google-chrome
 *
 * The script does NOT start the web server; serve the built SPA
 * (`products/shahin-ai/app/dist/shahin-ai/browser`) at BASE_URL first.
 *
 * If routes require authentication, the captured screenshot is whatever
 * the SPA actually renders for that route under the current session
 * (typically the login redirect). The report MUST label such captures
 * as visual harness rather than authenticated runtime proof.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8765';
const OUT_DIR = process.env.OUT_DIR || path.resolve('platform/docs/ui/visual-proof/wave-a');
const CHROME_BIN = process.env.CHROME_BIN || '/usr/bin/google-chrome';

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

function shoot({ url, out, w, h }) {
  const args = [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--virtual-time-budget=8000',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    url,
  ];
  const r = spawnSync(CHROME_BIN, args, { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`[visual-proof] FAIL ${url} -> ${out} (exit ${r.status})`);
  }
}

console.log(`[visual-proof] base=${BASE_URL} out=${OUT_DIR}`);
for (const t of TARGETS) {
  for (const v of VIEWPORTS) {
    const url = `${BASE_URL}${t.path}`;
    const out = path.join(OUT_DIR, `${t.name}-${v.w}.png`);
    shoot({ url, out, w: v.w, h: v.h });
    console.log(`  ${existsSync(out) ? 'OK' : 'MISS'} ${out}`);
  }
}
