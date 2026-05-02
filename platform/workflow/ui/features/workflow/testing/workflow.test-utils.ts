import type {
  WorkflowDefinitionContract,
  WorkflowExecutionContract,
} from '../contracts/workflow.contracts';

export function mockWorkflowDefinition(
  overrides?: Partial<WorkflowDefinitionContract>,
): WorkflowDefinitionContract {
  return {
    definitionId: 'def-001',
    code: 'test-workflow',
    version: 1,
    nameEn: 'Test Workflow',
    nameAr: null,
    moduleCode: 'workflow',
    entityType: 'generic',
    triggerType: 'manual',
    status: 'active',
    stepCount: 3,
    transitionCount: 2,
    slaHours: 72,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockWorkflowExecution(
  overrides?: Partial<WorkflowExecutionContract>,
): WorkflowExecutionContract {
  return {
    executionId: 'exec-001',
    definitionCode: 'test-workflow',
    entityType: 'generic',
    entityId: 'entity-001',
    state: 'running',
    currentStep: 'step-1',
    assigneeId: 'user-001',
    startedAt: new Date().toISOString(),
    completedAt: null,
    slaDeadline: null,
    ...overrides,
  };
}
