// ============================================
// Shahin — Pipeline Evidence Service (P5.4)
// DevOps/pipeline evidence — connector for CI/CD artifact or webhook;
// store with source_type and reference
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { submitEvidence } from '../core/evidence.service';
import { authenticateWebhook, verifyHmacSignature } from '../../ports/platform.port';
import { toErrorMessage } from '@dos/module-sdk';
import { logger } from '../../ports/logger.port';
import crypto from 'crypto';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ============================================
// Types
// ============================================

export interface PipelineWebhookConfig {
  configId: string;
  tenantId: string;
  name: string;
  pipelineType: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'azure-devops' | 'circleci' | 'travis-ci' | 'custom';
  webhookSecret?: string;
  apiKeyId?: string;
  controlIdPattern?: string;
  evidenceTypeCode?: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PipelineWebhookPayload {
  eventType: string; // build.completed, deployment.succeeded, test.passed, etc.
  buildId?: string;
  commitHash?: string;
  branch?: string;
  tag?: string;
  jobUrl?: string;
  artifactUrls?: string[];
  artifactData?: Buffer | string; // Base64-encoded artifact content
  artifactFileName?: string;
  pipelineType: string;
  metadata?: Record<string, unknown>; // Additional pipeline-specific metadata
}

export interface PipelineEvidenceResult {
  evidenceIds: string[];
  configId: string;
  buildId?: string;
  commitHash?: string;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

// ============================================
// Webhook Configuration CRUD
// ============================================

export async function getPipelineWebhookConfigs(
  tenantId: string,
  enabledOnly: boolean = false
): Promise<PipelineWebhookConfig[]> {
  const schema = tenantSchema(tenantId);
  const whereClause = enabledOnly ? 'AND enabled = TRUE' : '';
  const result = await safeQuery(
    `SELECT config_id, tenant_id, name, pipeline_type, webhook_secret, api_key_id,
            control_id_pattern, evidence_type_code, enabled, metadata,
            created_at, updated_at, created_by
     FROM "${schema}".pipeline_webhook_configs
     WHERE tenant_id = $1 ${whereClause}
     ORDER BY created_at DESC`,
    [tenantId]
  );
  return result.rows.map((r: GenericRow) => ({
    configId: r.config_id,
    tenantId: r.tenant_id,
    name: r.name,
    pipelineType: r.pipeline_type,
    webhookSecret: r.webhook_secret || undefined,
    apiKeyId: r.api_key_id || undefined,
    controlIdPattern: r.control_id_pattern || undefined,
    evidenceTypeCode: r.evidence_type_code || undefined,
    enabled: r.enabled,
    metadata: r.metadata || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by || undefined,
  }));
}

export async function getPipelineWebhookConfig(
  tenantId: string,
  configId: string
): Promise<PipelineWebhookConfig | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT config_id, tenant_id, name, pipeline_type, webhook_secret, api_key_id,
            control_id_pattern, evidence_type_code, enabled, metadata,
            created_at, updated_at, created_by
     FROM "${schema}".pipeline_webhook_configs
     WHERE tenant_id = $1 AND config_id = $2`,
    [tenantId, configId]
  );
  if (result.rows.length === 0) return null;
  const r = getFirstRow(result)!;
  return {
    configId: r.config_id,
    tenantId: r.tenant_id,
    name: r.name,
    pipelineType: r.pipeline_type,
    webhookSecret: r.webhook_secret || undefined,
    apiKeyId: r.api_key_id || undefined,
    controlIdPattern: r.control_id_pattern || undefined,
    evidenceTypeCode: r.evidence_type_code || undefined,
    enabled: r.enabled,
    metadata: r.metadata || {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by || undefined,
  };
}

export async function savePipelineWebhookConfig(
  tenantId: string,
  config: Omit<PipelineWebhookConfig, 'configId' | 'createdAt' | 'updatedAt'> & { configId?: string }
): Promise<PipelineWebhookConfig> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as unknown as PipelineWebhookConfig;
}

export async function deletePipelineWebhookConfig(tenantId: string, configId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".pipeline_webhook_configs WHERE tenant_id = $1 AND config_id = $2`,
    [tenantId, configId]
  );
}

