// ============================================================================
// Shahin — Governance Baseline Seeders: Meetings & Decisions
// Seeds committee meetings, agenda items, decisions, votes, and attendees.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { uuid, getTenantAdmin } from './_shared';

export async function seedMeetingsAndDecisions(
  tenantId: string,
): Promise<{ meetings: number; decisions: number; votes: number }> {
  const schema = tenantSchema(tenantId);
  const adminId = await getTenantAdmin(tenantId);
  let meetings = 0, decisions = 0, votes = 0;

  const committees = await safeQuery(
    `SELECT committee_id, name FROM "${schema}".committees WHERE deleted_at IS NULL`,
  );

  for (const c of committees.rows) {
    // Check if committee already has meetings
    const existing = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".governance_meetings WHERE committee_id = $1`,
      [c.committee_id],
    );
    if (Number(getFirstRow(existing)?.cnt || 0) >= 2) continue;

    // Create past meeting (completed with minutes)
    const pastMeetingId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_meetings
         (meeting_id, committee_id, title, scheduled_at, status, minutes, duration_minutes)
       VALUES ($1, $2, $3, NOW() - INTERVAL '30 days', 'completed', $4, 90)`,
      [pastMeetingId, c.committee_id, `${c.name} — Quarterly Review`, `Meeting conducted. Key items reviewed. All agenda items addressed.`],
    );

    // Create upcoming meeting (scheduled)
    const futureMeetingId = uuid();
    await safeQuery(
      `INSERT INTO "${schema}".governance_meetings
         (meeting_id, committee_id, title, scheduled_at, status, duration_minutes)
       VALUES ($1, $2, $3, NOW() + INTERVAL '30 days', 'scheduled', 90)`,
      [futureMeetingId, c.committee_id, `${c.name} — Next Quarterly Meeting`],
    );
    meetings += 2;

    // Add agenda items for past meeting
    const agendaItems = [
      { title: 'Opening & Quorum Confirmation', decision_required: false },
      { title: 'Review of Previous Minutes', decision_required: false },
      { title: 'Risk Appetite Review', decision_required: true },
      { title: 'Policy Update Approval', decision_required: true },
      { title: 'Action Items Follow-up', decision_required: false },
    ];
    for (let i = 0; i < agendaItems.length; i++) {
      await safeQuery(
        `INSERT INTO "${schema}".governance_agenda_items
           (meeting_id, sequence, title, status, decision_required)
         VALUES ($1, $2, $3, 'resolved', $4)`,
        [pastMeetingId, i + 1, agendaItems[i].title, agendaItems[i].decision_required],
      );
    }

    // Create decisions from past meeting
    const decisionTexts = [
      { text: `Approved current risk appetite framework for ${c.name} oversight area`, type: 'approval', status: 'approved' },
      { text: `Directed management to update information security policy within 30 days`, type: 'directive', status: 'approved' },
    ];
    for (const d of decisionTexts) {
      const decisionId = uuid();
      await safeQuery(
        `INSERT INTO "${schema}".governance_decisions
           (decision_id, meeting_id, decision_text, decision_type, status, effective_date, review_date)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '90 days')`,
        [decisionId, pastMeetingId, d.text, d.type, d.status],
      );
      decisions++;

      // Add vote for each decision
      if (adminId) {
        await safeQuery(
          `INSERT INTO "${schema}".governance_decision_votes
             (decision_id, voter_user_id, vote, comments)
           VALUES ($1, $2, 'for', 'Approved as presented')
           ON CONFLICT DO NOTHING`,
          [decisionId, adminId],
        );
        votes++;
      }
    }

    // Add attendees to past meeting
    if (adminId) {
      await safeQuery(
        `INSERT INTO "${schema}".governance_meeting_attendees
           (meeting_id, user_id, attendance_status)
         VALUES ($1, $2, 'attended')
         ON CONFLICT DO NOTHING`,
        [pastMeetingId, adminId],
      );
    }
  }

  return { meetings, decisions, votes };
}
