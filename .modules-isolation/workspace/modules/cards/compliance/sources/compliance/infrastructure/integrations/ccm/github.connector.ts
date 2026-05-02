/**
 * Wave 15 — GitHub CCM connector (reference implementation).
 *
 * Pulls repository security posture (branch protection, secret scanning,
 * dependabot, code scanning, signed commits) and evaluates against
 * SDLC-related controls (CM-3, CM-4, SI-2, SA-11, SA-15).
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

interface GhRepo {
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  branchProtection?: {
    requirePullRequestReviews: boolean;
    requireStatusChecks: boolean;
    enforceAdmins: boolean;
    requireSignedCommits: boolean;
    requiredApprovingReviewCount: number;
  };
  secretScanning?: { enabled: boolean };
  dependabot?: { enabled: boolean; alerts: number };
  codeScanning?: { enabled: boolean };
}

export class GithubConnector implements CcmConnector {
  readonly connectorId = 'github' as const;
  readonly displayName = 'GitHub';
  readonly nativeFrameworks = ['NIST-800-53', 'NIST-SSDF', 'SOC2', 'PCI-DSS', 'CIS-GitHub'];

  private config: CcmConnectorTenantConfig | null = null;

  async configure(config: CcmConnectorTenantConfig): Promise<void> { this.config = config; }

  async healthCheck(): Promise<CcmHealthReport> {
    return {
      ok: false,
      connectorId: this.connectorId,
      authValid: false,
      permissionsValid: false,
      reachable: false,
      reason: 'GitHub SDK not wired (Wave 15 follow-up: install @octokit/rest)',
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
      errors: [{ message: 'GitHub SDK not wired — production wiring iterates orgs.listRepos + repos.getBranchProtection' }],
      findings: [],
    };
  }

  /** Pure helper: derive findings from a list of repo metadata. */
  static evaluateRepos(repos: GhRepo[], tenantId: string): CcmFinding[] {
    const findings: CcmFinding[] = [];
    for (const repo of repos) {
      if (!repo.branchProtection?.requirePullRequestReviews) {
        findings.push(buildFinding({
          externalId: `github-no-pr-review/${repo.fullName}`,
          connectorId: 'github',
          tenantId,
          title: `Repo without required PR reviews: ${repo.fullName}`,
          description: `Default branch ${repo.defaultBranch} on ${repo.fullName} does not require pull-request reviews before merge.`,
          severity: 'high',
          status: 'open',
          resourceId: repo.fullName,
          resourceType: 'github-repo',
          mappedControlCodes: ['CM-3', 'CM-4', 'SA-11(1)'],
          vendorCheckId: 'branch-protection-pr-review',
          evidence: { json: { fullName: repo.fullName, defaultBranch: repo.defaultBranch } },
        }));
      }
      if (!repo.secretScanning?.enabled && repo.isPrivate) {
        findings.push(buildFinding({
          externalId: `github-no-secret-scan/${repo.fullName}`,
          connectorId: 'github',
          tenantId,
          title: `Private repo without secret scanning: ${repo.fullName}`,
          description: `Secret scanning disabled — risk of credentials leaking via commits.`,
          severity: 'critical',
          status: 'open',
          resourceId: repo.fullName,
          resourceType: 'github-repo',
          mappedControlCodes: ['IA-5', 'SI-2', 'SA-15'],
          vendorCheckId: 'secret-scanning-required',
        }));
      }
      if (!repo.dependabot?.enabled) {
        findings.push(buildFinding({
          externalId: `github-no-dependabot/${repo.fullName}`,
          connectorId: 'github',
          tenantId,
          title: `Repo without Dependabot: ${repo.fullName}`,
          description: `Vulnerable-dependency monitoring disabled.`,
          severity: 'medium',
          status: 'open',
          resourceId: repo.fullName,
          resourceType: 'github-repo',
          mappedControlCodes: ['SI-2', 'RA-5'],
          vendorCheckId: 'dependabot-required',
        }));
      }
      if (!repo.branchProtection?.requireSignedCommits) {
        findings.push(buildFinding({
          externalId: `github-no-signed-commits/${repo.fullName}`,
          connectorId: 'github',
          tenantId,
          title: `Repo without signed commit requirement: ${repo.fullName}`,
          description: `Commits not required to be GPG-signed → identity-spoofing risk.`,
          severity: 'low',
          status: 'open',
          resourceId: repo.fullName,
          resourceType: 'github-repo',
          mappedControlCodes: ['SI-7', 'CM-5'],
          vendorCheckId: 'signed-commits-required',
        }));
      }
    }
    return findings;
  }
}

registerCcmConnector('github', () => new GithubConnector());
