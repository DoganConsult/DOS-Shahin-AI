import { z } from 'zod';
export const createTasksBody = z.object({
    title: z.string().min(1),
    description: z.unknown().optional(),
    assignedTo: z.unknown().optional(),
    dueDate: z.unknown().optional(),
    entityType: z.unknown().optional(),
    entityId: z.unknown().optional(),
});
export const updateTasksidStatusBody = z.object({
    status: z.string().min(1),
});
//# sourceMappingURL=task-board.schemas.js.map