/**
 * @shahin/shared-compliance-types — re-exports from @dos/types.
 *
 * This package exists for backward compatibility with 2 backend files that import from it.
 * All canonical types live in @dos/types. No new code should import from this package.
 * See LAUNCH_LOCKS.md Lock 9.
 */
export {
  COMPLIANCE_CONTROL_STATUSES,
  isControlStatus,
  type ControlStatus,
} from '@dos/types';
