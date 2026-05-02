// Backend-level platform port barrel — neutral re-exports that do not
// depend on any module's canonical platform service.
export { metricsMiddleware } from '@dos/platform-core/observability';
export { catchHandler, EC } from '@dos/platform-core/resilience';
export { registerJob } from '@dos/platform-core/jobs';
export { getProvisionedTenants } from '@dos/platform-core/tenancy';
export {
  SYSTEM_JOB_ACTOR,
  SYSTEM_TENANT,
  SYSTEM_SEEDER_ACTOR,
  SYSTEM_EVENT_PROPAGATOR_ACTOR,
  SYSTEM_INVITATION_ACTOR,
} from '@dos/platform-core/constants';

export interface GenericRow { [key: string]: unknown }
