import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * DosIcon — platform-tier SVG icon primitive.
 *
 * Replaces the previous behaviour where icon names ("layout-dashboard",
 * "shield", "users") rendered as raw text in nav items because there
 * was no icon font/sprite loaded. This component embeds a curated set
 * of stroke-based icons (Lucide-aligned, MIT-licensed paths inlined
 * here so we don't depend on an external font).
 *
 * Usage:
 *   <dos-icon name="shield"></dos-icon>
 *   <dos-icon name="layers" size="20" stroke="2"></dos-icon>
 *
 * Unknown names fall back to a generic dot — never raw text.
 *
 * Adding new icons: paste the lucide path d-string into ICONS below.
 * Keep stroke-based viewBox 24×24, stroke-width 2 default.
 */

interface IconDef {
  /** Inner SVG content (paths/lines/circles). */
  content: string;
  /** Default stroke width override (rare). */
  strokeWidth?: number;
}

const ICONS: Record<string, IconDef> = {
  // Navigation / structural
  'home':              { content: '<path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z"/>' },
  'layers':            { content: '<path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' },
  'shield':            { content: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>' },
  'shield-check':      { content: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>' },
  'check':             { content: '<polyline points="20 6 9 17 4 12"/>' },
  'check-circle':      { content: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
  'lock':              { content: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' },
  'file':              { content: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
  'file-shield':       { content: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="m12 13 3 1.5v3a3 3 0 1 1-6 0v-3L12 13Z"/>' },
  'clipboard':         { content: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/>' },
  'history':           { content: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/><path d="M12 7v5l3 2"/>' },
  'settings':          { content: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.21.7.49 1 .82.04.04.08.08.13.13.22.34.42.69.6 1.05a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>' },

  // People / org
  'user':              { content: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  'users':             { content: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  'users-group':       { content: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  'sitemap':           { content: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><path d="M12 8v4"/>' },
  'building':          { content: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/>' },
  'id-card':           { content: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 10h4"/><path d="M14 14h4"/><path d="M9 17v-1a2 2 0 0 0-4 0v1"/>' },
  'map-pin':           { content: '<path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>' },
  'key':               { content: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>' },
  'gavel':             { content: '<path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>' },
  'share':             { content: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' },

  // Layout / structure
  'layout-dashboard':  { content: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>' },
  'menu':              { content: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' },
  'chevron-down':      { content: '<polyline points="6 9 12 15 18 9"/>' },
  'chevron-up':        { content: '<polyline points="18 15 12 9 6 15"/>' },
  'chevron-left':      { content: '<polyline points="15 18 9 12 15 6"/>' },
  'chevron-right':     { content: '<polyline points="9 18 15 12 9 6"/>' },
  'arrow-up-right':    { content: '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>' },
  'arrow-right':       { content: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>' },

  // Actions / status
  'plus':              { content: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' },
  'search':            { content: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  'bell':              { content: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' },
  /** Alias — shell inbox / activity affordance (same paths as bell). */
  'notification':      { content: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' },
  'sparkles':          { content: '<path d="m12 3-1.9 5.8L4 11l6.1 2.2L12 19l1.9-5.8L20 11l-6.1-2.2L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>' },
  'briefcase':         { content: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
  'inbox':             { content: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/>' },
  'circle':            { content: '<circle cx="12" cy="12" r="5"/>' },
  'dot':               { content: '<circle cx="12" cy="12" r="2"/>' },

  // Brand fallback
  'logo':              { content: '<path d="M12 2 4 6v6c0 5.5 3.8 9.7 8 10 4.2-.3 8-4.5 8-10V6Z" fill="currentColor" stroke="none"/><path d="m9 12 2 2 4-4" stroke="white"/>' },
};

@Component({
  selector: 'dos-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      [attr.stroke]="'currentColor'"
      [attr.stroke-width]="resolvedStrokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.aria-hidden]="ariaLabel ? null : 'true'"
      [attr.role]="ariaLabel ? 'img' : null"
      [attr.aria-label]="ariaLabel || null"
      class="dos-icon"
      [innerHTML]="resolvedContent()"
    ></svg>
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    .dos-icon { display: block; flex: 0 0 auto; }
  `],
})
export class DosIconComponent {
  /** Icon name. Unknown names fall back to a single dot. */
  @Input() name: string = 'dot';

  /** Pixel size; default 18. Use 16 for inline, 20 for nav, 24 for hero. */
  @Input() size: number | string = 18;

  /** Stroke width override; default per icon (mostly 2). */
  @Input() stroke: number | string | null = null;

  /** Sets aria-label + role=img. Omit (default) for purely decorative icons. */
  @Input() ariaLabel: string | null = null;

  readonly resolvedContent = computed(() => {
    const def = ICONS[this.name] ?? ICONS['dot'];
    return def.content;
  });

  readonly resolvedStrokeWidth = computed(() => {
    if (this.stroke !== null && this.stroke !== undefined) return this.stroke;
    const def = ICONS[this.name];
    return def?.strokeWidth ?? 2;
  });
}
