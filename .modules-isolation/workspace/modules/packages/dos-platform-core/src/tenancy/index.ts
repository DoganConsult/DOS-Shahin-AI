export type {
  TenantContract,
  WorkspaceContract,
} from '@dos/contracts';

export type {
  DosTenancyPort,
  DosWorkspacePort,
} from '../ports';

export * from './tenancy';
export { PostgresTenancyAdapter, registerTenancyAdapter } from './postgres-adapter';
