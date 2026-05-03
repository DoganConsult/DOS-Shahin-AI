/**
 * marketing-page-kit — internal DOS kit (NOT a third-party template).
 *
 * One-source rule:
 *   IBM Carbon Angular  →  @dos/ui-system Carbon wrappers (src/carbon/*)
 *                         →  this kit (src/marketing/*)
 *                         →  product/marketing routes
 *
 * Hard rules (enforced by `ui-os-carbon-boundary-guard`):
 *   - NO marketplace templates.
 *   - NO PrimeNG / Material / Tailwind themes.
 *   - NO direct `carbon-components-angular` imports outside src/carbon/.
 *   - Tokens come from `@dos/design-tokens` only.
 *
 * Surface: 6 public marketing pages + landing + download-kit + bilingual config.
 */
export * from './marketing-public-config.service';
export * from './marketing-home.page';
export * from './marketing-public-pages.components';
export * from './download-kit.contract';
export * from './download-kit.components';
