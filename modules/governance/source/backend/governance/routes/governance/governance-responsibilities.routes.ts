import { authenticate as _authenticate } from '../../ports/auth.port';
/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './structure/governance-responsibilities.routes';
export { default } from './structure/governance-responsibilities.routes';
