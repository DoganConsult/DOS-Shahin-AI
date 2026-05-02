export class UiOsWidgetExtManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // ── ui_widget_instances ─────────────────────────────────────────
    async listInstances(tenantId, filter) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, tenant_id, instance_key,
              widget_catalog_id::text AS widget_catalog_id,
              dashboard_id::text AS dashboard_id,
              page_layout_id::text AS page_layout_id,
              product_code, module_code, title_key, description_key,
              position_config, size_config,
              data_binding_id::text AS data_binding_id,
              required_permission, is_active
         FROM dos.ui_widget_instances
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR dashboard_id = $2)
          AND ($3::uuid IS NULL OR page_layout_id = $3)
        ORDER BY instance_key`, [tenantId, filter?.dashboardId ?? null, filter?.pageLayoutId ?? null]);
        return rows;
    }
    async getInstance(tenantId, instanceKey) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, tenant_id, instance_key,
              widget_catalog_id::text AS widget_catalog_id,
              dashboard_id::text AS dashboard_id,
              page_layout_id::text AS page_layout_id,
              product_code, module_code, title_key, description_key,
              position_config, size_config,
              data_binding_id::text AS data_binding_id,
              required_permission, is_active
         FROM dos.ui_widget_instances
        WHERE tenant_id = $1 AND instance_key = $2 LIMIT 1`, [tenantId, instanceKey]);
        return rows[0] ?? null;
    }
    async createInstance(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_instances
        (tenant_id, instance_key, widget_catalog_id,
         dashboard_id, page_layout_id, product_code, module_code,
         title_key, description_key, position_config, size_config,
         required_permission, created_by, updated_by)
       VALUES ($1,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,
               $10::jsonb,$11::jsonb,$12,$13,$13)
       RETURNING id::text AS id, tenant_id, instance_key,
                 widget_catalog_id::text AS widget_catalog_id,
                 dashboard_id::text AS dashboard_id,
                 page_layout_id::text AS page_layout_id,
                 product_code, module_code, title_key, description_key,
                 position_config, size_config,
                 data_binding_id::text AS data_binding_id,
                 required_permission, is_active`, [
            tenantId, body.instance_key, body.widget_catalog_id,
            body.dashboard_id ?? null, body.page_layout_id ?? null,
            body.product_code ?? null, body.module_code ?? null,
            body.title_key ?? null, body.description_key ?? null,
            JSON.stringify(body.position_config ?? {}),
            JSON.stringify(body.size_config ?? {}),
            body.required_permission ?? null, userId,
        ]);
        return rows[0];
    }
    async updateInstance(tenantId, instanceKey, userId, patch) {
        const { rows } = await this.pool.query(`UPDATE dos.ui_widget_instances
          SET title_key           = COALESCE($3, title_key),
              description_key     = COALESCE($4, description_key),
              position_config     = COALESCE($5::jsonb, position_config),
              size_config         = COALESCE($6::jsonb, size_config),
              required_permission = COALESCE($7, required_permission),
              is_active           = COALESCE($8, is_active),
              updated_by          = $9,
              updated_at          = NOW()
        WHERE tenant_id = $1 AND instance_key = $2
        RETURNING id::text AS id, tenant_id, instance_key,
                  widget_catalog_id::text AS widget_catalog_id,
                  dashboard_id::text AS dashboard_id,
                  page_layout_id::text AS page_layout_id,
                  product_code, module_code, title_key, description_key,
                  position_config, size_config,
                  data_binding_id::text AS data_binding_id,
                  required_permission, is_active`, [
            tenantId, instanceKey,
            patch.title_key ?? null, patch.description_key ?? null,
            patch.position_config !== undefined ? JSON.stringify(patch.position_config) : null,
            patch.size_config !== undefined ? JSON.stringify(patch.size_config) : null,
            patch.required_permission ?? null, patch.is_active ?? null, userId,
        ]);
        return rows[0] ?? null;
    }
    async deleteInstance(tenantId, instanceKey) {
        const r = await this.pool.query(`DELETE FROM dos.ui_widget_instances
        WHERE tenant_id = $1 AND instance_key = $2`, [tenantId, instanceKey]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── ui_widget_instance_permissions ──────────────────────────────
    async listPermissions(tenantId, instanceId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, permission_code, effect, role_code, user_id, notes, is_active
         FROM dos.ui_widget_instance_permissions
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid
        ORDER BY permission_code`, [tenantId, instanceId]);
        return rows;
    }
    async upsertPermission(tenantId, userId, instanceId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_instance_permissions
        (tenant_id, widget_instance_id, permission_code, effect, role_code, user_id, notes, created_by, updated_by)
       VALUES ($1,$2::uuid,$3,$4::dos.ui_perm_effect_t,$5,$6,$7,$8,$8)
       ON CONFLICT (widget_instance_id, permission_code, role_code, user_id)
       DO UPDATE SET effect = EXCLUDED.effect,
                     notes  = EXCLUDED.notes,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()
       RETURNING id::text AS id, permission_code, effect, role_code, user_id, notes, is_active`, [tenantId, instanceId, body.permission_code, body.effect,
            body.role_code ?? null, body.user_id ?? null, body.notes ?? null, userId]);
        return rows[0];
    }
    async deletePermission(tenantId, permissionId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_widget_instance_permissions
        WHERE tenant_id = $1 AND id = $2::uuid`, [tenantId, permissionId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── ui_widget_instance_role_grants ──────────────────────────────
    async listRoleGrants(tenantId, instanceId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, role_code, granted_at::text AS granted_at
         FROM dos.ui_widget_instance_role_grants
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid
        ORDER BY role_code`, [tenantId, instanceId]);
        return rows;
    }
    async grantRole(tenantId, userId, instanceId, roleCode) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_instance_role_grants
        (tenant_id, widget_instance_id, role_code, granted_by)
       VALUES ($1, $2::uuid, $3, $4)
       ON CONFLICT (widget_instance_id, role_code) DO UPDATE SET granted_by = EXCLUDED.granted_by
       RETURNING id::text AS id, role_code, granted_at::text AS granted_at`, [tenantId, instanceId, roleCode, userId]);
        return rows[0];
    }
    async revokeRole(tenantId, instanceId, roleCode) {
        const r = await this.pool.query(`DELETE FROM dos.ui_widget_instance_role_grants
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid AND role_code = $3`, [tenantId, instanceId, roleCode]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── ui_widget_data_bindings ─────────────────────────────────────
    async getBinding(tenantId, instanceId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, widget_instance_id::text AS widget_instance_id,
              binding_kind::text AS binding_kind,
              endpoint_url, http_method::text AS http_method,
              request_template, response_mapping,
              cache_ttl_seconds, auth_secret_ref, is_active
         FROM dos.ui_widget_data_bindings
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid LIMIT 1`, [tenantId, instanceId]);
        return rows[0] ?? null;
    }
    async upsertBinding(tenantId, userId, instanceId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_data_bindings
        (tenant_id, widget_instance_id, binding_kind, endpoint_url, http_method,
         request_template, response_mapping, cache_ttl_seconds, auth_secret_ref,
         created_by, updated_by)
       VALUES ($1,$2::uuid,$3::dos.ui_widget_binding_kind_t,$4,
               COALESCE($5,'GET')::dos.ui_http_method_t,
               $6::jsonb,$7::jsonb,COALESCE($8,0),$9,$10,$10)
       ON CONFLICT (widget_instance_id) DO UPDATE
         SET binding_kind     = EXCLUDED.binding_kind,
             endpoint_url     = EXCLUDED.endpoint_url,
             http_method      = EXCLUDED.http_method,
             request_template = EXCLUDED.request_template,
             response_mapping = EXCLUDED.response_mapping,
             cache_ttl_seconds= EXCLUDED.cache_ttl_seconds,
             auth_secret_ref  = EXCLUDED.auth_secret_ref,
             updated_by       = EXCLUDED.updated_by,
             updated_at       = NOW()
       RETURNING id::text AS id, widget_instance_id::text AS widget_instance_id,
                 binding_kind::text AS binding_kind,
                 endpoint_url, http_method::text AS http_method,
                 request_template, response_mapping,
                 cache_ttl_seconds, auth_secret_ref, is_active`, [tenantId, instanceId, body.binding_kind, body.endpoint_url ?? null,
            body.http_method ?? null,
            JSON.stringify(body.request_template ?? {}),
            JSON.stringify(body.response_mapping ?? {}),
            body.cache_ttl_seconds ?? null, body.auth_secret_ref ?? null, userId]);
        return rows[0];
    }
    // ── ui_widget_refresh_policies ──────────────────────────────────
    // 6NF — refresh_on_event_codes lives in dos.ui_widget_refresh_policy_events (migration 0133).
    async getRefreshPolicy(tenantId, instanceId) {
        const { rows } = await this.pool.query(`SELECT p.id::text AS id, p.widget_instance_id::text AS widget_instance_id,
              p.interval_seconds,
              COALESCE(
                (SELECT ARRAY_AGG(e.event_code ORDER BY e.event_code)
                   FROM dos.ui_widget_refresh_policy_events e WHERE e.policy_id = p.id),
                ARRAY[]::TEXT[]
              ) AS refresh_on_event_codes,
              p.pause_when_hidden, p.refresh_on_focus, p.is_active
         FROM dos.ui_widget_refresh_policies p
        WHERE p.tenant_id = $1 AND p.widget_instance_id = $2::uuid LIMIT 1`, [tenantId, instanceId]);
        return rows[0] ?? null;
    }
    async upsertRefreshPolicy(tenantId, userId, instanceId, body) {
        const client = await this.pool.connect();
        let policyId;
        try {
            await client.query('BEGIN');
            const ins = await client.query(`INSERT INTO dos.ui_widget_refresh_policies
          (tenant_id, widget_instance_id, interval_seconds,
           pause_when_hidden, refresh_on_focus, created_by, updated_by)
         VALUES ($1,$2::uuid,COALESCE($3,0),
                 COALESCE($4,TRUE),COALESCE($5,TRUE),$6,$6)
         ON CONFLICT (widget_instance_id) DO UPDATE
           SET interval_seconds  = EXCLUDED.interval_seconds,
               pause_when_hidden = EXCLUDED.pause_when_hidden,
               refresh_on_focus  = EXCLUDED.refresh_on_focus,
               updated_by        = EXCLUDED.updated_by,
               updated_at        = NOW()
         RETURNING id::text AS id`, [tenantId, instanceId, body.interval_seconds ?? null,
                body.pause_when_hidden ?? null, body.refresh_on_focus ?? null, userId]);
            policyId = ins.rows[0].id;
            if (body.refresh_on_event_codes !== undefined) {
                await client.query(`DELETE FROM dos.ui_widget_refresh_policy_events WHERE policy_id = $1::uuid`, [policyId]);
                if (body.refresh_on_event_codes.length > 0) {
                    await client.query(`INSERT INTO dos.ui_widget_refresh_policy_events (policy_id, event_code)
             SELECT $1::uuid, UNNEST($2::text[]) ON CONFLICT DO NOTHING`, [policyId, body.refresh_on_event_codes]);
                }
            }
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
        const result = await this.getRefreshPolicy(tenantId, instanceId);
        if (!result)
            throw new Error('refresh_policy_upsert_inconsistency');
        return result;
    }
    // ── ui_widget_error_states ──────────────────────────────────────
    async listErrorStates(tenantId, instanceId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, widget_instance_id::text AS widget_instance_id,
              error_code, fallback_component_key, message_key,
              retry_strategy::text AS retry_strategy,
              retry_max_attempts, is_active
         FROM dos.ui_widget_error_states
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid
        ORDER BY error_code`, [tenantId, instanceId]);
        return rows;
    }
    async upsertErrorState(tenantId, userId, instanceId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_error_states
        (tenant_id, widget_instance_id, error_code, fallback_component_key,
         message_key, retry_strategy, retry_max_attempts, created_by, updated_by)
       VALUES ($1,$2::uuid,$3,$4,$5,
               COALESCE($6,'manual')::dos.ui_retry_strategy_t,
               COALESCE($7,0),$8,$8)
       ON CONFLICT (widget_instance_id, error_code) DO UPDATE
         SET fallback_component_key = EXCLUDED.fallback_component_key,
             message_key            = EXCLUDED.message_key,
             retry_strategy         = EXCLUDED.retry_strategy,
             retry_max_attempts     = EXCLUDED.retry_max_attempts,
             updated_by             = EXCLUDED.updated_by,
             updated_at             = NOW()
       RETURNING id::text AS id, widget_instance_id::text AS widget_instance_id,
                 error_code, fallback_component_key, message_key,
                 retry_strategy::text AS retry_strategy,
                 retry_max_attempts, is_active`, [tenantId, instanceId, body.error_code, body.fallback_component_key ?? null,
            body.message_key ?? null, body.retry_strategy ?? null,
            body.retry_max_attempts ?? null, userId]);
        return rows[0];
    }
    // ── ui_widget_visibility_rules ──────────────────────────────────
    async listVisibilityRules(tenantId, instanceId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, widget_instance_id::text AS widget_instance_id,
              rule_kind::text AS rule_kind,
              rule_payload, effect::text AS effect, priority, is_active
         FROM dos.ui_widget_visibility_rules
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid
        ORDER BY priority`, [tenantId, instanceId]);
        return rows;
    }
    async createVisibilityRule(tenantId, userId, instanceId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_visibility_rules
        (tenant_id, widget_instance_id, rule_kind, rule_payload, effect, priority, created_by, updated_by)
       VALUES ($1,$2::uuid,$3::dos.ui_visibility_rule_kind_t,$4::jsonb,
               COALESCE($5,'show')::dos.ui_visibility_effect_t,
               COALESCE($6,100),$7,$7)
       RETURNING id::text AS id, widget_instance_id::text AS widget_instance_id,
                 rule_kind::text AS rule_kind,
                 rule_payload, effect::text AS effect, priority, is_active`, [tenantId, instanceId, body.rule_kind,
            JSON.stringify(body.rule_payload ?? {}),
            body.effect ?? null, body.priority ?? null, userId]);
        return rows[0];
    }
    async deleteVisibilityRule(tenantId, ruleId) {
        const r = await this.pool.query(`DELETE FROM dos.ui_widget_visibility_rules
        WHERE tenant_id = $1 AND id = $2::uuid`, [tenantId, ruleId]);
        return (r.rowCount ?? 0) > 0;
    }
    // ── ui_widget_personalization ───────────────────────────────────
    async getPersonalization(tenantId, instanceId, userId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, widget_instance_id::text AS widget_instance_id,
              user_id, personalization, is_collapsed, is_pinned,
              display_order, is_active
         FROM dos.ui_widget_personalization
        WHERE tenant_id = $1 AND widget_instance_id = $2::uuid AND user_id = $3 LIMIT 1`, [tenantId, instanceId, userId]);
        return rows[0] ?? null;
    }
    async upsertPersonalization(tenantId, userId, instanceId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_personalization
        (tenant_id, widget_instance_id, user_id, personalization,
         is_collapsed, is_pinned, display_order)
       VALUES ($1,$2::uuid,$3,$4::jsonb,
               COALESCE($5,FALSE),COALESCE($6,FALSE),$7)
       ON CONFLICT (widget_instance_id, user_id) DO UPDATE
         SET personalization = EXCLUDED.personalization,
             is_collapsed    = EXCLUDED.is_collapsed,
             is_pinned       = EXCLUDED.is_pinned,
             display_order   = EXCLUDED.display_order,
             updated_at      = NOW()
       RETURNING id::text AS id, widget_instance_id::text AS widget_instance_id,
                 user_id, personalization, is_collapsed, is_pinned,
                 display_order, is_active`, [tenantId, instanceId, userId,
            JSON.stringify(body.personalization ?? {}),
            body.is_collapsed ?? null, body.is_pinned ?? null,
            body.display_order ?? null]);
        return rows[0];
    }
    // ── ui_widget_catalog_categories ────────────────────────────────
    async listCategories(tenantId) {
        const { rows } = await this.pool.query(`SELECT id::text AS id, category_code,
              parent_category_id::text AS parent_category_id,
              display_name_key, description_key, display_order,
              icon_key, is_active
         FROM dos.ui_widget_catalog_categories
        WHERE tenant_id = $1
        ORDER BY display_order, category_code`, [tenantId]);
        return rows;
    }
    async upsertCategory(tenantId, userId, body) {
        const { rows } = await this.pool.query(`INSERT INTO dos.ui_widget_catalog_categories
        (tenant_id, category_code, parent_category_id,
         display_name_key, description_key, display_order, icon_key,
         created_by, updated_by)
       VALUES ($1,$2,$3::uuid,$4,$5,COALESCE($6,0),$7,$8,$8)
       ON CONFLICT (tenant_id, category_code) DO UPDATE
         SET parent_category_id = EXCLUDED.parent_category_id,
             display_name_key   = EXCLUDED.display_name_key,
             description_key    = EXCLUDED.description_key,
             display_order      = EXCLUDED.display_order,
             icon_key           = EXCLUDED.icon_key,
             updated_by         = EXCLUDED.updated_by,
             updated_at         = NOW()
       RETURNING id::text AS id, category_code,
                 parent_category_id::text AS parent_category_id,
                 display_name_key, description_key, display_order,
                 icon_key, is_active`, [tenantId, body.category_code, body.parent_category_id ?? null,
            body.display_name_key ?? null, body.description_key ?? null,
            body.display_order ?? null, body.icon_key ?? null, userId]);
        return rows[0];
    }
    async deleteCategory(tenantId, categoryCode) {
        const r = await this.pool.query(`DELETE FROM dos.ui_widget_catalog_categories
        WHERE tenant_id = $1 AND category_code = $2`, [tenantId, categoryCode]);
        return (r.rowCount ?? 0) > 0;
    }
}
//# sourceMappingURL=ui-os-widget-ext.manager.js.map