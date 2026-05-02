/**
 * @dos/module-qiyas — public barrel.
 */
export { runMigrations } from './db/runner';
export type { RunMigrationsResult, MigrationRecord, DbClient, QueryResult } from './db/runner';
export {
  registerQiyas,
  bindQiyasPorts,
  onInstall,
  onActivate,
  onMigrate,
  onUninstall,
} from './bootstrap';
export type {
  QiyasHostBindings,
  RegisterQiyasOptions,
  RegisterQiyasResult,
} from './bootstrap';

export const QIYAS_CONTRACT_VERSION = 'v1' as const;
