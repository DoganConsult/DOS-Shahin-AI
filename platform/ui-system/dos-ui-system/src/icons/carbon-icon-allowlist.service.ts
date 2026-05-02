import { Injectable, signal } from '@angular/core';
import {
  CARBON_ICON_INDEX,
  CARBON_ICON_NAME_SET,
  type CarbonIconEntry,
  type CarbonIconName,
  type CarbonIconSize,
  isCarbonIconName,
  resolveCarbonIcon,
} from '../allowlists/carbon-icons.allowlist';

export interface CarbonIconResolution {
  /** Allowlist-validated name (only present if allowed). */
  readonly name: CarbonIconName | null;
  /** Whether the requested name passed the allowlist. */
  readonly allowed: boolean;
  /** Resolved entry from the static index (if allowed). */
  readonly entry: CarbonIconEntry | null;
  /** The size actually available for this icon (closest match to `requestedSize`). */
  readonly resolvedSize: CarbonIconSize | null;
}

/**
 * CarbonIconAllowlistService
 *
 * Single source of truth for icon-name validation at runtime. Anything
 * that renders a Carbon icon (DosCarbonIcon directive, dynamic-UI props,
 * config-driven nav items, etc.) MUST validate the user-/data-supplied
 * name through this service before passing it to `<svg ibmIcon>` or to
 * `@carbon/icons-angular` factory imports.
 *
 * Why:
 *   - Rule #8 (icons are package-level assets, not per-icon DB rows). The
 *     allowlist is the runtime side of the catalog row.
 *   - Prevents arbitrary SVG injection / typo'd names rendering nothing.
 *   - Telemetry: every disallowed lookup increments a counter and emits
 *     `dos:telemetry:icon-disallowed` (window CustomEvent) so observability
 *     can flag drift before deploy.
 *
 * Usage:
 *   const ok = svc.isAllowed('add');           // boolean
 *   const e  = svc.resolve('add');             // CarbonIconEntry | null
 *   svc.assertAllowed(maybeName);              // throws if not allowed
 *   const r  = svc.resolveAtSize('add', 16);   // returns closest available size
 */
@Injectable({ providedIn: 'root' })
export class CarbonIconAllowlistService {
  /** Total icons in the allowlist (frozen at build time). */
  readonly totalCount = CARBON_ICON_NAME_SET.size;

  /** Counter of disallowed lookups since process start. */
  readonly disallowedAttempts = signal(0);

  /** Last 50 disallowed names — circular buffer, kept for debug surfaces. */
  private readonly recentDisallowed: string[] = [];

  /** Fast O(1) allowlist check. */
  isAllowed(name: unknown): name is CarbonIconName {
    return isCarbonIconName(name);
  }

  /** Returns the indexed entry, or null if the name is not on the allowlist. */
  resolve(name: string): CarbonIconEntry | null {
    if (!isCarbonIconName(name)) {
      this.recordDisallowed(name);
      return null;
    }
    return CARBON_ICON_INDEX.get(name) ?? null;
  }

  /**
   * Returns an icon entry plus the **closest available size** ≥ requestedSize.
   * If `requestedSize` is omitted, returns the smallest available size.
   * If the name fails the allowlist, returns a "disallowed" resolution and
   * emits telemetry — the caller should swap to a fallback icon (`circle`,
   * `warning-alt`, etc.) instead of rendering an empty `<svg>`.
   */
  resolveAtSize(name: string, requestedSize?: 16 | 20 | 24 | 32): CarbonIconResolution {
    const entry = this.resolve(name);
    if (!entry) {
      return { name: null, allowed: false, entry: null, resolvedSize: null };
    }
    const numericSizes = entry.sizes.filter((s): s is 16 | 20 | 24 | 32 => typeof s === 'number');
    if (numericSizes.length === 0) {
      // Glyph-only icon — return entry but note no numeric size.
      return { name: entry.name as CarbonIconName, allowed: true, entry, resolvedSize: 'glyph' };
    }
    if (requestedSize === undefined) {
      // Default to smallest (Carbon icons render at any CSS size; smaller master = lighter).
      return { name: entry.name as CarbonIconName, allowed: true, entry, resolvedSize: Math.min(...numericSizes) as CarbonIconSize };
    }
    // Find the smallest size that is ≥ requested; fall back to the largest.
    const upgrade = numericSizes.filter(s => s >= requestedSize).sort((a, b) => a - b)[0];
    const resolvedSize = upgrade ?? Math.max(...numericSizes);
    return { name: entry.name as CarbonIconName, allowed: true, entry, resolvedSize: resolvedSize as CarbonIconSize };
  }

  /**
   * Returns a known-good icon name, falling back to a sensible default if
   * the input is not on the allowlist. Use this in templates where
   * rendering an empty SVG would be a worse UX than rendering a stand-in.
   */
  resolveOrFallback(name: string, fallback: CarbonIconName = 'circle--filled'): CarbonIconName {
    return isCarbonIconName(name) ? name : (this.recordDisallowed(name), fallback);
  }

  /**
   * Throws if the name is not on the allowlist. Use sparingly — only in
   * non-recoverable code paths (e.g. config-validator boot checks).
   */
  assertAllowed(name: string): asserts name is CarbonIconName {
    if (!isCarbonIconName(name)) {
      this.recordDisallowed(name);
      throw new Error(`[carbon-icon] disallowed icon name: ${JSON.stringify(name)}`);
    }
  }

  /** Returns `entry.angularModule` (e.g. 'Add16') for direct factory imports. */
  angularModuleName(name: string, size: 16 | 20 | 24 | 32 = 16): string | null {
    const e = this.resolve(name);
    if (!e) return null;
    // Angular module names are PascalCase + size suffix.
    const pascal = e.name
      .split(/[-_]+/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('');
    return `${pascal}${size}`;
  }

  /** Diagnostic snapshot for observability dashboards. */
  diagnostics(): {
    total: number;
    disallowedAttempts: number;
    recentDisallowed: readonly string[];
  } {
    return {
      total: this.totalCount,
      disallowedAttempts: this.disallowedAttempts(),
      recentDisallowed: [...this.recentDisallowed],
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────
  private recordDisallowed(name: unknown): void {
    const key = typeof name === 'string' ? name : `<${typeof name}>`;
    this.recentDisallowed.push(key);
    if (this.recentDisallowed.length > 50) this.recentDisallowed.shift();
    // Defer the signal write so we never trigger NG0600 when this method is
    // invoked synchronously from inside a template binding (e.g. iconName()
    // called during change detection). Telemetry CustomEvent goes out
    // immediately — only the in-Angular signal mutation is deferred.
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.disallowedAttempts.update(n => n + 1));
    } else {
      Promise.resolve().then(() => this.disallowedAttempts.update(n => n + 1));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dos:telemetry:icon-disallowed', {
        detail: { name: key, ts: new Date().toISOString() },
      }));
    }
  }
}
