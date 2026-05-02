import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  onWorkflowTriggered,
  onTaskCreated,
  onApprovalRequired,
  onEscalation,
  onClosure,
  onFailure,
} from './remediation-workflow.service';

describe('Remediation Workflow Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hook functions', () => {
    const ctx = {
      tenantId: 't1',
      entityId: 'e1',
      entityType: 'test',
      triggeredBy: 'u1',
    };

    it('onWorkflowTriggered should resolve without error', async () => {
      await expect(onWorkflowTriggered(ctx)).resolves.not.toThrow();
    });

    it('onTaskCreated should resolve without error', async () => {
      await expect(onTaskCreated(ctx, 'task-1')).resolves.not.toThrow();
    });

    it('onApprovalRequired should resolve without error', async () => {
      await expect(onApprovalRequired(ctx, 'admin')).resolves.not.toThrow();
    });

    it('onEscalation should resolve without error', async () => {
      await expect(onEscalation(ctx, 'overdue', 'manager')).resolves.not.toThrow();
    });

    it('onClosure should resolve without error', async () => {
      await expect(onClosure(ctx, 'completed')).resolves.not.toThrow();
    });

    it('onFailure should resolve without error', async () => {
      await expect(onFailure(ctx, 'unexpected error')).resolves.not.toThrow();
    });

  });

  describe('type safety', () => {
    it('should export all required hook functions', () => {
      expect(typeof onWorkflowTriggered).toBe('function');
      expect(typeof onTaskCreated).toBe('function');
      expect(typeof onApprovalRequired).toBe('function');
      expect(typeof onEscalation).toBe('function');
      expect(typeof onClosure).toBe('function');
      expect(typeof onFailure).toBe('function');
    });
  });
});
