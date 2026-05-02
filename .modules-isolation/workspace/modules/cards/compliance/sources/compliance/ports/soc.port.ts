/**
 * Compliance module → security-ops port.
 *
 * Re-exports @dos/module-soc so the rest of the module stays decoupled
 * from the underlying DSOC platform module. Product shell binds the
 * concrete DSOCPort at bootstrap via bindModuleSOC(port).
 */

export {
  bindModuleSOC,
  resetModuleSOC,
  emitAudit,
  raiseAlert,
} from '@dos/module-soc';

export type {
  DSOCAuditEvent,
  DSOCSeverity,
  DSOCEventCategory,
  DSOCPort,
} from '@dos/module-soc';
