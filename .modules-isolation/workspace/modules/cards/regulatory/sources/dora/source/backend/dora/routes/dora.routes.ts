import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
/**
 * DORA Routes — Full API surface for the DORA module.
 *
 * MP-25 §6: Required route groups:
 *   - Overview and dashboard
 *   - ICT assets CRUD
 *   - Resilience tests CRUD
 *   - Major incidents CRUD
 *   - Threat intelligence
 *   - Backup configurations
 *   - Third-party providers
 *   - Obligations CRUD with lifecycle auth
 *   - Framework and control mappings
 *   - Dashboard (readiness, gaps, trends)
 *   - Lifecycle transitions with evaluateLifecycleTransition
 *   - AI analysis endpoints
 *
 * All routes use: moduleStack, auditMiddleware, authenticate, requirePermission,
 * asyncHandler, and Zod validation.
 *
 * @owner dora
 * @module dora
 */


import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import {
  DoraIctAssetRepository,
  DoraResilienceTestRepository,
  DoraMajorIncidentRepository,
  DoraThreatIntelRepository,
  DoraBackupConfigRepository,
  DoraThirdPartyProviderRepository,
} from '../repositories/dora.repository';
import {
  createIctAssetBody, updateIctAssetBody, listIctAssetsQuery,
  createResilienceTestBody, updateResilienceTestBody,
  createMajorIncidentBody, updateMajorIncidentBody,

  createThreatIntelBody,
  createBackupConfigBody, updateBackupConfigBody,
  createThirdPartyProviderBody, updateThirdPartyProviderBody, listThirdPartyProvidersQuery,
} from '../schemas/dora.schemas';

import { paginationQuery, createIctAssetsBody, updateIctAssetsBody, createResilienceTestsBody, updateResilienceTestsBody, createMajorIncidentsBody, updateMajorIncidentsBody, createThreatIntelBody, updateAcknowledgeBody, createBackupConfigsBody, updateBackupConfigsBody, createThirdPartyProvidersBody, updateThirdPartyProvidersBody, createObligationsBody, updateObligationsBody, createMappingsBody, createFrameworksBody, createControlsBody, createTransitionBody, createRegulatorySummaryBody, createGapNarrationBody, createEvidenceSufficiencyBody } from '../../../schemas/common.schemas';
import { emitDoraEvent, emitDoraStatusChange } from '../services/dora-event.service';
import { safeQuery, tenantSchema } from '../ports/database.port';

// New service imports for MP-25 uplift
import * as obligationService from '../services/dora-obligation.service';
import * as mappingService from '../services/dora-mapping.service';
import * as dashboardService from '../services/dora-dashboard.service';
import * as aiService from '../services/dora-ai.service';

const router = Router();
router.use(moduleStack('dora'));
router.use(auditMiddleware('dora'));

// ════════════════════════════════════════════════════════════════════════
// OVERVIEW
// ════════════════════════════════════════════════════════════════════════

router.get('/overview', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const [assets, tests, incidents, threats, backups, providers] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".dora_ict_assets WHERE status = 'active' AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".dora_resilience_tests WHERE status IN ('planned','in_progress') AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".dora_major_incidents WHERE status NOT IN ('resolved','closed') AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".dora_threat_intel WHERE acknowledged = false AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".dora_backup_configs WHERE status = 'active' AND deleted_at IS NULL`),
    safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".dora_ict_third_party_register WHERE deleted_at IS NULL`),
  ]);
  res.json({
    success: true,
    data: {
      activeAssets: assets.rows[0]?.cnt ?? 0,
      pendingTests: tests.rows[0]?.cnt ?? 0,
      openIncidents: incidents.rows[0]?.cnt ?? 0,
      unacknowledgedThreats: threats.rows[0]?.cnt ?? 0,
      activeBackups: backups.rows[0]?.cnt ?? 0,
      thirdPartyProviders: providers.rows[0]?.cnt ?? 0,
    },
  });
}));

// ════════════════════════════════════════════════════════════════════════
// ICT ASSETS
// ════════════════════════════════════════════════════════════════════════

