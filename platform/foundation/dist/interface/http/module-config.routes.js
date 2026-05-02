"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moduleConfigRouter = void 0;
/**
 * Foundation module-config runtime endpoint.
 *
 * Serves the static config bundles defined under `modules/foundation/config/*`
 * so the frontend can resolve list/detail/form/views/filters dynamically
 * without hardcoded component assumptions.
 *
 * Mounted by the Foundation aggregator under:
 *   GET /api/foundation/module-config/list/:variant?
 *   GET /api/foundation/module-config/detail/:variant?
 *   GET /api/foundation/module-config/form/:variant?
 *   GET /api/foundation/module-config/views/:variant?
 *   GET /api/foundation/module-config/filters
 *   GET /api/foundation/module-config            (full bundle)
 *
 * The platform-wide `/api/module-config/foundation/...` proxy lives in
 * tenant-service; both paths converge on the same source of truth.
 */
const express_1 = require("express");
const auth_port_1 = require("../../ports/auth.port");
const list_config_1 = require("../../config/list.config");
const detail_config_1 = require("../../config/detail.config");
const form_config_1 = require("../../config/form.config");
const views_config_1 = require("../../config/views.config");
const filters_config_1 = require("../../config/filters.config");
const router = (0, express_1.Router)();
exports.moduleConfigRouter = router;
router.use(auth_port_1.authenticate);
router.use((0, auth_port_1.requirePermission)('foundation.read'));
function resolve(map, variant, res) {
    if (!variant)
        return undefined;
    const value = map[variant];
    if (!value) {
        res.status(404).json({
            success: false,
            error: 'Unknown variant',
            variant,
            allowed: Object.keys(map),
        });
        return undefined;
    }
    return value;
}
router.get('/', (_req, res) => {
    res.json({
        success: true,
        data: {
            list: list_config_1.FOUNDATION_LIST_CONFIGS,
            detail: detail_config_1.FOUNDATION_DETAIL_CONFIGS,
            form: form_config_1.FOUNDATION_FORM_CONFIGS,
            views: views_config_1.FOUNDATION_DEFAULT_VIEWS,
            filters: {
                status: filters_config_1.FOUNDATION_STATUS_FILTER_OPTIONS,
                entityType: filters_config_1.FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS,
                permissions: filters_config_1.FOUNDATION_PERMISSION_FILTER_VALUES,
            },
        },
    });
});
router.get('/list/:variant?', (req, res) => {
    if (!req.params.variant) {
        res.json({ success: true, data: list_config_1.FOUNDATION_LIST_CONFIGS });
        return;
    }
    const cfg = resolve(list_config_1.FOUNDATION_LIST_CONFIGS, req.params.variant, res);
    if (cfg)
        res.json({ success: true, data: cfg });
});
router.get('/detail/:variant?', (req, res) => {
    if (!req.params.variant) {
        res.json({ success: true, data: detail_config_1.FOUNDATION_DETAIL_CONFIGS });
        return;
    }
    const cfg = resolve(detail_config_1.FOUNDATION_DETAIL_CONFIGS, req.params.variant, res);
    if (cfg)
        res.json({ success: true, data: cfg });
});
router.get('/form/:variant?', (req, res) => {
    if (!req.params.variant) {
        res.json({ success: true, data: form_config_1.FOUNDATION_FORM_CONFIGS });
        return;
    }
    const cfg = resolve(form_config_1.FOUNDATION_FORM_CONFIGS, req.params.variant, res);
    if (cfg)
        res.json({ success: true, data: cfg });
});
router.get('/views/:variant?', (req, res) => {
    if (!req.params.variant) {
        res.json({ success: true, data: views_config_1.FOUNDATION_DEFAULT_VIEWS });
        return;
    }
    const cfg = resolve(views_config_1.FOUNDATION_DEFAULT_VIEWS, req.params.variant, res);
    if (cfg)
        res.json({ success: true, data: cfg });
});
router.get('/filters', (_req, res) => {
    res.json({
        success: true,
        data: {
            status: filters_config_1.FOUNDATION_STATUS_FILTER_OPTIONS,
            entityType: filters_config_1.FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS,
            permissions: filters_config_1.FOUNDATION_PERMISSION_FILTER_VALUES,
        },
    });
});
exports.default = router;
//# sourceMappingURL=module-config.routes.js.map