/**
 * Observability Middleware for risk
 * 
 * Generated automatically by enterprise module standards
 * 
 * @owner risk
 * @since 2026-04-10
 */

export const observability = {
  moduleCode: 'risk',
  enableLogging: true,
  enableMetrics: true,
  enableTracing: true,
  enableHealthChecks: true,
  loggingLevel: 'info',
  tracingSamplingRate: 0.1,
  sensitiveActions: ['POST', 'PUT', 'DELETE', 'admin', 'approve', 'reject', 'mitigate', 'accept'],
  customMetrics: ['risk.assessments.total', 'risk.scores.changed', 'risk.mitigations.created', 'risk.appetite.breached']
};

export const createObservability = observability;
