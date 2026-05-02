/**
 * Audit port — narrow facade Compliance handlers use to record audit events.
 *
 * The default implementation delegates to the Foundation port (Foundation owns
 * the `audit_trail` table). Hosts can override with a direct DB writer if
 * Foundation isn't yet bound (e.g. during isolated module tests).
 */
import {
  bindFoundationPort,
  getFoundationPort,
  type FoundationAuditEntry,
} from './foundation.port';

export type AuditEntry = FoundationAuditEntry;

export interface AuditPort {
  write(entry: AuditEntry): Promise<void>;
}

let _impl: AuditPort = {
  write: (entry) => getFoundationPort().writeAudit(entry),
};

export function bindAuditPort(impl: Partial<AuditPort>): void {
  _impl = { ..._impl, ...impl };
}

export function getAuditPort(): AuditPort {
  return _impl;
}

export const writeAudit: AuditPort['write'] = (entry) => _impl.write(entry);

export { bindFoundationPort };
