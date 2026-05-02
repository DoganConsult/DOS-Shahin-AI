import { z } from 'zod';

/**
 * Enterprise Context-Aware Domain Contract - Workflow
 * Strictly maps to underlying table entities and formal ingress configurations.
 */

export const WorkflowBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  processDefinitionId: z.string().uuid(), stateMachine: z.string(), currentStep: z.string(), isPaused: z.boolean(), retryCount: z.number().int(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const WorkflowCreateSchema = WorkflowBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const WorkflowUpdateSchema = WorkflowCreateSchema.partial();

export const WorkflowResponseSchema = WorkflowBaseSchema;

export type WorkflowCreateDTO = z.infer<typeof WorkflowCreateSchema>;
export type WorkflowUpdateDTO = z.infer<typeof WorkflowUpdateSchema>;
export type WorkflowResponseDTO = z.infer<typeof WorkflowResponseSchema>;

export interface IWorkflowContract {
  id: string;
  tenantId: string;
  processDefinitionId: string; stateMachine: string; currentStep: string; isPaused: boolean; retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}
