/**
 * Compliance signature widgets — registered with the dynamic-ui component
 * registry by `application/ui/register-components.ts`. Each widget is a
 * standalone Angular component that composes `@dos/ui-system` primitives.
 *
 * Per spec §35.3 signatureWidgets:
 *   control-library-matrix, obligation-map, assessment-cockpit,
 *   evidence-binder, gap-remediation-board, framework-mapping
 * Plus report-composer for `/compliance/reports` (§28.4).
 */
export * from './control-library-matrix.component';
export * from './obligation-map.component';
export * from './assessment-cockpit.component';
export * from './evidence-binder.component';
export * from './gap-remediation-board.component';
export * from './framework-mapping.component';
export * from './report-composer.component';
