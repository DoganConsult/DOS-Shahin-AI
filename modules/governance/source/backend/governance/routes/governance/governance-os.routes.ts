import { authenticate as _authenticate } from '../../ports/auth.port';
/**
 * Re-export from canonical location.
 * Law 1: One canonical engine per concern.
 */
export * from './intelligence/governance-os.routes';
export { default } from './intelligence/governance-os.routes';
