/**
 * Workflow Service HTTP Contracts
 * Owner: workflow-service (port 4004)
 * Source: extracted from monolith workflow module
 */

// --- Request DTOs ---

export interface CreateWorkflowInstanceRequest {
  workflowType: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  initiatedBy: string;
  metadata?: Record<string, unknown>;
}

export interface AdvanceWorkflowRequest {
  action: 'approve' | 'reject' | 'skip' | 'escalate';
  actorId: string;
  comment?: string;
}

export interface CompleteTaskRequest {
  taskId: string;
  result: 'completed' | 'failed' | 'skipped';
  actorId: string;
  output?: Record<string, unknown>;
}

export interface CreateApprovalRequest {
  tenantId: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  approverIds: string[];
  approvalType: 'single' | 'sequential' | 'parallel';
  metadata?: Record<string, unknown>;
}

export interface RegisterJobRequest {
  jobCode: string;
  cron: string;
  targetService: string;
  endpoint: string;
  enabled: boolean;
}

// --- Response DTOs ---

export interface WorkflowInstance {
  id: string;
  workflowType: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  currentStep: string;
  steps: WorkflowStep[];
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  stepId: string;
  stepType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  assignedTo?: string;
  completedBy?: string;
  completedAt?: string;
}

export interface WorkflowTask {
  id: string;
  instanceId: string;
  stepId: string;
  tenantId: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dueDate?: string;
  createdAt: string;
}

// --- API Route Contracts (enriched per DOS-AIO-Specs Law 5) ---

export const WORKFLOW_API_ROUTES = {
  createInstance: {
    method: 'POST' as const, path: '/api/workflow/instances',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:instances:create',
    requestType: 'CreateWorkflowInstanceRequest', responseType: 'WorkflowInstance',
    emitsEvent: 'workflow.instance_created', errorModel: 'ServiceErrorResponse',
  },
  getInstance: {
    method: 'GET' as const, path: '/api/workflow/instances/:id',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:instances:read',
    requestType: null, responseType: 'WorkflowInstance',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  advanceInstance: {
    method: 'POST' as const, path: '/api/workflow/instances/:id/advance',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:instances:advance',
    requestType: 'AdvanceWorkflowRequest', responseType: 'WorkflowInstance',
    emitsEvent: 'workflow.status_changed', errorModel: 'ServiceErrorResponse',
  },
  cancelInstance: {
    method: 'POST' as const, path: '/api/workflow/instances/:id/cancel',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:instances:cancel',
    requestType: null, responseType: 'WorkflowInstance',
    emitsEvent: 'workflow.instance_cancelled', errorModel: 'ServiceErrorResponse',
  },
  listTasks: {
    method: 'GET' as const, path: '/api/workflow/tasks',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:tasks:list',
    requestType: 'StandardListParams', responseType: 'StandardListResponse<WorkflowTask>',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
  completeTask: {
    method: 'POST' as const, path: '/api/workflow/tasks/:id/complete',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:tasks:complete',
    requestType: 'CompleteTaskRequest', responseType: 'void',
    emitsEvent: 'workflow.task_completed', errorModel: 'ServiceErrorResponse',
  },
  createApproval: {
    method: 'POST' as const, path: '/api/workflow/approvals',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'authenticated' as const, permission: 'workflow:approvals:create',
    requestType: 'CreateApprovalRequest', responseType: 'WorkflowInstance',
    emitsEvent: 'workflow.approval_requested', errorModel: 'ServiceErrorResponse',
  },
  registerJob: {
    method: 'POST' as const, path: '/api/workflow/jobs/register',
    contractVersion: 1, ownerService: 'workflow-service',
    authMode: 'service' as const, permission: 'workflow:jobs:register',
    requestType: 'RegisterJobRequest', responseType: 'StandardMutationResponse',
    emitsEvent: null, errorModel: 'ServiceErrorResponse',
  },
} as const;
