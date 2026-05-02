import { describe, it, expect, vi } from 'vitest';
import { SagaOrchestrator } from '../sagas/saga-orchestrator';

describe('SagaOrchestrator', () => {
  it('executes saga with single step', async () => {
    const orchestrator = new SagaOrchestrator();
    const result = await orchestrator.execute(
      {
        name: 'test-saga',
        steps: [{
          name: 'step-1',
          execute: async (ctx) => { ctx.data.done = true; },
          compensate: async () => {},
        }],
      },
      { tenantId: 't1' },
    );
    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(1);
    expect(result.context.data.done).toBe(true);
  });

  it('compensates on failure', async () => {
    const compensated = vi.fn().mockResolvedValue(undefined);
    const orchestrator = new SagaOrchestrator();
    const result = await orchestrator.execute(
      {
        name: 'failing-saga',
        steps: [
          {
            name: 'step-1',
            execute: async () => {},
            compensate: compensated,
          },
          {
            name: 'step-2',
            execute: async () => { throw new Error('step-2 failed'); },
            compensate: async () => {},
          },
        ],
      },
      { tenantId: 't1' },
    );
    expect(result.status).toBe('compensated');
    expect(compensated).toHaveBeenCalled();
  });
});