// ============================================
// Webhook Processing
// ============================================

/**
 * Process a pipeline webhook payload and create evidence records.
 * Validates webhook signature, finds matching configs, and creates evidence for relevant controls.
 */
export async function processPipelineWebhook(
  tenantId: string,
  payload: PipelineWebhookPayload,
  rawBody: string,
  signature?: string,
  apiKey?: string
): Promise<PipelineEvidenceResult> {
  const schema = tenantSchema(tenantId);
  const evidenceIds: string[] = [];
  const errors: string[] = [];

  // Find enabled webhook configs for this pipeline type
  const configs = await safeQuery(
    `SELECT config_id, name, webhook_secret, api_key_id, control_id_pattern, evidence_type_code, metadata
     FROM "${schema}".pipeline_webhook_configs
     WHERE tenant_id = $1 AND enabled = TRUE AND pipeline_type = $2`,
    [tenantId, payload.pipelineType]
  );

  if (configs.rows.length === 0) {
    return {
      evidenceIds: [],
      configId: '',
      buildId: payload.buildId,
      commitHash: payload.commitHash,
      status: 'failed',
      errors: [`No enabled webhook config found for pipeline type: ${payload.pipelineType}`],
    };
  }

  // Process each matching config
  for (const configRow of configs.rows) {
    const configId = configRow.config_id;

    try {
      // Verify webhook signature if secret is configured
      if (configRow.webhook_secret && signature) {
        if (!verifyHmacSignature(rawBody, signature, configRow.webhook_secret)) {
          errors.push(`Invalid signature for config ${configRow.name}`);
          continue;
        }
      } else if (configRow.api_key_id && apiKey) {
        // Verify API key if configured
        const keyInfo = await authenticateWebhook(apiKey, rawBody, signature);
        if (keyInfo.tenantId !== tenantId) {
          errors.push(`API key tenant mismatch for config ${configRow.name}`);
          continue;
        }
      }

      // Find controls matching the pattern
      const controlPattern = configRow.control_id_pattern || '%';
      const controlsResult = await safeQuery(
        `SELECT control_id FROM "${schema}".ucf_controls
         WHERE control_id LIKE $1
         ORDER BY control_id`,
        [controlPattern]
      );

      if (controlsResult.rows.length === 0) {
        errors.push(`No controls match pattern "${controlPattern}" for config ${configRow.name}`);
        continue;
      }

      // Create evidence for each matching control
      for (const controlRow of controlsResult.rows) {
        const controlId = controlRow.control_id;

        try {
          // Build evidence title and description
          const title = `[${payload.pipelineType}] ${payload.buildId || payload.commitHash || 'Build'} - ${payload.eventType}`;
          const description = [
            `Pipeline: ${payload.pipelineType}`,
            payload.buildId && `Build ID: ${payload.buildId}`,
            payload.commitHash && `Commit: ${payload.commitHash}`,
            payload.branch && `Branch: ${payload.branch}`,
            payload.jobUrl && `Job URL: ${payload.jobUrl}`,
            payload.artifactUrls && payload.artifactUrls.length > 0 && `Artifacts: ${payload.artifactUrls.length} file(s)`,
          ]
            .filter(Boolean)
            .join('\n');

          // Prepare metadata
          const metadata: Record<string, unknown> = {
            pipelineType: payload.pipelineType,
            eventType: payload.eventType,
            ...(payload.buildId && { buildId: payload.buildId }),
            ...(payload.commitHash && { commitHash: payload.commitHash }),
            ...(payload.branch && { branch: payload.branch }),
            ...(payload.tag && { tag: payload.tag }),
            ...(payload.jobUrl && { jobUrl: payload.jobUrl }),
            ...(payload.artifactUrls && { artifactUrls: payload.artifactUrls }),
            ...(payload.metadata || {}),
          };

          // Build source reference (job URL or artifact URL)
          const sourceReference = payload.jobUrl || (payload.artifactUrls && payload.artifactUrls[0]) || undefined;

          // Submit evidence with pipeline-specific fields
          const evidence = await submitEvidence(tenantId, {
            controlId,
            title,
            description,
            submittedBy: `pipeline:${payload.pipelineType}`,
            systemReference: sourceReference,
            sourceType: 'pipeline',
            sourceReference: sourceReference,
            metadataKv: metadata,
            // Store artifact data if provided
            ...(payload.artifactData && typeof payload.artifactData === 'string' && {
              content: payload.artifactData, // Base64-encoded content
            }),
          }) as unknown as Record<string, unknown>;

          evidenceIds.push(evidence['evidence_id'] as string);
        } catch (err: unknown) {
          const errorMsg = `Failed to create evidence for control ${controlId}: ${toErrorMessage(err)}`;
          errors.push(errorMsg);
          logger.warn('[PipelineEvidence]', { tenantId, configId, controlId, error: errorMsg });
        }
      }

      // Log webhook delivery
      await safeQuery(
        `INSERT INTO "${schema}".pipeline_webhook_logs
         (config_id, tenant_id, pipeline_type, event_type, build_id, commit_hash, branch,
          job_url, artifact_urls, status, evidence_ids, raw_payload, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
        [
          configId,
          tenantId,
          payload.pipelineType,
          payload.eventType,
          payload.buildId || null,
          payload.commitHash || null,
          payload.branch || null,
          payload.jobUrl || null,
          payload.artifactUrls || [],
          evidenceIds.length > 0 ? 'processed' : 'failed',
          evidenceIds,
          JSON.stringify(payload),
        ]
      );
    } catch (err: unknown) {
      const errorMsg = `Failed to process webhook for config ${configRow.name}: ${toErrorMessage(err)}`;
      errors.push(errorMsg);
      logger.error('[PipelineEvidence]', { tenantId, configId, error: errorMsg });
    }
  }

  return {
    evidenceIds,
    configId: getFirstRow(configs)?.config_id || '',
    buildId: payload.buildId,
    commitHash: payload.commitHash,
    status: evidenceIds.length > 0 ? (errors.length > 0 ? 'partial' : 'success') : 'failed',
    errors,
  };
}

// ============================================
// Pipeline-Specific Parsers
// ============================================

/**
 * Parse GitHub Actions webhook payload
 */
export function parseGitHubActionsWebhook(body: Record<string, unknown>): PipelineWebhookPayload | null {
  // GitHub Actions webhook structure
  if (body.workflow_run) {
    return {

      eventType: `workflow.${body.workflow_run.status}`,

      buildId: body.workflow_run.id?.toString(),

      commitHash: body.workflow_run.head_sha,

      branch: body.workflow_run.head_branch,

      jobUrl: body.workflow_run.html_url,

      artifactUrls: body.workflow_run.artifacts_url ? [body.workflow_run.artifacts_url] : undefined,
      pipelineType: 'github-actions',
      metadata: {

        workflowName: body.workflow_run.name,

        workflowPath: body.workflow_run.path,

        conclusion: body.workflow_run.conclusion,

        runNumber: body.workflow_run.run_number,
      },
    };
  }
  return null;
}

/**
 * Parse GitLab CI webhook payload
 */
export function parseGitLabCIWebhook(body: Record<string, unknown>): PipelineWebhookPayload | null {
  if (body.object_kind === 'pipeline' && body.object_attributes) {
    return {

      eventType: `pipeline.${body.object_attributes.status}`,

      buildId: body.object_attributes.id?.toString(),

      commitHash: body.commit?.sha || body.object_attributes.sha,

      branch: body.object_attributes.ref,

      jobUrl: body.project?.web_url ? `${body.project.web_url}/-/pipelines/${body.object_attributes.id}` : undefined,
      pipelineType: 'gitlab-ci',
      metadata: {

        projectName: body.project?.name,

        pipelineId: body.object_attributes.id,

        stages: body.object_attributes.stages,
      },
    };
  }
  return null;
}

/**
 * Parse Jenkins webhook payload
 */
export function parseJenkinsWebhook(body: Record<string, unknown>): PipelineWebhookPayload | null {
  if (body.build) {
    return {

      eventType: `build.${body.build.status}`,

      buildId: body.build.number?.toString(),

      commitHash: body.build.scm?.commit,

      branch: body.build.scm?.branch,

      jobUrl: body.build.full_url,
      pipelineType: 'jenkins',
      metadata: {
        jobName: body.name,

        buildNumber: body.build.number,

        duration: body.build.duration,
      },
    };
  }
  return null;
}

/**
 * Parse Azure DevOps webhook payload
 */
export function parseAzureDevOpsWebhook(body: Record<string, unknown>): PipelineWebhookPayload | null {

  if (body.resource?.type === 'Microsoft.DevOps.Pipelines.PipelineRun') {
    const resource = body.resource;
    return {

      eventType: `pipeline.${resource.state}`,

      buildId: resource.id?.toString(),

      commitHash: resource.sourceVersion,

      branch: resource.sourceBranch,

      jobUrl: resource.url,
      pipelineType: 'azure-devops',
      metadata: {

        pipelineName: resource.pipeline?.name,

        runId: resource.id,

        result: resource.result,
      },
    };
  }
  return null;
}

/**
 * Auto-detect and parse webhook payload based on headers/content
 */
export function parsePipelineWebhook(body: Record<string, unknown>, headers: Record<string, string>): {
  payload: PipelineWebhookPayload | null;
  pipelineType: string;
} {
  // Try to detect from headers first
  if (headers['x-github-event'] || headers['x-github-hook-installation-target-type']) {
    const parsed = parseGitHubActionsWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'github-actions' };
  }
  if (headers['x-gitlab-event'] || headers['x-gitlab-token']) {
    const parsed = parseGitLabCIWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'gitlab-ci' };
  }
  if (headers['jenkins-crumb'] || body.jenkins) {
    const parsed = parseJenkinsWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'jenkins' };
  }

  if (headers['x-vss-eventid'] || body.eventType?.includes('ms.vss-pipelines')) {
    const parsed = parseAzureDevOpsWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'azure-devops' };
  }

  // Fallback: try parsing by structure
  if (body.workflow_run) {
    const parsed = parseGitHubActionsWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'github-actions' };
  }
  if (body.object_kind === 'pipeline') {
    const parsed = parseGitLabCIWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'gitlab-ci' };
  }
  if (body.build) {
    const parsed = parseJenkinsWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'jenkins' };
  }

  if (body.resource?.type?.includes('Pipeline')) {
    const parsed = parseAzureDevOpsWebhook(body);
    if (parsed) return { payload: parsed, pipelineType: 'azure-devops' };
  }

  return { payload: null, pipelineType: 'any' };
}

// ============================================
// Webhook Logs
// ============================================

export async function getPipelineWebhookLogs(
  tenantId: string,
  configId?: string,
  limit: number = 50
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const whereClause = configId ? 'AND config_id = $2' : '';
  const params = configId ? [tenantId, configId, limit] : [tenantId, limit];
  const result = await safeQuery(
    `SELECT log_id, config_id, pipeline_type, event_type, build_id, commit_hash, branch,
            job_url, artifact_urls, status, evidence_ids, error_message, created_at, processed_at
     FROM "${schema}".pipeline_webhook_logs
     WHERE tenant_id = $1 ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}
