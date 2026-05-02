"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaOrchestrator = void 0;
const node_crypto_1 = require("node:crypto");
class SagaOrchestrator {
    activeSagas = new Map();
    options;
    constructor(options) {
        this.options = options || {};
    }
    async execute(definition, initialData) {
        const sagaId = (0, node_crypto_1.randomUUID)();
        const startedAt = new Date().toISOString();
        const startMs = Date.now();
        const context = {
            sagaId,
            tenantId: initialData.tenantId,
            correlationId: initialData.correlationId || (0, node_crypto_1.randomUUID)(),
            data: initialData.data || {},
            startedAt,
        };
        const result = {
            sagaId,
            sagaName: definition.name,
            status: 'running',
            steps: [],
            context,
            startedAt,
            durationMs: 0,
        };
        this.activeSagas.set(sagaId, result);
        const completedSteps = [];
        try {
            for (const step of definition.steps) {
                const stepResult = await this.executeStep(sagaId, step, context, definition.timeoutMs);
                result.steps.push(stepResult);
                if (stepResult.status === 'completed') {
                    completedSteps.push(step);
                }
                else {
                    throw new Error(`Step '${step.name}' failed: ${stepResult.error}`);
                }
            }
            result.status = 'completed';
            result.completedAt = new Date().toISOString();
            if (definition.onComplete) {
                await definition.onComplete(context);
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            result.error = error.message;
            result.status = 'compensating';
            await this.compensate(sagaId, completedSteps, context, result);
            if (definition.onFailed) {
                try {
                    await definition.onFailed(context, error);
                }
                catch { /* ignore onFailed errors */ }
            }
        }
        result.durationMs = Date.now() - startMs;
        this.activeSagas.delete(sagaId);
        return result;
    }
    async executeStep(sagaId, step, context, sagaTimeoutMs) {
        const maxAttempts = step.retryPolicy?.maxAttempts || 1;
        const backoffMs = step.retryPolicy?.backoffMs || 1000;
        const backoffMultiplier = step.retryPolicy?.backoffMultiplier || 2;
        const timeoutMs = step.timeoutMs || sagaTimeoutMs || 30_000;
        let attemptCount = 0;
        let lastError = null;
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
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                if (attempt < maxAttempts - 1) {
                    const delay = backoffMs * Math.pow(backoffMultiplier, attempt);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        this.options.onStepFailed?.(sagaId, step.name, lastError);
        return {
            stepName: step.name,
            status: 'failed',
            startedAt: stepStartedAt,
            completedAt: new Date().toISOString(),
            error: lastError?.message,
            attemptCount,
        };
    }
    async compensate(sagaId, completedSteps, context, result) {
        let allCompensated = true;
        for (let i = completedSteps.length - 1; i >= 0; i--) {
            const step = completedSteps[i];
            this.options.onCompensationStart?.(sagaId, step.name);
            try {
                const timeoutMs = step.timeoutMs || 30_000;
                await this.withTimeout(step.compensate(context), timeoutMs, `Compensate '${step.name}'`);
                this.options.onCompensationComplete?.(sagaId, step.name);
                const stepResult = result.steps.find(s => s.stepName === step.name);
                if (stepResult)
                    stepResult.status = 'compensated';
            }
            catch (err) {
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
    withTimeout(promise, ms, label) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms);
            promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
        });
    }
    getActiveSaga(sagaId) {
        return this.activeSagas.get(sagaId);
    }
    getActiveSagas() {
        return [...this.activeSagas.values()];
    }
}
exports.SagaOrchestrator = SagaOrchestrator;
//# sourceMappingURL=saga-orchestrator.js.map