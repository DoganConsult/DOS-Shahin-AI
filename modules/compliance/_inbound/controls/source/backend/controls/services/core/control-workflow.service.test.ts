import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => ({
  safeQuery: vi.fn().mockResolvedValue({ rows: [] }),
  safeQueryWithClient: vi.fn().mockResolvedValue({ rows: [{ id: 'test-id' }] }),
  tenantSchema: vi.fn().mockReturnValue('tenant_test'),
  withTransaction: vi.fn((_tid: string, fn: any) => fn({})),
}));

vi.mock('../../../platform/dos/events/event-bus', () => ({
  emitEvent: vi.fn(),
}));

import { ControlWorkflowService } from './control-workflow.service';

describe('Controls Workflow Service', () => {
  let svc: ControlWorkflowService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new ControlWorkflowService();
  });

  it('should be instantiable', () => {
    expect(svc).toBeDefined();
  });

  describe('scheduleTest', () => {
    it('should have scheduleTest method', () => {
      expect(typeof svc.scheduleTest).toBe('function');
    });
  });

  describe('assignTeam', () => {
    it('should have assignTeam method', () => {
      expect(typeof svc.assignTeam).toBe('function');
    });
  });

  describe('requestEvidence', () => {
    it('should have requestEvidence method', () => {
      expect(typeof svc.requestEvidence).toBe('function');
    });
  });

  describe('reviewRemediation', () => {
    it('should have reviewRemediation method', () => {
      expect(typeof svc.reviewRemediation).toBe('function');
    });
  });
});
