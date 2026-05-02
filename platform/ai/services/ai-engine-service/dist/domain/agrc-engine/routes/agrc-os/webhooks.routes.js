// @ts-nocheck
import { Router } from 'express';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { errMsg } from '../../../../i18n/error-messages.js';
import { emitEvent } from '../../ports/events.port.js';
import { webhookLimiter } from './shared.js';
import { toErrorMessage } from '@dos/module-sdk';
import { validate, validateWebhookPayload, auditMiddleware } from '../../ports/middleware.port.js';
import { createTelemetryBody, createExternalBody, createKeysBody } from '../../schemas/agrc-engine.schemas.js';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
const router = Router();
router.use(auditMiddleware('agrc-engine'));
router.post('/webhook/telemetry', authenticate, requirePermission('telemetry.data.write'), validateWebhookPayload, validate({ body: createTelemetryBody }), async (req, res) => {
    const { processWebhook } = await import('@dos/platform-core/notifications/webhooks/telemetry-webhook.service');
    const result = await processWebhook(req.tenantId, req.body);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.post('/webhook/external', webhookLimiter, validate({ body: createExternalBody }), async (req, res) => {
    try {
        const { authenticateWebhook, processWebhook } = await import('@dos/platform-core/notifications/webhooks/telemetry-webhook.service');
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
            res.status(401).json({ error: errMsg('UNAUTHORIZED', req) });
            return;
        }
        const rawBody = JSON.stringify(req.body);
        const signature = req.headers['x-webhook-signature'];
        const { tenantId } = await authenticateWebhook(apiKey, rawBody, signature);
        const result = await processWebhook(tenantId, req.body);
        emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
        res.json(result);
    }
    catch (err) {
        const status = toErrorMessage(err).includes('Invalid') || toErrorMessage(err).includes('revoked') ? 401 : 500;
        res.status(status).json({ error: status === 401 ? errMsg('INVALID_TOKEN', req) : errMsg('INTERNAL_ERROR', req) });
    }
});
router.post('/webhook/keys', authenticate, requirePermission('tenant.config.manage'), validate({ body: createKeysBody }), async (req, res) => {
    const { createWebhookApiKey } = await import('@dos/platform-core/notifications/webhooks/telemetry-webhook.service');
    const { keyName, sourceName, enableHmac } = req.body;
    if (!keyName || !sourceName) {
        res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
        return;
    }
    const result = await createWebhookApiKey(req.tenantId, keyName, sourceName, enableHmac === true);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json(result);
});
router.get('/webhook/keys', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('tenant.config.manage'), async (req, res) => {
    const { listWebhookApiKeys } = await import('@dos/platform-core/notifications/webhooks/telemetry-webhook.service');
    const result = await listWebhookApiKeys(req.tenantId);
    res.json(result);
});
router.delete('/webhook/keys/:keyId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('tenant.config.manage'), async (req, res) => {
    const { revokeWebhookApiKey } = await import('@dos/platform-core/notifications/webhooks/telemetry-webhook.service');
    await revokeWebhookApiKey(req.tenantId, req.params.keyId);
    emitEvent({ tenantId: req.tenantId, userId: req.user.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' }).catch(catchHandler(EC.AGENT_ACTION, {}));
    res.json({ success: true });
});
export default router;
//# sourceMappingURL=webhooks.routes.js.map