/**
 * API Contract Validation Middleware for risk
 * 
 * Generated automatically by enterprise module standards
 * 
 * @owner risk
 * @since 2026-04-10
 */

import { createApiContractValidation } from '../../../platform/dos/middleware/api-contract-validation.middleware';

export const apiContractValidation = createApiContractValidation({
  moduleCode: 'risk',
  apiVersion: 'v1',
  requireAuth: true,
  validateRequest: true,
  validateResponse: true,
  openApiSpecPath: 'schemas/risk/openapi.json',
  requestSchemaPath: 'schemas/risk/request',
  responseSchemaPath: 'schemas/risk/response'
});
