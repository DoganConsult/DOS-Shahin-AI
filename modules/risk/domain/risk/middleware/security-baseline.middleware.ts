/**
 * Security Baseline Middleware for risk
 * 
 * Generated automatically by enterprise module standards
 * 
 * @owner risk
 * @since 2026-04-10
 */

import { createSecurityBaseline } from './security-baseline.middleware';

export const securityBaseline = createSecurityBaseline({
  moduleCode: 'risk',
  enableRateLimit: true,
  enableSecureHeaders: true,
  enableInputSanitization: true,
  enableAuditTrail: true,
  rateLimitWindow: 60,
  rateLimitMax: 200, // Higher limit for risk assessments
  privilegedActions: ['POST', 'PUT', 'DELETE', 'admin', 'approve', 'reject', 'mitigate', 'accept'],
  customSecurityHeaders: {
    'X-Risk-Security': 'enterprise-grade',
    'X-Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  }
});
