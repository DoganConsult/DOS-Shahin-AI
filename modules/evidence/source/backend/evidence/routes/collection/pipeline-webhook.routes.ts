import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
// ============================================
// Platform — Pipeline Webhook Routes (P5.4)
// DevOps/pipeline evidence — webhook endpoints for CI/CD systems
// ============================================
import {
  processPipelineWebhook,
  parsePipelineWebhook,
  getPipelineWebhookLogs,
  getPipelineWebhookConfigs,
  getPipelineWebhookConfig,
  savePipelineWebhookConfig,
  deletePipelineWebhookConfig,
} from '../../services/collection/pipeline-evidence.service';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, validate, getTenantFromRequest, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { webhooksPipelinePipelineTypePostBody, webhooksPipelineGithubPostBody, webhooksPipelineGitlabPostBody, pipelineWebhooksConfigsPostBody, configIdParam } from "../../schemas/evidence.schemas";

// ── Zod Schemas ──────────────────────────────────────────────────────────
const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware('evidence'));
router.use(mutationEventHook('evidence'));

// ============================================
// Public Webhook Endpoints (no auth token required, uses signature/API key)
// ============================================

/**
 * POST /api/webhooks/pipeline/:pipelineType
 * Generic webhook endpoint for CI/CD pipelines
 * Supports: github-actions, gitlab-ci, jenkins, azure-devops, circleci, etc.
 */
router.post('/webhooks/pipeline/:pipelineType', validate({ body: webhooksPipelinePipelineTypePostBody }), async (req: Request, res: Response) => {
  try {
    const { pipelineType } = req.params;
    const tenantId = getTenantFromRequest(req);

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    // Get signature and API key from headers
    const signature = req.headers['x-signature'] as string || req.headers['x-hub-signature-256'] as string || req.headers['x-gitlab-token'] as string;
    const apiKey = req.headers['x-api-key'] as string || req.headers['authorization']?.replace('Bearer ', '');

    // Parse webhook payload
    const { payload, pipelineType: detectedType } = parsePipelineWebhook(req.body, req.headers as Record<string, string>);
    
    if (!payload) {
      logger.warn('[PipelineWebhook]', { tenantId, pipelineType, error: 'Failed to parse webhook payload' });
      return res.status(400).json({ error: 'Invalid webhook payload format' });
    }

    // Override pipeline type if provided in URL
    payload.pipelineType = pipelineType || detectedType;

    // Process webhook
    const result = await processPipelineWebhook(tenantId, payload, JSON.stringify(req.body), signature, apiKey);

    if (result.status === 'failed' && result.evidenceIds.length === 0) {
      logger.warn('[PipelineWebhook]', { tenantId, pipelineType, result });
      return res.status(400).json({ error: 'Webhook processing failed', details: result.errors });
    }

    logger.info('[PipelineWebhook]', { tenantId, pipelineType, evidenceCount: result.evidenceIds.length, status: result.status });

    return res.status(200).json({
      success: true,
      evidenceIds: result.evidenceIds,
      status: result.status,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/pipeline/github
 * GitHub Actions webhook endpoint
 */
router.post('/webhooks/pipeline/github', validate({ body: webhooksPipelineGithubPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const signature = req.headers['x-hub-signature-256'] as string || req.headers['x-hub-signature'] as string;
    const { payload } = parsePipelineWebhook(req.body, req.headers as Record<string, string>);
    
    if (!payload) {
      return res.status(400).json({ error: 'Invalid GitHub webhook payload' });
    }

    payload.pipelineType = 'github-actions';

    const result = await processPipelineWebhook(tenantId, payload, JSON.stringify(req.body), signature);

    return res.status(200).json({
      success: true,
      evidenceIds: result.evidenceIds,
      status: result.status,
    });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/pipeline/gitlab
 * GitLab CI webhook endpoint
 */
router.post('/webhooks/pipeline/gitlab', validate({ body: webhooksPipelineGitlabPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const token = req.headers['x-gitlab-token'] as string;
    const { payload } = parsePipelineWebhook(req.body, req.headers as Record<string, string>);
    
    if (!payload) {
      return res.status(400).json({ error: 'Invalid GitLab webhook payload' });
    }

    payload.pipelineType = 'gitlab-ci';

    const result = await processPipelineWebhook(tenantId, payload, JSON.stringify(req.body), token);

    return res.status(200).json({
      success: true,
      evidenceIds: result.evidenceIds,
      status: result.status,
    });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Admin Endpoints (require authentication)
// ============================================

/**
 * GET /api/pipeline-webhooks/configs
 * List all pipeline webhook configurations for the tenant
 */
router.get('/pipeline-webhooks/configs', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const enabledOnly = req.query.enabled === 'true';
    const configs = await getPipelineWebhookConfigs(tenantId, enabledOnly);

    return res.status(200).json({ configs });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/pipeline-webhooks/configs/:configId
 * Get a specific pipeline webhook configuration
 */
router.get('/pipeline-webhooks/configs/:configId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    const { configId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const config = await getPipelineWebhookConfig(tenantId, configId);
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Don't expose webhook secret in response
    const { webhookSecret: _webhookSecret, ...safeConfig } = config;

    return res.status(200).json({ config: safeConfig });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/pipeline-webhooks/configs
 * Create or update a pipeline webhook configuration
 */
router.post('/pipeline-webhooks/configs', authenticate, requirePermission('evidence.item.configure'), validate({ body: pipelineWebhooksConfigsPostBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const {
      configId,
      name,
      pipelineType,
      webhookSecret,
      apiKeyId,
      controlIdPattern,
      evidenceTypeCode,
      enabled,
      metadata,
    } = req.body;

    if (!name || !pipelineType) {
      return res.status(400).json({ error: 'Name and pipelineType are required' });
    }

    const user = req.user!;
    const config = await savePipelineWebhookConfig(tenantId, {
      configId,
      tenantId,
      name,
      pipelineType,
      webhookSecret,
      apiKeyId,
      controlIdPattern,
      evidenceTypeCode,
      enabled: enabled !== false,
      metadata: metadata || {},
      createdBy: user?.userId || user?.id,
    });

    // Don't expose webhook secret in response
    const { webhookSecret: _, ...safeConfig } = config;

    return res.status(200).json({ config: safeConfig });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/pipeline-webhooks/configs/:configId
 * Delete a pipeline webhook configuration
 */
router.delete('/pipeline-webhooks/configs/:configId', authenticate, requirePermission('evidence.item.configure'), validate({ params: configIdParam }), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    const { configId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    await deletePipelineWebhookConfig(tenantId, configId);

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/pipeline-webhooks/logs
 * Get webhook delivery logs
 */
router.get('/pipeline-webhooks/logs', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantFromRequest(req);
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const configId = req.query.configId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await getPipelineWebhookLogs(tenantId, configId, limit);

    return res.status(200).json({ logs });
  } catch (err: unknown) {
    logger.error('[PipelineWebhook]', { error: toErrorMessage(err) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

