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
export declare const DOS_TOKEN_STYLESHEET: "@dos/design-tokens/tokens.css";
export declare const DOS_COLOR_TOKENS: readonly ["--dos-color-primary", "--dos-color-primary-strong", "--dos-color-primary-soft", "--dos-color-surface", "--dos-color-surface-muted", "--dos-color-surface-raised", "--dos-color-border", "--dos-color-border-strong", "--dos-color-text", "--dos-color-text-muted", "--dos-color-text-inverse", "--dos-color-success", "--dos-color-warning", "--dos-color-danger", "--dos-color-info"];
export declare const DOS_SPACING_TOKENS: readonly ["--dos-space-0", "--dos-space-1", "--dos-space-2", "--dos-space-3", "--dos-space-4", "--dos-space-5", "--dos-space-6", "--dos-space-8", "--dos-space-10", "--dos-space-12"];
export declare const DOS_RADIUS_TOKENS: readonly ["--dos-radius-sm", "--dos-radius-md", "--dos-radius-card", "--dos-radius-pill"];
export declare const DOS_SHADOW_TOKENS: readonly ["--dos-shadow-xs", "--dos-shadow-sm", "--dos-shadow-md", "--dos-shadow-lg", "--dos-shadow-xl", "--dos-shadow-card", "--dos-shadow-popover", "--dos-shadow-modal", "--dos-shadow-fab", "--dos-shadow-focus", "--dos-shadow-inset", "--dos-shadow-rim"];
export declare const DOS_GRADIENT_TOKENS: readonly ["--dos-gradient-signature", "--dos-gradient-signature-soft", "--dos-gradient-brand-soft", "--dos-gradient-aurora", "--dos-gradient-aurora-soft", "--dos-gradient-mesh-1", "--dos-gradient-mesh-2", "--dos-gradient-mesh-3", "--dos-gradient-kpi-line", "--dos-gradient-progress", "--dos-gradient-trend-pos", "--dos-gradient-trend-neg", "--dos-gradient-hairline", "--dos-gradient-shimmer"];
export declare const DOS_GLASS_TOKENS: readonly ["--dos-glass-blur-sm", "--dos-glass-blur-md", "--dos-glass-blur-lg", "--dos-glass-saturate", "--dos-glass-tint", "--dos-glass-tint-strong", "--dos-glass-tint-muted", "--dos-glass-edge", "--dos-glass-edge-strong", "--dos-glass-backdrop-sm", "--dos-glass-backdrop-md", "--dos-glass-backdrop-lg", "--dos-glass-rim"];
export declare const DOS_DENSITY_TOKENS: readonly ["--dos-density-pad-y", "--dos-density-pad-x", "--dos-density-gap", "--dos-density-gap-tight", "--dos-density-radius", "--dos-density-title", "--dos-density-eyebrow", "--dos-density-body", "--dos-density-line", "--dos-density-cds-size"];
export declare const DOS_DISPLAY_TYPE_TOKENS: readonly ["--dos-display-xl", "--dos-display-lg", "--dos-display-md", "--dos-display-sm", "--dos-display-weight", "--dos-display-weight-strong", "--dos-display-tracking-tight", "--dos-display-tracking-normal", "--dos-display-line-tight", "--dos-display-line-normal", "--dos-eyebrow-size", "--dos-eyebrow-tracking", "--dos-eyebrow-weight", "--dos-eyebrow-color", "--dos-caption-size", "--dos-caption-line", "--dos-caption-color", "--dos-numeric-features"];
export declare const DOS_DENSITY_MODES: readonly ["compact", "cozy", "comfortable"];
export type DosDensityMode = (typeof DOS_DENSITY_MODES)[number];
export declare const DOS_LAYOUT_TOKENS: readonly ["--dos-header-height-mobile", "--dos-header-height-desktop", "--dos-bottom-nav-height", "--dos-sidebar-width", "--dos-sidebar-width-collapsed", "--dos-safe-bottom", "--dos-safe-top", "--dos-touch-target-min"];
export declare const DOS_TYPOGRAPHY_TOKENS: readonly ["--dos-font-family", "--dos-font-size-xs", "--dos-font-size-sm", "--dos-font-size-md", "--dos-font-size-lg", "--dos-font-size-xl", "--dos-font-size-2xl", "--dos-font-size-input-mobile", "--dos-line-height-tight", "--dos-line-height-normal"];
export declare const DOS_Z_INDEX_TOKENS: readonly ["--dos-z-base", "--dos-z-sticky", "--dos-z-fixed", "--dos-z-overlay", "--dos-z-modal", "--dos-z-toast"];
export declare const DOS_BRAND_TOKENS: readonly ["--dos-color-brand-primary", "--dos-color-brand-primary-strong", "--dos-color-brand-primary-soft", "--dos-color-brand-accent", "--dos-color-brand-accent-strong", "--dos-color-brand-accent-soft", "--dos-color-brand-on-primary", "--dos-color-brand-on-accent", "--dos-gradient-brand-hero", "--dos-gradient-brand-cta"];
export declare const DOS_BRAND_CODES: readonly ["shahin-ai", "dogan-ai-os"];
export type DosBrandCode = (typeof DOS_BRAND_CODES)[number];
export declare const DOS_MARKETING_TOKENS: readonly ["--dos-marketing-section-pad-block", "--dos-marketing-section-gap", "--dos-marketing-container-max", "--dos-marketing-container-narrow", "--dos-marketing-container-prose", "--dos-marketing-container-pad-x", "--dos-marketing-hero-title-size", "--dos-marketing-hero-eyebrow-size", "--dos-marketing-hero-sub-size", "--dos-marketing-hero-line", "--dos-marketing-hero-pad-block", "--dos-marketing-section-title-size", "--dos-marketing-section-eyebrow-size", "--dos-marketing-cta-pad-y", "--dos-marketing-cta-pad-x", "--dos-marketing-cta-radius", "--dos-marketing-cta-font-size", "--dos-marketing-cta-min-tap", "--dos-marketing-card-pad", "--dos-marketing-card-radius", "--dos-marketing-card-gap", "--dos-marketing-card-shadow", "--dos-marketing-trust-gap", "--dos-marketing-pill-pad-y", "--dos-marketing-pill-pad-x", "--dos-marketing-pill-radius"];
export type DosBrandToken = (typeof DOS_BRAND_TOKENS)[number];
export type DosMarketingToken = (typeof DOS_MARKETING_TOKENS)[number];
export type DosColorToken = (typeof DOS_COLOR_TOKENS)[number];
export type DosSpacingToken = (typeof DOS_SPACING_TOKENS)[number];
export type DosRadiusToken = (typeof DOS_RADIUS_TOKENS)[number];
export type DosShadowToken = (typeof DOS_SHADOW_TOKENS)[number];
export type DosLayoutToken = (typeof DOS_LAYOUT_TOKENS)[number];
export type DosTypographyToken = (typeof DOS_TYPOGRAPHY_TOKENS)[number];
export type DosZIndexToken = (typeof DOS_Z_INDEX_TOKENS)[number];
export type DosGradientToken = (typeof DOS_GRADIENT_TOKENS)[number];
export type DosGlassToken = (typeof DOS_GLASS_TOKENS)[number];
export type DosDensityToken = (typeof DOS_DENSITY_TOKENS)[number];
export type DosDisplayTypeToken = (typeof DOS_DISPLAY_TYPE_TOKENS)[number];
