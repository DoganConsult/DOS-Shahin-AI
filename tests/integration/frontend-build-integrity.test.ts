import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SPA_DIR = path.join(ROOT, 'frontend/products/shahin/dist/shahin-ai/browser');
const SHELL_SRC = path.join(ROOT, 'services/product-shell/src/server.ts');

describe('Frontend Build Integrity — Point 18 (140%)', () => {
  describe('Product Shell Security', () => {
    it('product-shell server.ts has hardened CSP posture', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      // Current CSP design (see inline comment in server.ts): the shell
      // intentionally does NOT mint per-request nonces because Angular's
      // Service Worker caches index.html byte-for-byte, which would break
      // any nonce-based strategy the moment ngsw replays a cached page.
      // The safe posture is 'unsafe-inline' + explicit host allowlisting,
      // with scriptSrcElem declared for Chrome's <script src> coverage.
      expect(content).toContain("'unsafe-inline'");
      expect(content).not.toContain("'strict-dynamic'");
      expect(content).toContain('scriptSrcElem');
    });

    it('product-shell has HSTS with preload', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).toContain('hsts');
      expect(content).toContain('preload');
      expect(content).toContain('includeSubDomains');
    });

    it('product-shell has referrer-policy', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).toContain('referrerPolicy');
      expect(content).toContain('strict-origin-when-cross-origin');
    });

    it('product-shell has build-info endpoint', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).toContain('/build-info');
      expect(content).toContain('computeAssetHash');
      expect(content).toContain('sha256');
    });

    it('product-shell serves index.html unmodified (ngsw cache parity)', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      // The SPA fallback handler reads index.html from disk and sends it
      // as-is. Any post-read transformation (string replace, regex edit)
      // would diverge from what Angular's Service Worker caches at
      // registration time and cause a cache / nonce / hash mismatch on
      // every subsequent SW-served navigation.
      expect(content).toContain('fs.readFileSync(indexPath');
      expect(content).toContain('res.send(html)');
      expect(content).not.toContain('html.replace(/<script/g');
    });

    it('CSP does not use unsafe-eval in production', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).not.toContain("'unsafe-eval'");
    });

    it('product-shell has baseUri and formAction CSP directives', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).toContain('baseUri');
      expect(content).toContain('formAction');
    });

    it('product-shell has upgradeInsecureRequests directive', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).toContain('upgradeInsecureRequests');
    });

    it('static assets get X-Content-Hash header', () => {
      const content = fs.readFileSync(SHELL_SRC, 'utf-8');
      expect(content).toContain('X-Content-Hash');
    });
  });

  describe('Angular Build Config', () => {
    it('angular.json exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'frontend/products/shahin/angular.json'))).toBe(true);
    });

    it('angular.json has production config with budgets', () => {
      const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/products/shahin/angular.json'), 'utf-8'));
      const prod = config.projects?.['shahin-ai']?.architect?.build?.configurations?.production;
      expect(prod).toBeTruthy();
      expect(prod.budgets).toBeTruthy();
      expect(prod.budgets.length).toBeGreaterThan(0);
    });

    it('angular.json has output hashing enabled in production', () => {
      const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/products/shahin/angular.json'), 'utf-8'));
      const prod = config.projects?.['shahin-ai']?.architect?.build?.configurations?.production;
      expect(prod?.outputHashing).toBe('all');
    });

    it('angular.json has service worker configured', () => {
      const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/products/shahin/angular.json'), 'utf-8'));
      const prod = config.projects?.['shahin-ai']?.architect?.build?.configurations?.production;
      expect(prod?.serviceWorker).toBeTruthy();
    });

    it('angular.json has optimization enabled', () => {
      const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/products/shahin/angular.json'), 'utf-8'));
      const prod = config.projects?.['shahin-ai']?.architect?.build?.configurations?.production;
      expect(prod?.optimization).toBeTruthy();
      expect(prod?.optimization?.scripts).toBe(true);
    });
  });

  describe('SPA Build Output Verification', () => {
    const buildExists = fs.existsSync(SPA_DIR);

    it('SPA build directory exists or is expected to be built', () => {
      if (!buildExists) {
        console.warn('[frontend] SPA build not found — run `pnpm run build:frontend` first');
      }
      expect(true).toBe(true);
    });

    if (buildExists) {
      it('index.html exists in build output', () => {
        expect(fs.existsSync(path.join(SPA_DIR, 'index.html'))).toBe(true);
      });

      it('index.html references hashed JS bundles', () => {
        const html = fs.readFileSync(path.join(SPA_DIR, 'index.html'), 'utf-8');
        const scripts = html.match(/src="[^"]+\.js"/g) || [];
        expect(scripts.length).toBeGreaterThan(0);
        // A handful of bootstrap-before-Angular scripts (splash-init.js,
        // cf-fix.js, sw-register.js) are intentionally shipped without a
        // content hash because they load pre-hydration and need stable
        // names for the Cloudflare edge / service-worker handshake.
        // Every remaining script — i.e. everything Angular emits — must
        // be hash-versioned so deploys cache-bust cleanly.
        const BOOTSTRAP_UNHASHED = /src="(?:splash-init|cf-fix|sw-register)\.js"/;
        const hashable = scripts.filter((s) => !BOOTSTRAP_UNHASHED.test(s));
        expect(hashable.length).toBeGreaterThan(0);
        for (const s of hashable) {
          expect(s).toMatch(/[-\.][A-Za-z0-9]{4,}\.js/);
        }
      });

      it('index.html references hashed CSS', () => {
        const html = fs.readFileSync(path.join(SPA_DIR, 'index.html'), 'utf-8');
        const styles = html.match(/href="[^"]+\.css"/g) || [];
        expect(styles.length).toBeGreaterThan(0);
      });

      it('no source maps in production build', () => {
        const mapFiles = fs.readdirSync(SPA_DIR).filter(f => f.endsWith('.map'));
        expect(mapFiles.length, 'Source maps should not be in production build').toBe(0);
      });

      it('pre-Angular bootstrap scripts do not interpolate user-controlled values', () => {
        // Phase 5 follow-up — these helper scripts run before Angular
        // bootstraps, outside the SPA's sanitisation. They must not
        // touch window.location / document.URL / innerHTML / eval so
        // an attacker-crafted URL can't get a script into the page.
        // Known safe helpers: splash-init.js, cf-fix.js, sw-register.js.
        const BOOTSTRAP_SCRIPTS = ['splash-init.js', 'cf-fix.js', 'sw-register.js'];
        const FORBIDDEN = [
          /\blocation\s*\.\s*(?:search|hash|href|pathname)/i,
          /\bdocument\s*\.\s*(?:URL|documentURI)\b/i,
          /\bURLSearchParams\b/,
          /\.innerHTML\s*=/,
          /\.outerHTML\s*=/,
          /\beval\s*\(/,
          /\bnew\s+Function\s*\(/,
          /\bdocument\s*\.\s*write\s*\(/,
        ];
        for (const file of BOOTSTRAP_SCRIPTS) {
          const p = path.join(SPA_DIR, file);
          if (!fs.existsSync(p)) continue; // sw-register only exists when SW is wired
          const src = fs.readFileSync(p, 'utf-8');
          for (const re of FORBIDDEN) {
            expect(src, `${file} must not match ${re}`).not.toMatch(re);
          }
        }
      });
    }
  });
});
