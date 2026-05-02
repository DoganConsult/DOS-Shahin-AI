export interface InstallPackDto {
  packCode: string;
  appliesToRole?: string | null;
  workspaceId?: string | null;
  installedBy?: string | null;
}

export interface PackInstallResultDto {
  packCode: string;
  version: string;
  installed: boolean;
  steps: Array<{
    step: string;
    status: 'ok' | 'skipped' | 'failed';
    details?: string;
  }>;
}
