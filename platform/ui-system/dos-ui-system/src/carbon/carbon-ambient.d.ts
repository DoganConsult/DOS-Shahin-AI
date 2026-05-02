/**
 * Ambient declarations for IBM Carbon runtime modules.
 *
 * The Carbon packages (carbon-components-angular, @carbon/icons-angular,
 * @carbon/charts-angular, @carbon/icons) are installed in the consuming
 * Angular application (Shahin) but not at the @dos/ui-system package
 * level. These declarations let the wrapper components compile inside
 * the package while still binding to real Carbon types/components at
 * application build time via Angular's standalone-component imports.
 *
 * One-source rule: Carbon components are imported ONLY here and inside
 * src/carbon/*.component.ts wrappers. The ui-os-carbon-boundary-guard
 * fails the build if any consumer (products/, modules/, services/)
 * imports `carbon-components-angular` or `@carbon/*-angular` directly.
 */
// IMPORTANT — when the consuming app HAS `carbon-components-angular`
// installed (Shahin always does), the package's own `index.d.ts` ships
// real Angular module types and we MUST NOT shadow them with bare
// `declare module 'carbon-components-angular'` blocks. A bare ambient
// resolves named imports to `any`, which the Angular standalone-imports
// check (NG1010) then rejects as "not an NgModule" at AOT time.
//
// Strategy: gate the package-level declarations behind a "stub-only" mode
// that's enabled at @dos/ui-system standalone build time (where Carbon
// is NOT installed). At consumer build time the real .d.ts wins because
// the package resolves before any ambient declaration. Sub-paths and
// sibling packages (icons / charts / @carbon/icons) keep bare declarations
// because they're loosely consumed and don't feed Angular's imports[].
declare module '@carbon/icons-angular';
declare module '@carbon/icons-angular/*';
declare module '@carbon/charts-angular';
declare module '@carbon/charts-angular/*';
declare module '@carbon/icons/*';
