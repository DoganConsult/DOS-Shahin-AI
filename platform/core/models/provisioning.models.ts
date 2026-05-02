export type ProvisioningStepStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ProvisioningJobStatus = 'running' | 'completed' | 'failed';

export interface ProvisioningStepDto {
  name: string;
  stageIndex: number;
  status: ProvisioningStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface ProvisioningJobDto {
  jobId: string;
  tenantId: string;
  status: ProvisioningJobStatus;
  percent: number;
  currentStep: string | null;
  errorMessage: string | null;
}

export interface ProvisioningStatusResponse {
  job: ProvisioningJobDto;
  steps: ProvisioningStepDto[];
}
