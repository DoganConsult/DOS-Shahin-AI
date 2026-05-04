/**
 * Phase 1: DB-Driven GRC Sandbox
 * Backend API routes for GRC sandbox experience
 *
 * Exposes compliance frameworks, controls, and requirements data
 * for interactive sandbox experience for visitors.
 */

import { Router } from 'express';
import type { Pool } from 'pg';

export function createGrcSandboxRouter(pool: Pool): Router {
  const router = Router();

  /**
   * GET /api/ui-os/grc-sandbox/frameworks
   * Returns all compliance frameworks for sandbox
   */
  router.get('/frameworks', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT framework_id, name, description, version, status
         FROM dos.compliance_frameworks
         WHERE tenant_id = 'sandbox' AND is_deleted = false
         ORDER BY name`
      );
      res.json({ frameworks: result.rows });
    } catch (error) {
      console.error('[grc-sandbox] frameworks error', error);
      res.status(500).json({ error: 'Failed to fetch frameworks' });
    }
  });

  /**
   * GET /api/ui-os/grc-sandbox/controls?framework_id=xxx
   * Returns controls for a specific framework or all controls
   */
  router.get('/controls', async (req, res) => {
    try {
      const { framework_id } = req.query;
      let query = `
        SELECT c.control_id, c.control_ref, c.title, c.description, c.status, c.effectiveness,
               f.name as framework_name, f.version as framework_version
        FROM dos.controls c
        LEFT JOIN dos.compliance_frameworks f ON c.framework_id = f.framework_id
        WHERE c.tenant_id = 'sandbox' AND c.is_deleted = false
      `;
      const params: any[] = [];

      if (framework_id) {
        query += ` AND c.framework_id = $1`;
        params.push(framework_id);
      }

      query += ` ORDER BY c.control_ref`;

      const result = await pool.query(query, params);
      res.json({ controls: result.rows });
    } catch (error) {
      console.error('[grc-sandbox] controls error', error);
      res.status(500).json({ error: 'Failed to fetch controls' });
    }
  });

  /**
   * GET /api/ui-os/grc-sandbox/requirements?framework_id=xxx
   * Returns compliance requirements for a specific framework or all requirements
   */
  router.get('/requirements', async (req, res) => {
    try {
      const { framework_id } = req.query;
      let query = `
        SELECT r.requirement_id, r.code, r.title, r.description, r.status,
               f.name as framework_name
        FROM dos.compliance_requirements r
        LEFT JOIN dos.compliance_frameworks f ON r.framework_id = f.framework_id
        WHERE r.tenant_id = 'sandbox'
      `;
      const params: any[] = [];

      if (framework_id) {
        query += ` AND r.framework_id = $1`;
        params.push(framework_id);
      }

      query += ` ORDER BY r.code`;

      const result = await pool.query(query, params);
      res.json({ requirements: result.rows });
    } catch (error) {
      console.error('[grc-sandbox] requirements error', error);
      res.status(500).json({ error: 'Failed to fetch requirements' });
    }
  });

  /**
   * GET /api/ui-os/grc-sandbox/summary
   * Returns summary statistics for the sandbox
   */
  router.get('/summary', async (req, res) => {
    try {
      const [frameworksResult, controlsResult, requirementsResult] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) as count
           FROM dos.compliance_frameworks
           WHERE tenant_id = 'sandbox' AND is_deleted = false`
        ),
        pool.query(
          `SELECT COUNT(*) as count,
                  COUNT(*) FILTER (WHERE status = 'implemented') as implemented,
                  COUNT(*) FILTER (WHERE status = 'partially_implemented') as partially_implemented,
                  COUNT(*) FILTER (WHERE status = 'not_implemented') as not_implemented
           FROM dos.controls
           WHERE tenant_id = 'sandbox' AND is_deleted = false`
        ),
        pool.query(
          `SELECT COUNT(*) as count,
                  COUNT(*) FILTER (WHERE status = 'pending') as pending,
                  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
                  COUNT(*) FILTER (WHERE status = 'completed') as completed
           FROM dos.compliance_requirements
           WHERE tenant_id = 'sandbox'`
        ),
      ]);

      res.json({
        frameworks: frameworksResult.rows[0].count,
        controls: {
          total: parseInt(controlsResult.rows[0].count),
          implemented: parseInt(controlsResult.rows[0].implemented),
          partially_implemented: parseInt(controlsResult.rows[0].partially_implemented),
          not_implemented: parseInt(controlsResult.rows[0].not_implemented),
        },
        requirements: {
          total: parseInt(requirementsResult.rows[0].count),
          pending: parseInt(requirementsResult.rows[0].pending),
          in_progress: parseInt(requirementsResult.rows[0].in_progress),
          completed: parseInt(requirementsResult.rows[0].completed),
        },
      });
    } catch (error) {
      console.error('[grc-sandbox] summary error', error);
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  /**
   * GET /api/ui-os/grc-sandbox/compare?frameworks=xxx,yyy
   * Compares controls between multiple frameworks
   */
  router.get('/compare', async (req, res) => {
    try {
      const { frameworks } = req.query;
      if (!frameworks || typeof frameworks !== 'string') {
        return res.status(400).json({ error: 'frameworks parameter required' });
      }

      const frameworkIds = frameworks.split(',');
      const result = await pool.query(
        `SELECT f.name as framework_name, c.control_ref, c.title, c.description, c.status
         FROM dos.controls c
         LEFT JOIN dos.compliance_frameworks f ON c.framework_id = f.framework_id
         WHERE c.tenant_id = 'sandbox' AND c.is_deleted = false
         AND c.framework_id = ANY($1)
         ORDER BY f.name, c.control_ref`,
        [frameworkIds]
      );

      res.json({ comparison: result.rows });
    } catch (error) {
      console.error('[grc-sandbox] compare error', error);
      res.status(500).json({ error: 'Failed to compare frameworks' });
    }
  });

  return router;
}