router.get('/ict-assets', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = listIctAssetsQuery.parse(req.query);
  const repo = new DoraIctAssetRepository(req.tenantId!);
  const { rows, total } = await repo.findAll(filters);
  res.json({ success: true, data: rows, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.get('/ict-assets/:id', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraIctAssetRepository(req.tenantId!);
  const asset = await repo.findById(req.params.id);
  if (!asset) return res.status(404).json({ success: false, error: 'ICT asset not found' });
  res.json({ success: true, data: asset });
}));

router.post('/ict-assets', authenticate, requirePermission('dora.record.write'), validate({ body: createIctAssetsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = createIctAssetBody.parse(req.body);
  const repo = new DoraIctAssetRepository(req.tenantId!);
  const asset = await repo.create(body);
  if (!asset) return res.status(500).json({ success: false, error: 'Failed to create ICT asset' });
  await emitDoraEvent(req.tenantId!, 'dora.ict_asset_created', 'ict_asset', asset.asset_id, { name: asset.name, criticality: asset.criticality });
  res.status(201).json({ success: true, data: asset });
}));

router.put('/ict-assets/:id', authenticate, requirePermission('dora.record.write'), validate({ body: updateIctAssetsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = updateIctAssetBody.parse(req.body);
  const repo = new DoraIctAssetRepository(req.tenantId!);
  const existing = await repo.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'ICT asset not found' });
  const asset = await repo.update(req.params.id, body);
  if (body.status && body.status !== existing.status) {
    await emitDoraStatusChange(req.tenantId!, 'ict_asset', req.params.id, existing.status, body.status);
  }
  res.json({ success: true, data: asset });
}));

