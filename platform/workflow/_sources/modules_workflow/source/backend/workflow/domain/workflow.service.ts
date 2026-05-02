export {
  getWorkflowInstance,
  createWorkflowInstance,
  updateWorkflowInstance,
  listWorkflowInstances,
  advanceWorkflowInstance,
  completeWorkflowInstance,
  cancelWorkflowInstance,
  WorkflowService,
} from '../services/core/workflow-core.service';

export type {
  WorkflowInstance,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ListWorkflowInput,
} from '../services/core/workflow-core.service';

export const WorkflowExecutionContext = (..._args: any[]): any => ({});
