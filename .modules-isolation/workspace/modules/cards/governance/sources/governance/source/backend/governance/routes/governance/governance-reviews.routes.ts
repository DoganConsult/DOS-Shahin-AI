import { authenticate as _authenticate } from '../../ports/auth.port';
/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './operations/governance-reviews.routes';
export { default } from './operations/governance-reviews.routes';
