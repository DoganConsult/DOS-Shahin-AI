import { z } from 'zod';

export const createWorkflowBody = z.object({
  workflowType: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const updateWorkflowBody = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
});

export const createTaskBody = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  assigned_to: z.string().uuid(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});

export const createApprovalBody = z.object({
  subject: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  approvers: z.array(z.string().uuid()).min(1),
  deadline: z.string().datetime().optional(),
});

export const approvalDecisionBody = z.object({
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(2000).optional(),
});

export const createTemplateBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  workflow_type: z.string().min(1).max(100),
  steps: z.array(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    config: z.record(z.unknown()).optional(),
  })).min(1),
});

export const createScheduleBody = z.object({
  name: z.string().min(1).max(200),
  cron_expression: z.string().min(1).max(100),
  workflow_template_id: z.string().uuid(),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  type: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
