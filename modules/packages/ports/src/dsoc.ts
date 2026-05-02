/**
 * DSOCPort — public surface of the DSOC (Security Operations Center) platform
 * module.
 *
 * Status: Interface-only for now. DSOC module itself is bootstrapped in a
 * later session; until then, platform modules publish audit/security events
 * to the DOS event-backbone under the `dsoc.*` topic prefix, where the
 * eventual DSOC service will subscribe.
 */

export type DSOCSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type DSOCEventCategory =
  | 'authn'
  | 'authz'
  | 'session'
  | 'mfa'
  | 'sod'
  | 'delegation'
  | 'config_change'
  | 'data_access'
  | 'threat'
  | 'posture';

export interface DSOCAuditEvent {
  readonly tenantId: string;
  readonly category: DSOCEventCategory;
  readonly severity: DSOCSeverity;
  readonly actor: { readonly type: 'user' | 'service' | 'agent'; readonly id: string };
  readonly action: string;
  readonly resource?: { readonly type: string; readonly id: string };
  readonly outcome: 'success' | 'failure' | 'denied';
  readonly occurredAt: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
  readonly correlationId?: string;
}

export interface DSOCPostureSnapshot {
  readonly tenantId: string;
  readonly capturedAt: string;
  readonly score: number;
  readonly findings: readonly {
    readonly code: string;
    readonly severity: DSOCSeverity;
    readonly summary: string;
  }[];
}

export interface DSOCPort {
  /** Record an audit event. Implementations MUST be non-blocking (outbox / async). */
  recordAuditEvent(event: DSOCAuditEvent): Promise<void>;

  /** Get the latest posture snapshot for a tenant, or null if none. */
  getLatestPosture(tenantId: string): Promise<DSOCPostureSnapshot | null>;

  /**
   * Raise a security alert. Severity ≥ 'high' triggers paging per tenant config;
   * lower severities are recorded only.
   */
  raiseAlert(event: DSOCAuditEvent): Promise<void>;
}
