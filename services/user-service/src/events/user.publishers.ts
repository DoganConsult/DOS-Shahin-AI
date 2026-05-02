/**
 * Backwards-compat alias — forwards to ./publisher which is now the canonical
 * implementation with error logging and no swallowed failures.
 */
export {
  publishUserCreated,
  publishUserUpdated,
  publishUserDeactivated,
} from './publisher';
