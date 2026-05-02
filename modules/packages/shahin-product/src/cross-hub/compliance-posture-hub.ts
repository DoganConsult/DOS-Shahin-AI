// Re-export shim — actual implementation lives in modules/compliance/ (Rule #2).
// shahin-product owns cross-hub composition; module owns the handler logic.
export * from '../../../../../modules/compliance/infrastructure/messaging/cross-hub/compliance-posture-hub';
