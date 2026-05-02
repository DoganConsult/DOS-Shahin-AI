import { safeQuery } from "@dos/db";

export type ProcessTaskType = 'remediation' | 'review' | 'escalation' | 'approval' | 'notification' | 'assessment';

export interface ProcessTaskInput {
  type: ProcessTaskType;
  title: string;
  description?: string;
  moduleCode: string;
  entityType: string;
  entityId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assigneeUserId?: string;
  assigneeRoleCode?: string;
  dueInDays?: number;
  metadata?: Record<string, unknown>;
}

export interface ProcessTask {
  taskId: string;
  tenantId: string;
  type: ProcessTaskType;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}