router.delete('/ict-assets/:id', authenticate, requirePermission('dora.record.delete'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraIctAssetRepository(req.tenantId!);
  const deleted = await repo.softDelete(req.params.id, req.user?.userId);
  if (!deleted) return res.status(404).json({ success: false, error: 'ICT asset not found' });
  await emitDoraEvent(req.tenantId!, 'dora.ict_asset_deleted', 'ict_asset', req.params.id, {});
  res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════════════
// RESILIENCE TESTS
// ════════════════════════════════════════════════════════════════════════

router.get('/resilience-tests', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = paginationQuery.parse(req.query);
  const repo = new DoraResilienceTestRepository(req.tenantId!);
  const { rows, total } = await repo.findAll({ ...filters, status: req.query.status as string, test_type: req.query.test_type as string });
  res.json({ success: true, data: rows, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.get('/resilience-tests/:id', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraResilienceTestRepository(req.tenantId!);
  const test = await repo.findById(req.params.id);
  if (!test) return res.status(404).json({ success: false, error: 'Resilience test not found' });
  res.json({ success: true, data: test });
}));

router.post('/resilience-tests', authenticate, requirePermission('dora.record.write'), validate({ body: createResilienceTestsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = createResilienceTestBody.parse(req.body);
  const repo = new DoraResilienceTestRepository(req.tenantId!);
  const test = await repo.create(body);
  if (!test) return res.status(500).json({ success: false, error: 'Failed to create resilience test' });
  await emitDoraEvent(req.tenantId!, 'dora.resilience_test_created', 'resilience_test', test.test_id, { title: test.title, testType: test.test_type });
  res.status(201).json({ success: true, data: test });
}));

router.put('/resilience-tests/:id', authenticate, requirePermission('dora.record.write'), validate({ body: updateResilienceTestsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = updateResilienceTestBody.parse(req.body);
  const repo = new DoraResilienceTestRepository(req.tenantId!);
  const existing = await repo.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Resilience test not found' });
  const test = await repo.updateStatus(req.params.id, body.status || existing.status, body);
  if (body.status && body.status !== existing.status) {
    await emitDoraStatusChange(req.tenantId!, 'resilience_test', req.params.id, existing.status, body.status);
  }
  res.json({ success: true, data: test });
}));

// ════════════════════════════════════════════════════════════════════════
// MAJOR INCIDENTS
// ════════════════════════════════════════════════════════════════════════

router.get('/major-incidents', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = paginationQuery.parse(req.query);
  const repo = new DoraMajorIncidentRepository(req.tenantId!);
  const { rows, total } = await repo.findAll({ ...filters, status: req.query.status as string, severity: req.query.severity as string });
  res.json({ success: true, data: rows, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.get('/major-incidents/:id', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraMajorIncidentRepository(req.tenantId!);
  const incident = await repo.findById(req.params.id);
  if (!incident) return res.status(404).json({ success: false, error: 'Major incident not found' });
  res.json({ success: true, data: incident });
}));

router.post('/major-incidents', authenticate, requirePermission('dora.record.write'), validate({ body: createMajorIncidentsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = createMajorIncidentBody.parse(req.body);
  const repo = new DoraMajorIncidentRepository(req.tenantId!);
  const incident = await repo.create({ ...body, reporter_id: req.user?.userId });
  if (!incident) return res.status(500).json({ success: false, error: 'Failed to create major incident' });
  await emitDoraEvent(req.tenantId!, 'dora.major_incident_created', 'major_incident', incident.incident_id, { title: incident.title, severity: incident.severity }, incident.severity === 'critical' ? 'critical' : 'warning');
  res.status(201).json({ success: true, data: incident });
}));

router.put('/major-incidents/:id', authenticate, requirePermission('dora.record.write'), validate({ body: updateMajorIncidentsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = updateMajorIncidentBody.parse(req.body);
  const repo = new DoraMajorIncidentRepository(req.tenantId!);
  const existing = await repo.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Major incident not found' });
  const incident = await repo.update(req.params.id, body);
  if (body.status && body.status !== existing.status) {
    await emitDoraStatusChange(req.tenantId!, 'major_incident', req.params.id, existing.status, body.status);
  }
  res.json({ success: true, data: incident });
}));

// ════════════════════════════════════════════════════════════════════════
// THREAT INTELLIGENCE
// ════════════════════════════════════════════════════════════════════════

router.get('/threat-intel', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = paginationQuery.parse(req.query);
  const repo = new DoraThreatIntelRepository(req.tenantId!);
  const acknowledged = req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined;
  const { rows, total } = await repo.findAll({ ...filters, acknowledged, severity: req.query.severity as string });
  res.json({ success: true, data: rows, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.post('/threat-intel', authenticate, requirePermission('dora.record.write'), validate({ body: createThreatIntelBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = createThreatIntelBody.parse(req.body);
  const repo = new DoraThreatIntelRepository(req.tenantId!);
  const intel = await repo.create(body);
  if (!intel) return res.status(500).json({ success: false, error: 'Failed to create threat intel' });
  await emitDoraEvent(req.tenantId!, 'dora.threat_intel_created', 'threat_intel', intel.intel_id, { source: intel.source, severity: intel.severity });
  res.status(201).json({ success: true, data: intel });
}));

router.put('/threat-intel/:id/acknowledge', authenticate, requirePermission('dora.record.write'), validate({ body: updateAcknowledgeBody }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraThreatIntelRepository(req.tenantId!);
  const intel = await repo.acknowledge(req.params.id, req.user!.userId!);
  if (!intel) return res.status(404).json({ success: false, error: 'Threat intel not found' });
  await emitDoraEvent(req.tenantId!, 'dora.threat_intel_acknowledged', 'threat_intel', req.params.id, { acknowledgedBy: req.user?.userId });
  res.json({ success: true, data: intel });
}));

// ════════════════════════════════════════════════════════════════════════
// BACKUP CONFIGURATIONS
// ════════════════════════════════════════════════════════════════════════

router.get('/backup-configs', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = paginationQuery.parse(req.query);
  const repo = new DoraBackupConfigRepository(req.tenantId!);
  const { rows, total } = await repo.findAll({ ...filters, status: req.query.status as string, asset_id: req.query.asset_id as string });
  res.json({ success: true, data: rows, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.post('/backup-configs', authenticate, requirePermission('dora.record.write'), validate({ body: createBackupConfigsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = createBackupConfigBody.parse(req.body);
  const repo = new DoraBackupConfigRepository(req.tenantId!);
  const config = await repo.create(body);
  if (!config) return res.status(500).json({ success: false, error: 'Failed to create backup config' });
  await emitDoraEvent(req.tenantId!, 'dora.backup_config_created', 'backup_config', config.config_id, { backupType: config.backup_type, frequency: config.frequency });
  res.status(201).json({ success: true, data: config });
}));

router.put('/backup-configs/:id', authenticate, requirePermission('dora.record.write'), validate({ body: updateBackupConfigsBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = updateBackupConfigBody.parse(req.body);
  const repo = new DoraBackupConfigRepository(req.tenantId!);
  const config = await repo.update(req.params.id, body);
  if (!config) return res.status(404).json({ success: false, error: 'Backup config not found' });
  res.json({ success: true, data: config });
}));

// ════════════════════════════════════════════════════════════════════════
// THIRD-PARTY PROVIDERS
// ════════════════════════════════════════════════════════════════════════

router.get('/third-party-providers', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = listThirdPartyProvidersQuery.parse(req.query);
  const repo = new DoraThirdPartyProviderRepository(req.tenantId!);
  const { rows, total } = await repo.findAll(filters);
  res.json({ success: true, data: rows, total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.get('/third-party-providers/:id', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraThirdPartyProviderRepository(req.tenantId!);
  const provider = await repo.findById(req.params.id);
  if (!provider) return res.status(404).json({ success: false, error: 'Third-party provider not found' });
  res.json({ success: true, data: provider });
}));

router.post('/third-party-providers', authenticate, requirePermission('dora.record.write'), validate({ body: createThirdPartyProvidersBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = createThirdPartyProviderBody.parse(req.body);
  const repo = new DoraThirdPartyProviderRepository(req.tenantId!);
  const provider = await repo.create(body);
  if (!provider) return res.status(500).json({ success: false, error: 'Failed to create third-party provider' });
  await emitDoraEvent(req.tenantId!, 'dora.third_party_provider_created', 'third_party_provider', provider.provider_id, { name: provider.provider_name, criticality: provider.criticality });
  res.status(201).json({ success: true, data: provider });
}));

router.put('/third-party-providers/:id', authenticate, requirePermission('dora.record.write'), validate({ body: updateThirdPartyProvidersBody }), asyncHandler(async (req: Request, res: Response) => {
  const body = updateThirdPartyProviderBody.parse(req.body);
  const repo = new DoraThirdPartyProviderRepository(req.tenantId!);
  const existing = await repo.findById(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'Third-party provider not found' });
  const provider = await repo.update(req.params.id, body);
  if (body.compliance_status && body.compliance_status !== existing.compliance_status) {
    await emitDoraStatusChange(req.tenantId!, 'third_party_provider', req.params.id, existing.compliance_status, body.compliance_status);
  }
  res.json({ success: true, data: provider });
}));

router.delete('/third-party-providers/:id', authenticate, requirePermission('dora.record.delete'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const repo = new DoraThirdPartyProviderRepository(req.tenantId!);
  const deleted = await repo.softDelete(req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Third-party provider not found' });
  await emitDoraEvent(req.tenantId!, 'dora.third_party_provider_deleted', 'third_party_provider', req.params.id, {});
  res.json({ success: true });
}));

// ════════════════════════════════════════════════════════════════════════
// OBLIGATIONS (MP-25 §6.1)
// ════════════════════════════════════════════════════════════════════════

router.get('/obligations', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters: import('../services/dora-obligation.service').ObligationFilters = {
    pillar: req.query.pillar as any,
    status: req.query.status as string,
    priority: req.query.priority as string,
    ownerId: req.query.owner_id as string,
    overdue: req.query.overdue === 'true',
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as string,
  } as unknown;
  const result = await obligationService.listObligations(req.tenantId!, filters);
  res.json({ success: true, data: result.rows, total: result.total, page: filters.page ?? 1, pageSize: filters.pageSize ?? 25 });
}));

router.get('/obligations/:id', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const obligation = await obligationService.getObligationById(req.tenantId!, req.params.id);
  if (!obligation) return res.status(404).json({ success: false, error: 'Obligation not found' });
  res.json({ success: true, data: obligation });
}));

router.post('/obligations', authenticate, requirePermission('dora.record.write'), validate({ body: createObligationsBody }), asyncHandler(async (req: Request, res: Response) => {
  const obligation = await obligationService.createObligation(req.tenantId!, req.body, req.user?.userId);
  if (!obligation) return res.status(500).json({ success: false, error: 'Failed to create obligation' });
  res.status(201).json({ success: true, data: obligation });
}));

router.put('/obligations/:id', authenticate, requirePermission('dora.record.write'), validate({ body: updateObligationsBody }), asyncHandler(async (req: Request, res: Response) => {
  const obligation = await obligationService.updateObligation(req.tenantId!, req.params.id, req.body, req.user?.userId);
  if (!obligation) return res.status(404).json({ success: false, error: 'Obligation not found' });
  res.json({ success: true, data: obligation });
}));

router.delete('/obligations/:id', authenticate, requirePermission('dora.record.delete'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await obligationService.deleteObligation(req.tenantId!, req.params.id, req.user?.userId);
  if (!deleted) return res.status(404).json({ success: false, error: 'Obligation not found' });
  res.json({ success: true });
}));

// Obligation mappings
router.get('/obligations/:id/mappings', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const mappings = await obligationService.listObligationMappings(req.tenantId!, req.params.id);
  res.json({ success: true, data: mappings });
}));

router.post('/obligations/:id/mappings', authenticate, requirePermission('dora.record.write'), validate({ body: createMappingsBody }), asyncHandler(async (req: Request, res: Response) => {
  const mapping = await obligationService.createObligationMapping(
    req.tenantId!,
    { ...req.body, obligationId: req.params.id },
    req.user?.userId,
  );
  if (!mapping) return res.status(500).json({ success: false, error: 'Failed to create mapping' });
  res.status(201).json({ success: true, data: mapping });
}));

// ════════════════════════════════════════════════════════════════════════
// FRAMEWORK & CONTROL MAPPINGS (MP-25 §6.1)
// ════════════════════════════════════════════════════════════════════════

router.get('/mappings/frameworks', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    doraPillar: req.query.pillar as string,
    doraArticle: req.query.article as string,
    coverageLevel: req.query.coverage_level as string,
    frameworkCode: req.query.framework_code as string,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
  };
  const result = await mappingService.listFrameworkMappings(req.tenantId!, filters);
  res.json({ success: true, data: result.rows, total: result.total });
}));

