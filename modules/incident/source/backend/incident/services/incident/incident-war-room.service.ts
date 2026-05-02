import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import type { WarRoom, WarRoomRaci, WarRoomEvent, ContainmentStep } from '@dos/types';
import { randomUUID } from 'crypto';
import { getFirstRow } from '@dos/db';

// ── Create War Room ────────────────────────────────────────────────────────

export async function createWarRoom(tenantId: string, input: {
  incidentId: string; severity?: string; teamMemberIds?: string[];
}): Promise<WarRoom> {
  const schema = tenantSchema(tenantId);

  const raci: WarRoomRaci[] = (input.teamMemberIds || []).map((uid, i) => ({
    role: i === 0 ? 'lead' : i === 1 ? 'approver' : 'observer',
    userId: uid,
    responsibility: (i === 0 ? 'responsible' : i === 1 ? 'accountable' : 'informed') as WarRoomRaci['responsibility'],
  }));

  const warRoomId = randomUUID();

  const timeline: WarRoomEvent[] = [{
    id: randomUUID(), warRoomId, eventType: 'created', source: 'ai',
    description: `War room created for incident ${input.incidentId}. Severity: ${input.severity || 'any'}. ${raci.length} team members assigned.`,
    timestamp: new Date().toISOString(),
  }];

  const containment: ContainmentStep[] = generateContainmentSteps(warRoomId, input.severity);

  const res = await safeQuery(
    `INSERT INTO "${schema}".war_rooms
       (war_room_id, incident_id, raci_assignments, timeline, containment_steps, title, severity, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active') RETURNING war_room_id, created_at`,
    [warRoomId, input.incidentId, JSON.stringify(raci), JSON.stringify(timeline), JSON.stringify(containment),
     `War Room: ${input.incidentId}`, input.severity || 'medium'],
  );

  await eventBus.publish(({
      tenantId, eventType: 'warroom.created', severity: 'warning',
      entityId: input.incidentId,
      payload: { warRoomId: getFirstRow(res)?.war_room_id, teamSize: raci.length },
    } as any));

  return getWarRoom(tenantId, getFirstRow(res)?.war_room_id);
}

// ── Claim Task ─────────────────────────────────────────────────────────────

export async function claimWarRoomTask(tenantId: string, warRoomId: string, userId: string): Promise<WarRoom> {
  const schema = tenantSchema(tenantId);
  const room = await getRawWarRoom(schema, warRoomId);

  const raci: WarRoomRaci[] = room.raci_assignments;

  const timeline: WarRoomEvent[] = room.timeline;
  timeline.push({
    id: randomUUID(), warRoomId, eventType: 'task_claimed', source: 'human',
    description: `${userId} claimed their assignment.`, timestamp: new Date().toISOString(),
  });

  await safeQuery(
    `UPDATE "${schema}".war_rooms SET raci_assignments = $1, timeline = $2 WHERE war_room_id = $3`,
    [JSON.stringify(raci), JSON.stringify(timeline), warRoomId],
  );

  return getWarRoom(tenantId, warRoomId);
}

// ── Update Containment Step ────────────────────────────────────────────────

export async function updateContainmentStep(tenantId: string, warRoomId: string, stepId: string, update: {
  status: 'in_progress' | 'completed'; userId: string;
}): Promise<WarRoom> {
  const schema = tenantSchema(tenantId);
  const room = await getRawWarRoom(schema, warRoomId);

  const steps: ContainmentStep[] = room.containment_steps;
  const step = steps.find(s => s.stepId === stepId || s.id === stepId);
  if (step) {
    step.status = update.status;
    step.assignee = update.userId;
  }

  const timeline: WarRoomEvent[] = room.timeline;
  timeline.push({
    id: randomUUID(), warRoomId, eventType: 'step_updated', source: 'human',
    description: `Containment step "${step?.description || stepId}" marked as ${update.status}.`,
    timestamp: new Date().toISOString(),
  });

  await safeQuery(
    `UPDATE "${schema}".war_rooms SET containment_steps = $1, timeline = $2 WHERE war_room_id = $3`,
    [JSON.stringify(steps), JSON.stringify(timeline), warRoomId],
  );

  return getWarRoom(tenantId, warRoomId);
}

// ── Add Timeline Event ─────────────────────────────────────────────────────

