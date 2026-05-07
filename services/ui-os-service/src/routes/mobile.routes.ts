// Mobile Experience Enhancement — API endpoints for mobile configuration
//
// GET /api/ui-os/mobile-breakpoint-config
// GET /api/ui-os/mobile-component-variants
// GET /api/ui-os/mobile-touch-gestures

import { Router } from 'express';
import type { DbPool } from '../db.js';

export function createMobileRoutes(pool: DbPool): Router {
  const router = Router();

  // GET /api/ui-os/mobile-breakpoint-config
  router.get('/mobile-breakpoint-config', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || null;
      
      const result = await pool.query(`
        SELECT
          tenant_id,
          breakpoint_key,
          min_px,
          max_px,
          default_behavior,
          is_active
        FROM dos.mobile_breakpoint_config
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
          AND is_active = true
        ORDER BY min_px ASC
      `, [tenantId]);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching mobile breakpoint config:', error);
      res.status(500).json({ error: 'Failed to fetch mobile breakpoint config' });
    }
  });

  // GET /api/ui-os/mobile-component-variants
  router.get('/mobile-component-variants', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || null;
      
      const result = await pool.query(`
        SELECT
          variant_id,
          tenant_id,
          component_key,
          variant_name,
          breakpoint,
          props_override,
          layout_override,
          is_default
        FROM dos.mobile_component_variants
        WHERE (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY component_key, breakpoint
      `, [tenantId]);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching mobile component variants:', error);
      res.status(500).json({ error: 'Failed to fetch mobile component variants' });
    }
  });

  // GET /api/ui-os/mobile-touch-gestures
  router.get('/mobile-touch-gestures', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || null;
      const componentKey = req.query.component_key as string || null;
      
      const query = componentKey
        ? `
          SELECT
            gesture_id,
            tenant_id,
            gesture_type,
            component_key,
            action_config,
            haptic_feedback,
            is_active
          FROM dos.mobile_touch_gestures
          WHERE (tenant_id = $1 OR tenant_id IS NULL)
            AND component_key = $2
            AND is_active = true
          ORDER BY gesture_type
        `
        : `
          SELECT
            gesture_id,
            tenant_id,
            gesture_type,
            component_key,
            action_config,
            haptic_feedback,
            is_active
          FROM dos.mobile_touch_gestures
          WHERE (tenant_id = $1 OR tenant_id IS NULL)
            AND is_active = true
          ORDER BY gesture_type
        `;

      const params = componentKey ? [tenantId, componentKey] : [tenantId];
      const result = await pool.query(query, params);

      res.json({ data: result.rows });
    } catch (error) {
      console.error('Error fetching mobile touch gestures:', error);
      res.status(500).json({ error: 'Failed to fetch mobile touch gestures' });
    }
  });

  return router;
}
