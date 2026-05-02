import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

import {
  listPolicies, getPolicy, createPolicy as createPolicyService,
  updatePolicy as updatePolicyService, deletePolicy as deletePolicyService,
  publishPolicy, retirePolicy, getCategoryStats,
} from '../services/policy/policy-library.service';
import {
  comparePolicyVersions, analyzePolicyImpact,
  requestPolicyException, getPolicyExceptions, reviewPolicyException,
  getExpiringPolicyExceptionsLegacy, trackPolicyDistribution, getPolicyDistributionStatus,
  recordPolicyRead, mapPolicyToRegulations, getPolicyRegulationMap,
  createAttestationCampaign as createAdvancedAttestation,
  getAttestationCampaigns, recordAttestation as recordAdvancedAttestation,
  getAttestationStatus as getAdvancedAttestationStatus,
} from '../services/policy/policy-advanced.service';
import { detectPolicyGaps, getPolicyGapSummary, resolveGap } from '../services/policy/policy-gap-detector.service';
import { simulatePolicyImpact } from '../services/policy/policy-impact-simulator.service';

export async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listPolicies(req.tenantId!, req.query as Record<string, string>);
  res.json(ok(result, req));
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const policy = await getPolicy(req.tenantId!, req.params.id);
  if (!policy) throw new NotFoundError('policy', req.params.id);
  res.json(ok(policy, req));
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const policy = await createPolicyService(req.tenantId!, req.body, userId);

  setAuditData(res as any, { action: 'create', entityType: 'policy', entityId: policy?.policy_id, afterState: policy });
  res.status(201).json(ok(policy, req));
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const before = await getPolicy(req.tenantId!, id);
  if (!before) throw new NotFoundError('policy', id);
  const userId = req.user!.userId!;
  const updated = await updatePolicyService(req.tenantId!, id, req.body, userId);
  setAuditData(res as any, { action: 'update', entityType: 'policy', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function remove(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const deleted = await deletePolicyService(req.tenantId!, id);
  if (!deleted) throw new NotFoundError('policy', id);
  setAuditData(res as any, { action: 'delete', entityType: 'policy', entityId: id });
  res.json(action('Policy deleted', req));
}

export async function publish(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await publishPolicy(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'policy', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function retire(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await retirePolicy(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'policy', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function categoryStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCategoryStats(req.tenantId!);
  res.json(ok(result, req));
}

export async function compareVersions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { versionA, versionB } = req.query as Record<string, string>;
  const result = await comparePolicyVersions(req.tenantId!, id, parseInt(versionA, 10), parseInt(versionB, 10));
  res.json(ok(result, req));
}

export async function impactAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await analyzePolicyImpact(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function impactSimulation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const simulationType = req.body.simulationType || 'update';
  const result = await simulatePolicyImpact(req.tenantId!, req.params.id, simulationType);
  res.json(ok(result, req));
}

export async function gapDetection(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await detectPolicyGaps(req.tenantId!);
  res.json(ok(result, req));
}

export async function gapSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPolicyGapSummary(req.tenantId!);
  res.json(ok(result, req));
}

export async function resolveGapById(req: AuthenticatedRequest, res: Response): Promise<void> {
  await resolveGap(req.tenantId!, req.params.gapId);
  setAuditData(res as any, { action: 'update', entityType: 'policy_gap', entityId: req.params.gapId });
  res.json(action('Gap resolved', req));
}

export async function requestException(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await requestPolicyException(req.tenantId!, { ...req.body, requestedBy: userId });

  setAuditData(res as any, { action: 'create', entityType: 'policy_exception', entityId: (result as Record<string, unknown>)?.exceptionId });
  res.status(201).json(ok(result, req));
}

export async function listExceptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPolicyExceptions(req.tenantId!);
  res.json(ok(result, req));
}

export async function reviewException(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await reviewPolicyException(req.tenantId!, req.params.id, req.body.decision, req.body.comments, userId);
  setAuditData(res as any, { action: 'update', entityType: 'policy_exception', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function expiringExceptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getExpiringPolicyExceptionsLegacy(req.tenantId!);
  res.json(ok(result, req));
}

export async function distribution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await trackPolicyDistribution(req.tenantId!, req.params.id, req.body.recipientIds || []);
  setAuditData(res as any, { action: 'create', entityType: 'policy_distribution', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function distributionStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPolicyDistributionStatus(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function recordRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordPolicyRead(req.tenantId!, req.params.id, userId);
  res.json(ok(result, req));
}

export async function regulationMapping(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await mapPolicyToRegulations(req.tenantId!, req.params.id, req.body.regulationIds);
  setAuditData(res as any, { action: 'update', entityType: 'policy_regulation_map', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function regulationMap(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getPolicyRegulationMap(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function createAttestation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createAdvancedAttestation(req.tenantId!, { ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'attestation_campaign' });
  res.status(201).json(ok(result, req));
}

export async function listAttestations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAttestationCampaigns(req.tenantId!);
  res.json(ok(result, req));
}

export async function recordAttestation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordAdvancedAttestation(req.tenantId!, req.params.campaignId, userId, req.body.acknowledged ?? true);
  res.json(ok(result, req));
}

export async function attestationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getAdvancedAttestationStatus(req.tenantId!, req.params.campaignId);
  res.json(ok(result, req));
}
