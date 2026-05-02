import { authenticate as _authenticate } from '../../ports/auth.port';
/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './intelligence/governance-executive-summaries.routes';
export { default } from './intelligence/governance-executive-summaries.routes';
