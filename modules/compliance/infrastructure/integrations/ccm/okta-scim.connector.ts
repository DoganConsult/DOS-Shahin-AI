/**
 * Wave 15 — Okta SCIM CCM connector (reference implementation).
 *
 * Okta exposes user, group, and policy data via SCIM 2.0 + native Okta API.
 * This connector pulls users/groups/MFA-status, evaluates against IAM-related
 * compliance controls (AC-2, AC-2(1), IA-2, IA-2(1)), emits findings.
 */
import {
  type CcmConnector,
  type CcmConnectorTenantConfig,
  type CcmEvaluationResult,
  type CcmFinding,
  type CcmHealthReport,
  buildFinding,
  registerCcmConnector,
} from './connector.contract';

interface OktaUser {
  id: string;
  status: 'ACTIVE' | 'STAGED' | 'PROVISIONED' | 'DEPROVISIONED' | 'SUSPENDED' | 'LOCKED_OUT' | 'PASSWORD_EXPIRED' | 'RECOVERY';
  profile: { login: string; email: string };
  credentials?: { password?: { value?: string }; provider?: { name?: string } };
  mfa?: { factors: Array<{ factorType: string; status: string }> };
}

export class OktaScimConnector implements CcmConnector {
  readonly connectorId = 'okta-scim' as const;
  readonly displayName = 'Okta SCIM';
  readonly nativeFrameworks = ['NIST-800-53', 'ISO-27001', 'SOC2', 'PCI-DSS'];

  private config: CcmConnectorTenantConfig | null = null;

  async configure(config: CcmConnectorTenantConfig): Promise<void> { this.config = config; }

  async healthCheck(): Promise<CcmHealthReport> {
    return {
      ok: false,
      connectorId: this.connectorId,
      authValid: false,
      permissionsValid: false,
      reachable: false,
      reason: 'Okta SDK not wired (Wave 15 follow-up: install @okta/okta-sdk-nodejs)',
      checkedAt: new Date().toISOString(),
    };
  }

  async evaluate(opts: { tenantId: string; mappedControls: Array<{ controlCode: string; vendorCheckIds?: string[] }> }): Promise<CcmEvaluationResult> {
    const startedAt = new Date().toISOString();
    return {
      connectorId: this.connectorId,
      tenantId: opts.tenantId,
      startedAt,
      completedAt: new Date().toISOString(),
      resourcesScanned: 0,
      findingsTotal: 0,
      findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      errors: [{ message: 'Okta SDK not wired — production wiring lists users via /api/v1/users + factor enrollment' }],
      findings: [],
    };
  }

  /**
   * Pure helper: detect users without MFA factors enrolled. Maps to
   * NIST 800-53 IA-2(1) (multi-factor auth for privileged access).
   */
  static usersWithoutMfa(users: OktaUser[], tenantId: string): CcmFinding[] {
    return users
      .filter((u) => u.status === 'ACTIVE' && (!u.mfa?.factors || u.mfa.factors.filter((f) => f.status === 'ACTIVE').length === 0))
      .map((u) =>
        buildFinding({
          externalId: `okta-user-no-mfa/${u.id}`,
          connectorId: 'okta-scim',
          tenantId,
          title: `Active Okta user without MFA: ${u.profile.login}`,
          description: `User ${u.profile.login} (${u.profile.email}) is ACTIVE but has no enrolled MFA factor.`,
          severity: 'high',
          status: 'open',
          resourceId: u.id,
          resourceType: 'okta-user',
          mappedControlCodes: ['IA-2(1)', 'AC-2(1)', 'IAM-1'],
          vendorCheckId: 'mfa-required',
          evidence: { json: { userId: u.id, login: u.profile.login, status: u.status } },
        }),
      );
  }
}

registerCcmConnector('okta-scim', () => new OktaScimConnector());
