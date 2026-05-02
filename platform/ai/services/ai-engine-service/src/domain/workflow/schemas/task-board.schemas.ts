import { z } from 'zod';

export const createTasksBody = z.object({
  title: z.string().min(1),
  description: z.unknown().optional(),
  assignedTo: z.unknown().optional(),
  dueDate: z.unknown().optional(),
  entityType: z.unknown().optional(),
  entityId: z.unknown().optional(),
});

export type CreateTasksBodyInput = z.infer<typeof createTasksBody>;

export const updateTasksidStatusBody = z.object({
  status: z.string().min(1),
});

export type UpdateTasksidStatusBodyInput = z.infer<typeof updateTasksidStatusBody>;