router.post('/mappings/frameworks', authenticate, requirePermission('dora.record.write'), validate({ body: createFrameworksBody }), asyncHandler(async (req: Request, res: Response) => {
  const mapping = await mappingService.createFrameworkMapping(req.tenantId!, req.body, req.user?.userId);
  if (!mapping) return res.status(500).json({ success: false, error: 'Failed to create framework mapping' });
  res.status(201).json({ success: true, data: mapping });
}));

router.delete('/mappings/frameworks/:id', authenticate, requirePermission('dora.record.delete'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await mappingService.deleteFrameworkMapping(req.tenantId!, req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Framework mapping not found' });
  res.json({ success: true });
}));

router.get('/mappings/controls', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters = {
    doraPillar: req.query.pillar as string,
    doraArticle: req.query.article as string,
    coverageLevel: req.query.coverage_level as string,
    search: req.query.search as string,
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
  };
  const result = await mappingService.listControlMappings(req.tenantId!, filters);
  res.json({ success: true, data: result.rows, total: result.total });
}));

router.post('/mappings/controls', authenticate, requirePermission('dora.record.write'), validate({ body: createControlsBody }), asyncHandler(async (req: Request, res: Response) => {
  const mapping = await mappingService.createControlMapping(req.tenantId!, req.body, req.user?.userId);
  if (!mapping) return res.status(500).json({ success: false, error: 'Failed to create control mapping' });
  res.status(201).json({ success: true, data: mapping });
}));

