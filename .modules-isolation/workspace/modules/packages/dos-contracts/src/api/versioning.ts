export type ApiVersionStatus = 'current' | 'deprecated' | 'sunset' | 'experimental';

export interface ApiVersion {
  version: string;
  status: ApiVersionStatus;
  releasedAt: string;
  deprecatedAt?: string;
  sunsetAt?: string;
  changelog?: string;
}

export interface VersionedApiContract {
  route: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  versions: ApiVersionEntry[];
  ownerScope: 'platform' | 'product' | 'module';
  moduleCode?: string;
}

export interface ApiVersionEntry {
  version: string;
  status: ApiVersionStatus;
  requestSchema?: string;
  responseSchema?: string;
  breaking?: boolean;
  migrationGuide?: string;
}

export interface ApiDeprecationPolicy {
  minDeprecationNoticeMs: number;
  sunsetGracePeriodMs: number;
  requireMigrationGuide: boolean;
  notifyOnDeprecatedUsage: boolean;
}

export const DEFAULT_DEPRECATION_POLICY: ApiDeprecationPolicy = {
  minDeprecationNoticeMs: 90 * 24 * 60 * 60 * 1000,
  sunsetGracePeriodMs: 180 * 24 * 60 * 60 * 1000,
  requireMigrationGuide: true,
  notifyOnDeprecatedUsage: true,
};

export interface VersionNegotiationResult {
  resolvedVersion: string;
  requestedVersion?: string;
  isDeprecated: boolean;
  sunsetDate?: string;
  warnings: string[];
}

export function negotiateVersion(
  contract: VersionedApiContract,
  requestedVersion?: string,
): VersionNegotiationResult {
  const warnings: string[] = [];

  if (requestedVersion) {
    const entry = contract.versions.find(v => v.version === requestedVersion);
    if (entry) {
      if (entry.status === 'sunset') {
        const current = contract.versions.find(v => v.status === 'current');
        return {
          resolvedVersion: current?.version || entry.version,
          requestedVersion,
          isDeprecated: false,
          warnings: [`Version ${requestedVersion} has been sunset. Upgraded to ${current?.version || 'latest'}.`],
        };
      }
      if (entry.status === 'deprecated') {
        warnings.push(`Version ${requestedVersion} is deprecated. Please migrate to a current version.`);
      }
      return {
        resolvedVersion: entry.version,
        requestedVersion,
        isDeprecated: entry.status === 'deprecated',
        warnings,
      };
    }
    warnings.push(`Requested version ${requestedVersion} not found. Falling back to current.`);
  }

  const current = contract.versions.find(v => v.status === 'current');
  if (!current) {
    const latest = contract.versions[contract.versions.length - 1];
    return {
      resolvedVersion: latest?.version || '1',
      requestedVersion,
      isDeprecated: latest?.status === 'deprecated',
      warnings: [...warnings, 'No current version found.'],
    };
  }

  return {
    resolvedVersion: current.version,
    requestedVersion,
    isDeprecated: false,
    warnings,
  };
}

export function validateDeprecation(
  entry: ApiVersionEntry,
  deprecationDate: Date,
  policy: ApiDeprecationPolicy = DEFAULT_DEPRECATION_POLICY,
): string[] {
  const errors: string[] = [];

  if (entry.status === 'deprecated') {
    if (policy.requireMigrationGuide && !entry.migrationGuide) {
      errors.push(`Version ${entry.version}: deprecation requires a migration guide.`);
    }
  }

  return errors;
}
