import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('PWA Manifest Smoke Tests', () => {
  describe('manifest.webmanifest', () => {
    const manifestPath = path.join(ROOT, 'platform/app/src/manifest.webmanifest');

    it('manifest file exists', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
    });

    it('manifest contains token-derived colors', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.background_color).toBe('#0f172a'); // --dos-color-surface-inverse
      expect(manifest.theme_color).toBe('#0f4c81'); // --dos-brand-primary
    });

    it('manifest uses explicit icon sizes', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

      const has192x192 = manifest.icons.some((icon: any) => 
        icon.sizes === '192x192' && icon.type === 'image/png'
      );
      const has512x512 = manifest.icons.some((icon: any) => 
        icon.sizes === '512x512' && icon.type === 'image/png'
      );

      expect(has192x192).toBe(true);
      expect(has512x512).toBe(true);
    });

    it('manifest does not use invented colors', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.background_color).not.toBe('#0a1628');
      expect(manifest.theme_color).not.toBe('#0c1a2e');
    });

    it('manifest does not use product override colors', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      expect(manifest.background_color).not.toBe('#F2A900');
      expect(manifest.theme_color).not.toBe('#F2A900');
    });

    it('manifest does not reference non-existent logoiconapphero.png', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      const hasBadIcon = manifest.icons?.some((icon: any) => 
        icon.src.includes('logoiconapphero.png')
      );

      expect(hasBadIcon).toBe(false);
    });

    it('manifest icons use absolute /assets/icons/ paths', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      manifest.icons?.forEach((icon: any) => {
        expect(icon.src).toMatch(/^\/assets\/icons\//);
      });
    });

    it('manifest does not fake maskable purpose', () => {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      manifest.icons?.forEach((icon: any) => {
        expect(icon.purpose).not.toBe('any maskable');
        expect(icon.purpose).toBe('any');
      });
    });
  });

  describe('icon assets', () => {
    const iconsDir = path.join(ROOT, 'platform/app/src/assets/icons');

    it('icon-192x192.png exists', () => {
      const iconPath = path.join(iconsDir, 'icon-192x192.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    it('icon-512x512.png exists', () => {
      const iconPath = path.join(iconsDir, 'icon-512x512.png');
      expect(fs.existsSync(iconPath)).toBe(true);
    });

    it('icon files are PNG format', () => {
      const icon192 = path.join(iconsDir, 'icon-192x192.png');
      const icon512 = path.join(iconsDir, 'icon-512x512.png');

      expect(fs.existsSync(icon192)).toBe(true);
      expect(fs.existsSync(icon512)).toBe(true);

      // Check file signature for PNG (first 8 bytes: 89 50 4E 47 0D 0A 1A 0A)
      const buffer192 = fs.readFileSync(icon192);
      const buffer512 = fs.readFileSync(icon512);

      expect(buffer192.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(buffer512.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    });
  });

  describe('index.html consistency', () => {
    const indexPath = path.join(ROOT, 'platform/app/src/index.html');

    it('index.html theme-color matches manifest', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      const manifestContent = fs.readFileSync(path.join(ROOT, 'platform/app/src/manifest.webmanifest'), 'utf-8');
      const manifest = JSON.parse(manifestContent);

      const themeColorMatch = content.match(/<meta name="theme-color" content="([^"]+)">/);
      expect(themeColorMatch).toBeDefined();
      expect(themeColorMatch?.[1]).toBe(manifest.theme_color);
    });

    it('index.html does not reference logoiconapphero.png', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).not.toContain('logoiconapphero.png');
    });

    it('index.html references existing icon assets', () => {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('/assets/icons/icon-192x192.png');
    });
  });
});
