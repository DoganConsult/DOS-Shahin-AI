import { randomUUID } from 'node:crypto';

export type SagaStatus = 'pending' | 'running' | 'completed' | 'compensating' | 'failed' | 'compensated';
export type StepStatus = 'pending' | 'running' | 'completed' | 'compensating' | 'compensated' | 'failed';

export interface SagaContext {
  sagaId: string;
  tenantId: string;
  correlationId: string;
  data: Record<string, unknown>;
  startedAt: string;
}

export interface SagaStepDefinition<TCtx extends SagaContext = SagaContext> {
  name: string;
  execute: (ctx: TCtx) => Promise<void>;
  compensate: (ctx: TCtx) => Promise<void>;
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  timeoutMs?: number;
}

export interface SagaStepResult {
  stepName: string;
  status: StepStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
  attemptCount: number;
}

export interface SagaResult {
  sagaId: string;
  sagaName: string;
  status: SagaStatus;
  steps: SagaStepResult[];
  context: SagaContext;
  startedAt: string;
  completedAt?: string;
  error?: string;
  durationMs: number;
}

export interface SagaDefinition<TCtx extends SagaContext = SagaContext> {
  name: string;
  steps: SagaStepDefinition<TCtx>[];
  onComplete?: (ctx: TCtx) => Promise<void>;
  onFailed?: (ctx: TCtx, error: Error) => Promise<void>;
  onCompensated?: (ctx: TCtx) => Promise<void>;
  timeoutMs?: number;
}

export interface SagaOrchestratorOptions {
  onStepStart?: (sagaId: string, stepName: string) => void;
  onStepComplete?: (sagaId: string, stepName: string) => void;
  onStepFailed?: (sagaId: string, stepName: string, error: Error) => void;
  onCompensationStart?: (sagaId: string, stepName: string) => void;
  onCompensationComplete?: (sagaId: string, stepName: string) => void;
  onCompensationFailed?: (sagaId: string, stepName: string, error: Error) => void;
}

export class SagaOrchestrator {
  private activeSagas = new Map<string, SagaResult>();
  private options: SagaOrchestratorOptions;

  constructor(options?: SagaOrchestratorOptions) {
    this.options = options || {};
  }

  async execute<TCtx extends SagaContext>(
    definition: SagaDefinition<TCtx>,
    initialData: { tenantId: string; correlationId?: string; data?: Record<string, unknown> },
  ): Promise<SagaResult> {
    const sagaId = randomUUID();
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    const context: TCtx = {
      sagaId,
      tenantId: initialData.tenantId,
      correlationId: initialData.correlationId || randomUUID(),
      data: initialData.data || {},
      startedAt,
    } as TCtx;

    const result: SagaResult = {
      sagaId,
      sagaName: definition.name,
      status: 'running',
      steps: [],
      context,
      startedAt,
      durationMs: 0,
    };

    this.activeSagas.set(sagaId, result);

    const completedSteps: SagaStepDefinition<TCtx>[] = [];

    try {
      for (const step of definition.steps) {
        const stepResult = await this.executeStep(sagaId, step, context, definition.timeoutMs);
        result.steps.push(stepResult);

        if (stepResult.status === 'completed') {
          completedSteps.push(step);
        } else {
          throw new Error(`Step '${step.name}' failed: ${stepResult.error}`);
        }
      }

      result.status = 'completed';
      result.completedAt = new Date().toISOString();

      if (definition.onComplete) {
        await definition.onComplete(context);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      result.error = error.message;
      result.status = 'compensating';

      await this.compensate(sagaId, completedSteps, context, result);

      if (definition.onFailed) {
        try {
          await definition.onFailed(context, error);
        } catch { /* ignore onFailed errors */ }
      }
    }

    result.durationMs = Date.now() - startMs;
    this.activeSagas.delete(sagaId);
    return result;
  }

  private async executeStep<TCtx extends SagaContext>(
    sagaId: string,
    step: SagaStepDefinition<TCtx>,
    context: TCtx,
    sagaTimeoutMs?: number,
  ): Promise<SagaStepResult> {
    const maxAttempts = step.retryPolicy?.maxAttempts || 1;
    const backoffMs = step.retryPolicy?.backoffMs || 1000;
    const backoffMultiplier = step.retryPolicy?.backoffMultiplier || 2;
    const timeoutMs = step.timeoutMs || sagaTimeoutMs || 30_000;
    let attemptCount = 0;
    let lastError: Error | null = null;
    const stepStartedAt = new Date().toISOString();

    this.options.onStepStart?.(sagaId, step.name);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      attemptCount++;
      try {
        await this.withTimeout(step.execute(context), timeoutMs, `Step '${step.name}'`);
        this.options.onStepComplete?.(sagaId, step.name);
        return {
          stepName: step.name,
          status: 'completed',
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          attemptCount,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts - 1) {
          const delay = backoffMs * Math.pow(backoffMultiplier, attempt);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    this.options.onStepFailed?.(sagaId, step.name, lastError!);
    return {
      stepName: step.name,
      status: 'failed',
      startedAt: stepStartedAt,
      completedAt: new Date().toISOString(),
      error: lastError?.message,
      attemptCount,
    };
  }

  private async compensate<TCtx extends SagaContext>(
    sagaId: string,
    completedSteps: SagaStepDefinition<TCtx>[],
    context: TCtx,
    result: SagaResult,
  ): Promise<void> {
    let allCompensated = true;

    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i];
      this.options.onCompensationStart?.(sagaId, step.name);

      try {
        const timeoutMs = step.timeoutMs || 30_000;
        await this.withTimeout(step.compensate(context), timeoutMs, `Compensate '${step.name}'`);
        this.options.onCompensationComplete?.(sagaId, step.name);

        const stepResult = result.steps.find(s => s.stepName === step.name);
        if (stepResult) stepResult.status = 'compensated';
      } catch (err) {
        allCompensated = false;
        const error = err instanceof Error ? err : new Error(String(err));
        this.options.onCompensationFailed?.(sagaId, step.name, error);

        const stepResult = result.steps.find(s => s.stepName === step.name);
        if (stepResult) {
          stepResult.status = 'failed';
          stepResult.error = `Compensation failed: ${error.message}`;
        }
      }
    }

    result.status = allCompensated ? 'compensated' : 'failed';
    result.completedAt = new Date().toISOString();
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); },
      );
    });
  }

  getActiveSaga(sagaId: string): SagaResult | undefined {
    return this.activeSagas.get(sagaId);
  }

  getActiveSagas(): SagaResult[] {
    return [...this.activeSagas.values()];
  }
}