router.delete('/mappings/controls/:id', authenticate, requirePermission('dora.record.delete'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const deleted = await mappingService.deleteControlMapping(req.tenantId!, req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Control mapping not found' });
  res.json({ success: true });
}));

router.get('/mappings/gap-analysis', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const analysis = await mappingService.analyzeGaps(req.tenantId!);
  res.json({ success: true, data: analysis });
}));

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD (MP-25 §6.1)
// ════════════════════════════════════════════════════════════════════════

router.get('/dashboard/readiness', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const readiness = await dashboardService.getReadinessScores(req.tenantId!);
  res.json({ success: true, data: readiness });
}));

router.get('/dashboard/gaps', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const gaps = await dashboardService.getGapAnalysis(req.tenantId!);
  res.json({ success: true, data: gaps });
}));

router.get('/dashboard/trends', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
  const trends = await dashboardService.getTrendData(req.tenantId!, months);
  res.json({ success: true, data: trends });
}));

router.get('/dashboard/evidence-coverage', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const coverage = await dashboardService.getEvidenceCoverage(req.tenantId!);
  res.json({ success: true, data: coverage });
}));

router.get('/dashboard/summary', authenticate, requirePermission('dora.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const summary = await dashboardService.getDashboardSummary(req.tenantId!);
  res.json({ success: true, data: summary });
}));

