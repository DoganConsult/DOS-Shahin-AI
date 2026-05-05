/**
 * Input Validation Middleware for risk
 * 
 * Generated automatically by enterprise module standards
 * 
 * @owner risk
 * @since 2026-04-10
 */

export const inputValidation = {
  moduleCode: 'risk',
  validateSchema: true,
  validateQuery: true,
  validateParams: true,
  sanitizeInput: true,
  maxFileSize: 10485760, // 10MB
  allowedFileTypes: ['application/json', 'text/csv', 'application/vnd.ms-excel'],
  customValidators: [
    {
      name: 'risk_score_validator',
      validator: (value: any) => {
        if (typeof value === 'number' && (value < 0 || value > 100)) {
          return {
            valid: false,
            errors: [{ field: 'score', message: 'Risk score must be between 0 and 100', severity: 'error' as const }]
          };
        }
        return { valid: true, errors: [] };
      },
      field: 'score'
    },
    {
      name: 'risk_assessment_validator',
      validator: (value: any) => {
        if (typeof value === 'string' && value.length > 500) {
          return {
            valid: false,
            errors: [{ field: 'assessment', message: 'Risk assessment cannot exceed 500 characters', severity: 'error' as const }]
          };
        }
        return { valid: true, errors: [] };
      },
      field: 'assessment'
    }
  ]
};

export const createInputValidation = inputValidation;
