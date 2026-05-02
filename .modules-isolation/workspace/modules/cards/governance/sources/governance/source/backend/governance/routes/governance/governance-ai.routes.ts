import { authenticate as _authenticate } from '../../ports/auth.port';
/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from '../../../governance-ai/routes/governance-ai.routes';
export { default } from '../../../governance-ai/routes/governance-ai.routes';
