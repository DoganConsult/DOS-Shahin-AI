import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPublish } = vi.hoisted(() => ({
  mockPublish: vi.fn().mockResolvedValue('evt-id'),
}));

vi.mock('@dos/module-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dos/module-sdk')>();
  return {
    ...actual,
    publishEvent: mockPublish,
  };
});

import {
  publishWorkflowCreated,
  publishWorkflowCompleted,
  publishTaskAssigned,
  publishApprovalDecided,
} from '../events/workflow.publishers';

describe('workflow-service publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishWorkflowCreated publishes event', async () => {
    await publishWorkflowCreated({ instance_id: 'wf-1', tenant_id: 't1', workflow_type: 'approval', name: 'Test', status: 'pending', created_by: 'u1' } as any);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'workflow.created', tenantId: 't1' }),
    );
  });

  it('publishWorkflowCompleted publishes event', async () => {
    await publishWorkflowCompleted({ instance_id: 'wf-1', tenant_id: 't1', workflow_type: 'approval', name: 'Test', status: 'completed', completed_at: '2026-01-01' } as any);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'workflow.completed', tenantId: 't1' }),
    );
  });

  it('publishTaskAssigned publishes event', async () => {
    await publishTaskAssigned({ task_id: 'task-1', tenant_id: 't1', instance_id: 'wf-1', assigned_to: 'u1', title: 'Review' } as any);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'task.assigned', tenantId: 't1' }),
    );
  });

  it('publishApprovalDecided publishes event', async () => {
    await publishApprovalDecided({ approval_id: 'appr-1', tenant_id: 't1', workflow_instance_id: 'wf-1', approved_by: 'u1', subject: 'Test' } as any);
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'approval.decided', tenantId: 't1' }),
    );
  });
});