export async function addTimelineEvent(tenantId: string, warRoomId: string, event: {
  source: 'agent' | 'human'; description: string; userId?: string;
}): Promise<WarRoom> {
  const schema = tenantSchema(tenantId);
  const room = await getRawWarRoom(schema, warRoomId);

  const timeline: WarRoomEvent[] = room.timeline;
  timeline.push({
    id: randomUUID(), warRoomId, eventType: 'note', source: event.source === 'agent' ? 'ai' : 'human',
    description: event.description, timestamp: new Date().toISOString(),
  });

  await safeQuery(
    `UPDATE "${schema}".war_rooms SET timeline = $1 WHERE war_room_id = $2`,
    [JSON.stringify(timeline), warRoomId],
  );

  return getWarRoom(tenantId, warRoomId);
}

// ── Resolve War Room ───────────────────────────────────────────────────────

export async function resolveWarRoom(tenantId: string, warRoomId: string, userId: string): Promise<WarRoom> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".war_rooms SET status = 'resolved', resolved_at = NOW() WHERE war_room_id = $1`,
    [warRoomId],
  );

  await recordAudit({
    tenantId, userId, module: 'cooperative-workflows',
    action: 'update', entityType: 'war_room', entityId: warRoomId,
    afterState: { status: 'resolved' },
  });

  return getWarRoom(tenantId, warRoomId);
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function getWarRoom(tenantId: string, warRoomId: string): Promise<WarRoom> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.incident_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function listWarRooms(tenantId: string, status?: string): Promise<WarRoom[]> {
  const schema = tenantSchema(tenantId);
  const where = status ? `WHERE status = $1` : '';
  const res = await safeQuery(`SELECT * FROM "${schema}".war_rooms ${where} ORDER BY created_at DESC LIMIT 50`, status ? [status] : []);
  return res.rows.map(mapWarRoom);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateContainmentSteps(warRoomId: string, severity?: string): ContainmentStep[] {
  const base: ContainmentStep[] = [

    { id: randomUUID(), warRoomId, stepId: randomUUID(), description: 'Isolate affected systems', status: 'pending', priority: 1 },

    { id: randomUUID(), warRoomId, stepId: randomUUID(), description: 'Preserve evidence and logs', status: 'pending', priority: 2 },

    { id: randomUUID(), warRoomId, stepId: randomUUID(), description: 'Notify stakeholders', status: 'pending', priority: 3 },

    { id: randomUUID(), warRoomId, stepId: randomUUID(), description: 'Assess blast radius', status: 'pending', priority: 4 },
  ];

  if (severity === 'critical' || severity === 'high') {
    base.push(

      { id: randomUUID(), warRoomId, stepId: randomUUID(), description: 'Activate business continuity plan', status: 'pending', priority: 2 },
      { id: randomUUID(), warRoomId, stepId: randomUUID(), description: 'Notify regulator within SLA window', status: 'pending', priority: 1 },
    );
  }

  return base.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

async function getRawWarRoom(schema: string, warRoomId: string): Promise<unknown> {
  const res = await safeQuery(`SELECT * FROM "${schema}".war_rooms WHERE war_room_id = $1`, [warRoomId]);
  if (!res.rows.length) throw new Error('War room not found');
  const r = getFirstRow(res)!;
  r.raci_assignments = typeof r.raci_assignments === 'string' ? JSON.parse(r.raci_assignments) : r.raci_assignments || [];
  r.timeline = typeof r.timeline === 'string' ? JSON.parse(r.timeline) : r.timeline || [];
  r.containment_steps = typeof r.containment_steps === 'string' ? JSON.parse(r.containment_steps) : r.containment_steps || [];
  return r;
}

function mapWarRoom( r: Record<string, unknown>): WarRoom {
  return {

    id: r.war_room_id || r.id,

    tenantId: r.tenant_id,

    incidentId: r.incident_id,

    title: r.title || `War Room: ${r.incident_id}`,

    severity: r.severity || 'medium',

    status: r.status || 'active',

    warRoomId: r.war_room_id,
    raci: typeof r.raci_assignments === 'string' ? JSON.parse(r.raci_assignments) : r.raci_assignments || [],
    timeline: typeof r.timeline === 'string' ? JSON.parse(r.timeline) : r.timeline || [],
    containmentSteps: typeof r.containment_steps === 'string' ? JSON.parse(r.containment_steps) : r.containment_steps || [],

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    resolvedAt: r.resolved_at?.toISOString?.() || r.resolved_at,
  };
}
