import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action as _action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

import {
  reportIncident, getIncidents, getIncidentById as getIncidentByIdService,
  investigateIncident, recordLessonsLearned, updateIncident as updateIncidentService,
  updateIncidentStatus,
} from '../services/incident/incident.service';
import {
  getTriageQueue, recordTriageDecision, autoTriageIncident, getTriageHistory,
} from '../services/incident/incident-triage.service';
import {
  createWarRoom, claimWarRoomTask, updateContainmentStep,
  addTimelineEvent, resolveWarRoom, getWarRoom, listWarRooms,
} from '../services/incident/incident-war-room.service';
import {
  createBreachRecord, getBreachRecords, getBreachRecordById,
  updateBreachRecord, submitBreachReport, acknowledgeBreachReport,
  getOverdueBreachReports,
} from '../services/incident/incident-breach-reporting.service';
import {
  createCAPA, updateCAPA, getCAPA, listCAPAs,
  transitionStatus as transitionCapaStatus, recordEffectivenessReview,
  getOverdueCAPAs, getCAPADashboard,
} from '../services/misc/capa.service';

export async function list(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filters: { status?: string; severity?: string } = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.severity) filters.severity = req.query.severity as string;
  const result = await getIncidents(req.tenantId!, filters);
  res.json(ok(result, req));
}

export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const incident = await getIncidentByIdService(req.tenantId!, req.params.id);
  if (!incident) throw new NotFoundError('incident', req.params.id);
  res.json(ok(incident, req));
}

export async function create(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const incident = await reportIncident(req.tenantId!, { ...req.body, reportedBy: userId });

  setAuditData(res as any, { action: 'create', entityType: 'incident', entityId: incident?.incidentId, afterState: incident });
  res.status(201).json(ok(incident, req));
}

export async function update(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const before = await getIncidentByIdService(req.tenantId!, id);
  if (!before) throw new NotFoundError('incident', id);
  const userId = req.user!.userId!;
  const updated = await updateIncidentService(req.tenantId!, id, { ...req.body, updatedBy: userId });
  setAuditData(res as any, { action: 'update', entityType: 'incident', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function changeStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateIncidentStatus(req.tenantId!, req.params.id, req.body.status);
  setAuditData(res as any, { action: 'update', entityType: 'incident_status', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function investigate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await investigateIncident(req.tenantId!, req.params.id, { ...req.body, investigator: userId });
  setAuditData(res as any, { action: 'update', entityType: 'incident_investigation', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function lessonsLearned(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordLessonsLearned(req.tenantId!, req.params.id, { ...req.body, recordedBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'lessons_learned', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function triageQueue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTriageQueue(req.tenantId);
  res.json(ok(result, req));
}

export async function triageDecision(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordTriageDecision(req.tenantId, req.params.id, { ...req.body, decidedBy: userId });
  setAuditData(res as any, { action: 'update', entityType: 'incident_triage', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function autoTriage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await autoTriageIncident(req.tenantId, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'incident_auto_triage', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function triageHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getTriageHistory(req.tenantId, req.params.id);
  res.json(ok(result, req));
}

export async function createWarRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createWarRoom(req.tenantId!, { ...req.body });
  setAuditData(res as any, { action: 'create', entityType: 'war_room', afterState: result });
  res.status(201).json(ok(result, req));
}

export async function getWarRoomById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getWarRoom(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function listWarRoomsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const status = req.query.status as string | undefined;
  const result = await listWarRooms(req.tenantId!, status);
  res.json(ok(result, req));
}

export async function claimTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await claimWarRoomTask(req.tenantId!, req.params.id, userId);
  res.json(ok(result, req));
}

export async function updateContainment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateContainmentStep(req.tenantId!, req.params.id, req.params.stepId, req.body);
  res.json(ok(result, req));
}

export async function addTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await addTimelineEvent(req.tenantId!, req.params.id, { ...req.body, addedBy: userId });
  res.json(ok(result, req));
}

export async function resolveWarRoomHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await resolveWarRoom(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'war_room', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function createBreachRecordHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createBreachRecord(req.tenantId!, req.params.incidentId || req.body.incidentId, req.body);

  setAuditData(res as any, { action: 'create', entityType: 'breach_record', entityId: (result as Record<string, unknown>)?.breach_id });
  res.status(201).json(ok(result, req));
}

export async function listBreachRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBreachRecords(req.tenantId!);
  res.json(ok(result, req));
}

export async function getBreachRecordByIdHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getBreachRecordById(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('breach_record', req.params.id);
  res.json(ok(result, req));
}

export async function updateBreachRecordHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateBreachRecord(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'breach_record', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function submitBreachReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await submitBreachReport(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'breach_report', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function acknowledgeBreachReportHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await acknowledgeBreachReport(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function overdueBreachReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOverdueBreachReports(req.tenantId!);
  res.json(ok(result, req));
}

export async function createCAPAHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await createCAPA(req.tenantId!, { ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'create', entityType: 'capa', entityId: result?.capaId });
  res.status(201).json(ok(result, req));
}

export async function getCAPAById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCAPA(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('capa', req.params.id);
  res.json(ok(result, req));
}

export async function listCAPAsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await listCAPAs(req.tenantId!);
  res.json(ok(result, req));
}

export async function updateCAPAHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await updateCAPA(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'capa', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function transitionCAPAStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await transitionCapaStatus(req.tenantId!, req.params.id, req.body.targetStatus, req.body.reason || '', userId);
  setAuditData(res as any, { action: 'update', entityType: 'capa_status', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function capaEffectivenessReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await recordEffectivenessReview(req.tenantId!, req.params.id, req.body.result, req.body.notes || '', req.body.evidenceIds);
  setAuditData(res as any, { action: 'update', entityType: 'capa_effectiveness', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function overdueCAPAs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getOverdueCAPAs(req.tenantId!);
  res.json(ok(result, req));
}

export async function capaDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getCAPADashboard(req.tenantId!);
  res.json(ok(result, req));
}
