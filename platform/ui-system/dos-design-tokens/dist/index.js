"use strict";
/**
 * @dos/design-tokens
 *
 * Visual primitive contract for the DOS Platform UI Operating System.
 * Tokens are CSS custom properties exposed via `tokens.css` (which
 * imports the per-domain files: colors, typography, spacing, radius,
 * shadows, layout, rtl). This barrel exports their string keys for
 * type-safe consumption from TypeScript callers.
 *
 * No runtime values are emitted — tokens live only in CSS so theme
 * switching, RTL, and per-product overrides remain a CSS concern.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOS_Z_INDEX_TOKENS = exports.DOS_TYPOGRAPHY_TOKENS = exports.DOS_LAYOUT_TOKENS = exports.DOS_DENSITY_MODES = exports.DOS_DISPLAY_TYPE_TOKENS = exports.DOS_DENSITY_TOKENS = exports.DOS_GLASS_TOKENS = exports.DOS_GRADIENT_TOKENS = exports.DOS_SHADOW_TOKENS = exports.DOS_RADIUS_TOKENS = exports.DOS_SPACING_TOKENS = exports.DOS_COLOR_TOKENS = exports.DOS_TOKEN_STYLESHEET = void 0;
exports.DOS_TOKEN_STYLESHEET = '@dos/design-tokens/tokens.css';
exports.DOS_COLOR_TOKENS = [
    '--dos-color-primary',
    '--dos-color-primary-strong',
    '--dos-color-primary-soft',
    '--dos-color-surface',
    '--dos-color-surface-muted',
    '--dos-color-surface-raised',
    '--dos-color-border',
    '--dos-color-border-strong',
    '--dos-color-text',
    '--dos-color-text-muted',
    '--dos-color-text-inverse',
    '--dos-color-success',
    '--dos-color-warning',
    '--dos-color-danger',
    '--dos-color-info',
];
exports.DOS_SPACING_TOKENS = [
    '--dos-space-0',
    '--dos-space-1',
    '--dos-space-2',
    '--dos-space-3',
    '--dos-space-4',
    '--dos-space-5',
    '--dos-space-6',
    '--dos-space-8',
    '--dos-space-10',
    '--dos-space-12',
];
exports.DOS_RADIUS_TOKENS = [
    '--dos-radius-sm',
    '--dos-radius-md',
    '--dos-radius-card',
    '--dos-radius-pill',
];
exports.DOS_SHADOW_TOKENS = [
    '--dos-shadow-xs',
    '--dos-shadow-sm',
    '--dos-shadow-md',
    '--dos-shadow-lg',
    '--dos-shadow-xl',
    '--dos-shadow-card',
    '--dos-shadow-popover',
    '--dos-shadow-modal',
    '--dos-shadow-fab',
    '--dos-shadow-focus',
    '--dos-shadow-inset',
    '--dos-shadow-rim',
];
exports.DOS_GRADIENT_TOKENS = [
    '--dos-gradient-signature',
    '--dos-gradient-signature-soft',
    '--dos-gradient-brand-soft',
    '--dos-gradient-aurora',
    '--dos-gradient-aurora-soft',
    '--dos-gradient-mesh-1',
    '--dos-gradient-mesh-2',
    '--dos-gradient-mesh-3',
    '--dos-gradient-kpi-line',
    '--dos-gradient-progress',
    '--dos-gradient-trend-pos',
    '--dos-gradient-trend-neg',
    '--dos-gradient-hairline',
    '--dos-gradient-shimmer',
];
exports.DOS_GLASS_TOKENS = [
    '--dos-glass-blur-sm',
    '--dos-glass-blur-md',
    '--dos-glass-blur-lg',
    '--dos-glass-saturate',
    '--dos-glass-tint',
    '--dos-glass-tint-strong',
    '--dos-glass-tint-muted',
    '--dos-glass-edge',
    '--dos-glass-edge-strong',
    '--dos-glass-backdrop-sm',
    '--dos-glass-backdrop-md',
    '--dos-glass-backdrop-lg',
    '--dos-glass-rim',
];
exports.DOS_DENSITY_TOKENS = [
    '--dos-density-pad-y',
    '--dos-density-pad-x',
    '--dos-density-gap',
    '--dos-density-gap-tight',
    '--dos-density-radius',
    '--dos-density-title',
    '--dos-density-eyebrow',
    '--dos-density-body',
    '--dos-density-line',
    '--dos-density-cds-size',
];
exports.DOS_DISPLAY_TYPE_TOKENS = [
    '--dos-display-xl',
    '--dos-display-lg',
    '--dos-display-md',
    '--dos-display-sm',
    '--dos-display-weight',
    '--dos-display-weight-strong',
    '--dos-display-tracking-tight',
    '--dos-display-tracking-normal',
    '--dos-display-line-tight',
    '--dos-display-line-normal',
    '--dos-eyebrow-size',
    '--dos-eyebrow-tracking',
    '--dos-eyebrow-weight',
    '--dos-eyebrow-color',
    '--dos-caption-size',
    '--dos-caption-line',
    '--dos-caption-color',
    '--dos-numeric-features',
];
exports.DOS_DENSITY_MODES = ['compact', 'cozy', 'comfortable'];
exports.DOS_LAYOUT_TOKENS = [
    '--dos-header-height-mobile',
    '--dos-header-height-desktop',
    '--dos-bottom-nav-height',
    '--dos-sidebar-width',
    '--dos-sidebar-width-collapsed',
    '--dos-safe-bottom',
    '--dos-safe-top',
    '--dos-touch-target-min',
];
exports.DOS_TYPOGRAPHY_TOKENS = [
    '--dos-font-family',
    '--dos-font-size-xs',
    '--dos-font-size-sm',
    '--dos-font-size-md',
    '--dos-font-size-lg',
    '--dos-font-size-xl',
    '--dos-font-size-2xl',
    '--dos-font-size-input-mobile',
    '--dos-line-height-tight',
    '--dos-line-height-normal',
];
exports.DOS_Z_INDEX_TOKENS = [
    '--dos-z-base',
    '--dos-z-sticky',
    '--dos-z-fixed',
    '--dos-z-overlay',
    '--dos-z-modal',
    '--dos-z-toast',
];
//# sourceMappingURL=index.js.map