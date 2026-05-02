/**
 * Contract-level ports barrel.
 *
 * Distinct from `ports/index.ts` which re-exports legacy host-bound symbols
 * from external workspace packages (`@dos/db`, `@dos/module-auth`, …). This
 * barrel exports only the *self-contained, fail-closed* ports introduced in
 * W2. The compliance build emits these so hosts can bind them via the
 * `RegisterComplianceOptions.foundation` / `.dynamicUi` channels.
 */
export * from './foundation.port';
export * from './dynamic-ui.port';
export {
  bindAuditPort,
  getAuditPort,
  writeAudit as writeAuditEntry,
  type AuditPort,
  type AuditEntry,
} from './audit.port';
