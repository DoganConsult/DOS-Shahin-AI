import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface Committee {
  committee_id: string;
  tenant_id: string;
  name_en: string;
  name_ar: string | null;
  code: string | null;
  committee_type: string | null;
  charter: string | null;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitteeMember {
  member_id: string;
  committee_id: string;
  user_id: string;
  tenant_id: string;
  role_in_committee: string;
  email?: string;
  display_name?: string;
  created_at: string;
}

export interface CreateCommitteeInput {
  name_en: string;
  name_ar?: string;
  code?: string;
  committee_type?: string;
  charter?: string;
  status?: string;
  description?: string;
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function listCommittees(tenantId: string, status?: string): Promise<Committee[]> {
  const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
  return track('foundation.committee.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.committees WHERE ${conditions.join(' AND ')} ORDER BY name_en`,
        params,
      );
      return r.rows as Committee[];
    }),
  );
}

export async function getCommittee(tenantId: string, id: string): Promise<Committee | null> {
  return track('foundation.committee.getById', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.committees WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId],
      );
      return (r.rows[0] as Committee) ?? null;
    }),
  );
}

export async function listMembers(tenantId: string, committeeId: string): Promise<CommitteeMember[]> {
  return track('foundation.committee.members', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT cm.*, u.email, u.display_name, u.first_name, u.last_name
           FROM dos.committee_members cm
           JOIN dos.users u ON u.user_id = cm.user_id
          WHERE cm.committee_id = $1 AND cm.tenant_id = $2 AND cm.deleted_at IS NULL AND u.deleted_at IS NULL
          ORDER BY cm.role_in_committee, u.display_name`,
        [committeeId, tenantId],
      );
      return r.rows as CommitteeMember[];
    }),
  );
}

export async function createCommittee(tenantId: string, input: CreateCommitteeInput, actorId: string): Promise<Committee> {
  const id = randomUUID();
  return track('foundation.committee.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.committees
           (committee_id, tenant_id, name_en, name_ar, code, committee_type, charter, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'active'), $9, $10, NOW(), NOW())
         RETURNING *`,
        [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
         input.committee_type ?? 'standing', input.charter ?? null,
         input.status ?? null, input.description ?? null, actorId],
      );
      return r.rows[0] as Committee;
    }),
  );
}

export async function addMember(tenantId: string, committeeId: string, userId: string, roleInCommittee?: string): Promise<CommitteeMember> {
  const memberId = randomUUID();
  return track('foundation.committee.addMember', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.committee_members
           (member_id, committee_id, user_id, tenant_id, role_in_committee, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [memberId, committeeId, userId, tenantId, roleInCommittee ?? 'member'],
      );
      return r.rows[0] as CommitteeMember;
    }),
  );
}

export async function removeMember(tenantId: string, committeeId: string, memberOrUserId: string): Promise<boolean> {
  return track('foundation.committee.removeMember', async () =>
    withTenantClient(tenantId, async (c) => {
      // Accept either member_id (uuid) or user_id (varchar). FE contract
      // uses /:committeeId/members/:userId; legacy callers pass member_id.
      const r = await c.query(
        `UPDATE dos.committee_members SET deleted_at = NOW()
          WHERE (member_id::text = $1 OR user_id = $1)
            AND committee_id = $2 AND tenant_id = $3 AND deleted_at IS NULL
          RETURNING member_id`,
        [memberOrUserId, committeeId, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}

// W4.F4.1 — committee update / delete / meetings.
export async function updateCommittee(tenantId: string, id: string, input: Partial<CreateCommitteeInput>): Promise<Committee | null> {
  return track('foundation.committee.update', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.committees
            SET name_en        = COALESCE($3, name_en),
                name_ar        = COALESCE($4, name_ar),
                code           = COALESCE($5, code),
                committee_type = COALESCE($6, committee_type),
                charter        = COALESCE($7, charter),
                status         = COALESCE($8, status),
                description    = COALESCE($9, description),
                updated_at     = NOW()
          WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING *`,
        [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
         input.committee_type ?? null, input.charter ?? null, input.status ?? null, input.description ?? null],
      );
      return (r.rows[0] as Committee) ?? null;
    }),
  );
}

export async function deleteCommittee(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.committee.delete', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.committees SET deleted_at = NOW(), updated_at = NOW()
          WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING committee_id`,
        [id, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}

export interface CommitteeMeeting {
  meeting_id: string;
  committee_id: string;
  tenant_id: string;
  title: string;
  agenda: string | null;
  scheduled_at: string;
  location: string | null;
  status: string;
  minutes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function listMeetings(tenantId: string, committeeId: string): Promise<CommitteeMeeting[]> {
  return track('foundation.committee.meetings.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT * FROM dos.committee_meetings
          WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          ORDER BY scheduled_at DESC`,
        [committeeId, tenantId],
      );
      return r.rows as CommitteeMeeting[];
    }),
  );
}

export async function createMeeting(
  tenantId: string,
  committeeId: string,
  input: { title: string; agenda?: string; scheduled_at: string; location?: string; status?: string; minutes?: string },
  actorId: string,
): Promise<CommitteeMeeting> {
  const id = randomUUID();
  return track('foundation.committee.meetings.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO dos.committee_meetings
           (meeting_id, committee_id, tenant_id, title, agenda, scheduled_at, location, status, minutes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'scheduled'), $9, $10)
         RETURNING *`,
        [id, committeeId, tenantId, input.title, input.agenda ?? null, input.scheduled_at,
         input.location ?? null, input.status ?? null, input.minutes ?? null, actorId],
      );
      return r.rows[0] as CommitteeMeeting;
    }),
  );
}
