// Re-export logger as logger.port to satisfy code paths that import
// '../ports/logger.port'. The actual implementation lives in logger.ts.
export * from './logger';
