// ============================================
// AGRC-OS — Control Certification Service
// Manages certification campaigns, responses,
// manager sign-off, and overdue tracking.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CertificationCampaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  due_date: string;
  created_by: string;
  total_requests: number;
  completed_requests: number;
  created_at: string;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  due_date: string;
  created_by: string;
  control_ids: string[];
}

export interface CertificationRequest {
  id: string;
  campaign_id: string;
  control_id: string;
  control_title: string;
  assigned_to: string;
  status: string;
  response: string | null;
  responded_at: string | null;
}

export interface CampaignDetail {
  campaign: CertificationCampaign;
  requests: CertificationRequest[];
}

export interface CertResponseData {
  response: string;
  comments?: string;
  responded_by: string;
}

export interface OverdueCertification {
  request_id: string;
  campaign_id: string;
  campaign_name: string;
  control_id: string;
  control_title: string;
  assigned_to: string;
  due_date: string;
  days_overdue: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlCertificationService {
  /**
   * Lists all certification campaigns for the tenant,
   * enriched with request completion counts.
   */
  async listCampaigns(tenantId: string): Promise<CertificationCampaign[]> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT
         cc.id, cc.name, cc.description, cc.status, cc.due_date,
         cc.created_by, cc.created_at,
         COUNT(cr.id)::int AS total_requests,
         COUNT(cr.id) FILTER (WHERE cr.status = 'completed')::int AS completed_requests
       FROM ${schema}.control_certification_campaigns cc
       LEFT JOIN ${schema}.control_certification_requests cr ON cr.campaign_id = cc.id
       GROUP BY cc.id
       ORDER BY cc.created_at DESC`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      due_date: r.due_date,
      created_by: r.created_by,
      total_requests: r.total_requests,
      completed_requests: r.completed_requests,
      created_at: r.created_at,
    }));
  }

  /**
   * Creates a new certification campaign and generates one
   * certification request per control_id provided.
   */
  async createCampaign(
    tenantId: string,
    data: CreateCampaignData
  ): Promise<{ campaignId: string }> {
    const schema = tenantSchema(tenantId);

    // Insert the campaign
    const campaignResult = await safeQuery(
      `INSERT INTO ${schema}.control_certification_campaigns
         (name, description, status, due_date, created_by)
       VALUES ($1, $2, 'open', $3, $4)
       RETURNING id`,
      [data.name, data.description ?? null, data.due_date, data.created_by]
    );

    const campaignId = campaignResult.rows[0].id;

    // Create one request per control, assigned to the control's owner
    if (data.control_ids.length > 0) {
      const valueClauses: string[] = [];
      const params: unknown[] = [campaignId];
      let paramIdx = 2;

      for (const controlId of data.control_ids) {
        valueClauses.push(`($1, $${paramIdx})`);
        params.push(controlId);
        paramIdx++;
      }

      // Look up each control's owner_user_id and create requests
      // assigned to the owner. Falls back to NULL if no owner set.
      await safeQuery(
        `INSERT INTO ${schema}.control_certification_requests
           (campaign_id, control_id, assigned_to, status)
         SELECT v.campaign_id, v.control_id, c.owner_user_id, 'pending'
         FROM (VALUES ${valueClauses.join(", ")}) AS v(campaign_id, control_id)
         LEFT JOIN ${schema}.controls c ON c.control_id = v.control_id`,
        params
      );
    }

    return { campaignId };
  }

  /**
   * Returns full campaign detail including all certification requests
   * with control titles.
   */
  async getCampaignDetail(
    tenantId: string,
    campaignId: string
  ): Promise<CampaignDetail | null> {
    const schema = tenantSchema(tenantId);

    const [campaignResult, requestsResult] = await Promise.all([
      safeQuery(
        `SELECT id, name, description, status, due_date, created_by, created_at,
                0::int AS total_requests, 0::int AS completed_requests
           FROM ${schema}.control_certification_campaigns
          WHERE id = $1`,
        [campaignId]
      ),
      safeQuery(
        `SELECT cr.id, cr.campaign_id, cr.control_id, c.title AS control_title,
                cr.assigned_to, cr.status, cr.response, cr.responded_at
           FROM ${schema}.control_certification_requests cr
           LEFT JOIN ${schema}.controls c ON c.control_id = cr.control_id
          WHERE cr.campaign_id = $1
          ORDER BY c.title`,
        [campaignId]
      ),
    ]);

    if (requestsResult.rows.length === 0 && campaignResult.rows.length === 0) {
      return null;
    }

    const campaign = campaignResult.rows[0];

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        due_date: campaign.due_date,
        created_by: campaign.created_by,
        total_requests: requestsResult.rows.length,
        completed_requests: requestsResult.rows.filter(
          ( r: Record<string, unknown>) => r.status === "completed"
        ).length,
        created_at: campaign.created_at,
      },

      requests: requestsResult.rows.map(( r: Record<string, unknown>) => ({
        id: r.id,
        campaign_id: r.campaign_id,
        control_id: r.control_id,
        control_title: r.control_title,
        assigned_to: r.assigned_to,
        status: r.status,
        response: r.response,
        responded_at: r.responded_at,
      })),
    };
  }

  /**
   * Records a certification response for a specific request.
   * Sets the request status to 'completed' and records the timestamp.
   */
  async submitResponse(
    tenantId: string,
    requestId: string,
    data: CertResponseData
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `UPDATE ${schema}.control_certification_requests
          SET response = $1,
              comments = $2,
              assigned_to = $3,
              status = 'completed',
              responded_at = NOW()
        WHERE id = $4`,
      [data.response, data.comments ?? null, data.responded_by, requestId]
    );
  }

  /**
   * Records manager sign-off on a campaign. Updates campaign status
   * to 'signed_off' and records the signing manager.
   */
  async managerSignOff(
    tenantId: string,
    campaignId: string,
    managerId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    await safeQuery(
      `UPDATE ${schema}.control_certification_campaigns
          SET status = 'signed_off',
              signed_off_by = $1,
              signed_off_at = NOW()
        WHERE id = $2`,
      [managerId, campaignId]
    );
  }

  /**
   * Returns all overdue certification requests where the
   * campaign due_date has passed and the request is still pending.
   */
  async getOverdue(tenantId: string): Promise<OverdueCertification[]> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT
         cr.id AS request_id,
         cr.campaign_id,
         cc.name AS campaign_name,
         cr.control_id,
         c.title AS control_title,
         cr.assigned_to,
         cc.due_date,
         EXTRACT(DAY FROM NOW() - cc.due_date)::int AS days_overdue
       FROM ${schema}.control_certification_requests cr
       JOIN ${schema}.control_certification_campaigns cc ON cc.id = cr.campaign_id
       LEFT JOIN ${schema}.controls c ON c.control_id = cr.control_id
       WHERE cr.status = 'pending'
         AND cc.due_date < NOW()
       ORDER BY days_overdue DESC`,
      []
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      request_id: r.request_id,
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      control_id: r.control_id,
      control_title: r.control_title,
      assigned_to: r.assigned_to,
      due_date: r.due_date,
      days_overdue: r.days_overdue,
    }));
  }
}
