/**
 * Knowledge Module — Public API Barrel Export
 * @owner knowledge
 * @module knowledge
 * @since 2026-04-11
 */

import './lifecycle-registration';

export { default as knowledgeRoutes } from './routes/knowledge.routes';
export { default as knowledgeDiagnosticsRoutes } from './routes/knowledge-diagnostics.routes';

export { runDiagnostics } from './diagnostics/knowledge-diagnostics.service';