// ════════════════════════════════════════════════════════════════════════
// LIFECYCLE TRANSITIONS (MP-25 §7)
// Status transitions through evaluateLifecycleTransition (DAuth)
// ════════════════════════════════════════════════════════════════════════

router.post('/:entityType/:entityId/transition', authenticate, requirePermission('dora.record.write'), validate({ body: createTransitionBody }), asyncHandler(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;
  const { toState, comment } = req.body;

  if (!toState) {
    return res.status(400).json({ success: false, error: 'toState is required' });
  }

  // Validate entity type is a DORA-owned entity
  const validEntityTypes = ['dora_ict_assets', 'dora_resilience_tests', 'dora_major_incidents', 'dora_obligations'];
  if (!validEntityTypes.includes(entityType)) {
    return res.status(400).json({ success: false, error: `Invalid entity type: ${entityType}` });
  }

  // Evaluate lifecycle transition through DAuth
  let authResult;
  try {
    const { evaluateLifecycleTransition } = await import('../../../platform/dauth/lifecycle-auth/lifecycle-auth.service.js');

    // Look up current entity state
    const schema = tenantSchema(req.tenantId!);
    const tableMap: Record<string, { table: string; idCol: string }> = {
      dora_ict_assets: { table: 'dora_ict_assets', idCol: 'asset_id' },
      dora_resilience_tests: { table: 'dora_resilience_tests', idCol: 'test_id' },
      dora_major_incidents: { table: 'dora_major_incidents', idCol: 'incident_id' },
      dora_obligations: { table: 'dora_obligations', idCol: 'obligation_id' },
    };
    const mapping = tableMap[entityType];
    const entityResult = await safeQuery(
      `SELECT status, owner_id FROM "${schema}".${mapping.table} WHERE ${mapping.idCol} = $1 AND deleted_at IS NULL`,
      [entityId],
    );

    if (!entityResult.rows[0]) {
      return res.status(404).json({ success: false, error: 'Entity not found' });
    }

    const currentState = entityResult.rows[0].status;
    const ownerId = entityResult.rows[0].owner_id;

    authResult = await evaluateLifecycleTransition(
      req.tenantId,
      req.user?.userId || '',
      {
        moduleCode: 'dora',
        entityType,
        entityId,
        fromState: currentState,
        toState,
        permissionCode: 'dora.record.write',
        userRoles: req.user?.roles || [],
        ownerId,
      },
    );

    if (!authResult.allowed) {
      return res.status(403).json({
        success: false,
        error: `Transition denied: ${authResult.reason}`,
        checks: authResult.checks,
      });
    }

    // Perform the transition
    await safeQuery(
      `UPDATE "${schema}".${mapping.table}
       SET status = $1, updated_at = NOW()
       WHERE ${mapping.idCol} = $2 AND deleted_at IS NULL`,
      [toState, entityId],
    );

    await emitDoraStatusChange(req.tenantId!, entityType, entityId, currentState, toState);

    res.json({
      success: true,
      data: { entityType, entityId, fromState: currentState, toState, comment },
    });
  } catch (_err) {
    // If evaluateLifecycleTransition is not available, fall back to basic validation
    return res.status(500).json({
      success: false,
      error: 'Lifecycle transition service unavailable',
    });
  }
}));

// ════════════════════════════════════════════════════════════════════════
// AI ANALYSIS (MP-25 §8)
// ════════════════════════════════════════════════════════════════════════

router.post('/ai/regulatory-summary', authenticate, requirePermission('dora.record.read'), validate({ body: createRegulatorySummaryBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.generateRegulatorySummary(req.tenantId!, req.body);
  if (!result) return res.status(503).json({ success: false, error: 'AI service unavailable' });
  res.json({ success: true, data: result });
}));

router.post('/ai/gap-narration', authenticate, requirePermission('dora.record.read'), validate({ body: createGapNarrationBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.generateGapNarration(req.tenantId!, req.body);
  if (!result) return res.status(503).json({ success: false, error: 'AI service unavailable' });
  res.json({ success: true, data: result });
}));

router.post('/ai/evidence-sufficiency', authenticate, requirePermission('dora.record.read'), validate({ body: createEvidenceSufficiencyBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await aiService.assessEvidenceSufficiency(req.tenantId!, req.body);
  if (!result) return res.status(503).json({ success: false, error: 'AI service unavailable' });
  res.json({ success: true, data: result });
}));

export default router;

