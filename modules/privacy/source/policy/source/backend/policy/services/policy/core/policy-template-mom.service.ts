import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { trackPolicyAction } from './policy-template-workflow.service';
import type { GenericRow as _GenericRow } from '@dos/types';

export { MOM_FORMATS } from './policy-template-catalog';

export async function createMOMRecord(
  tenantId: string,
  data: {
    policyId?: string;
    momType: string;
    title: string;
    meetingDate: string;
    location?: string;
    chairperson: string;
    attendees: unknown[];
    absentees?: unknown[];
    agendaItems: unknown[];
    discussionNotes: string;
    decisions: unknown[];
    actionItems: unknown[];
    nextMeetingDate?: string;
    createdBy: string;
  },
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `INSERT INTO "${schema}".policy_mom_records
        (policy_id, mom_type, title, meeting_date, location, chairperson,
         attendees, absentees, agenda_items, discussion_notes, decisions,
         action_items, next_meeting_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        data.policyId || null, data.momType, data.title,
        data.meetingDate, data.location || null, data.chairperson,
        JSON.stringify(data.attendees), JSON.stringify(data.absentees || []),
        JSON.stringify(data.agendaItems), data.discussionNotes,
        JSON.stringify(data.decisions), JSON.stringify(data.actionItems),
        data.nextMeetingDate || null, data.createdBy,
      ],
    );

    if (data.policyId) {
      await trackPolicyAction(tenantId, data.policyId, 'mom_attached', data.createdBy,
        null, null, null, `MOM attached: ${data.title}`, { mom_id: getFirstRow(result)?.mom_id });
    }

    return getFirstRow(result);
  } catch {
    return null;
  }
}

export async function getMOMRecords(
  tenantId: string,
  filters?: { policyId?: string; momType?: string; limit?: number },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters?.policyId) { conditions.push(`policy_id = $${idx++}`); params.push(filters.policyId); }
  if (filters?.momType) { conditions.push(`mom_type = $${idx++}`); params.push(filters.momType); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit || 50;

  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".policy_mom_records ${where} ORDER BY meeting_date DESC LIMIT ${limit}`,
      params,
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function approveMOM(
  tenantId: string,
  momId: string,
  userId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".policy_mom_records
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE mom_id = $2`,
      [userId, momId],
    );
    return true;
  } catch {
    return false;
  }
}
