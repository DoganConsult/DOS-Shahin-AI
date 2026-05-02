/**
 * AI Route Schemas — Re-export barrel
 *
 * The canonical Zod validation schemas live in modules/ai/schemas/ai.schemas.ts.
 * This file re-exports them for route files that import from the
 * routes/schemas/ path (e.g., routes/core/ai.routes.ts).
 */

export {
  // Request body schemas used by ai.routes.ts
  generatePolicyBody,
  copilotQueryBody,
  autoEvalBody,

  // Agent CRUD schemas
  createAgentBody,
  updateAgentBody,
  listAgentsQuery,
  chatBody,
  bulkDeleteAgentsBody,
  bulkUpdateAgentsBody,

  // Legacy / assessment schemas
  riskAssessmentParams,
  gapAnalysisParams,

  // Response schemas
  aiResponseSchema,
  aiListResponseSchema,

  // Event and status schemas
  aiEventPayloadSchema,
  aiStatusTransitionSchema,

  // Import/export schemas
  aiImportRowSchema,
  aiImportBatchSchema,
  aiExportRequestSchema,

  // Admin schemas
  aiAdminConfigSchema,

  // Bulk operation schemas
  aiBulkUpdateSchema,
  aiBulkStatusChangeSchema,
} from '../../schemas/ai.schemas';
