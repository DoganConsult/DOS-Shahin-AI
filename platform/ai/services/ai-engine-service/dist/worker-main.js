// @ts-nocheck
import { bootstrapService } from '@dos/service-bootstrap';
import { logger } from '@dos/platform-core/observability';
import { agrcWorkerPool } from './domain/agrc-engine/workers';
async function bootstrapWorker() {
    try {
        const app = await bootstrapService('ai-engine-worker-service', {
            mountBase: '/health-worker',
            router: null,
        });
        // Boot the Temporal or background worker pools
        if (agrcWorkerPool && typeof agrcWorkerPool.start === 'function') {
            await agrcWorkerPool.start();
        }
        logger.info('AI Engine Worker process booted standalone successfully.');
    }
    catch (error) {
        logger.fatal({ error }, 'Failed to bootstrap AI Engine Workers');
        process.exit(1);
    }
}
bootstrapWorker();
//# sourceMappingURL=worker-main.js.map