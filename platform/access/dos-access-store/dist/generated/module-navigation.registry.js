// AUTO-GENERATED — do not edit. Regenerate via `pnpm modulenav:codegen:write`.
// Source: scripts/codegen/module-navigation-registry.mjs
// Inputs:
//   platform/foundation/contracts/navigation/navigation.json
export const MODULE_NAVIGATION_REGISTRY = Object.freeze({
    "foundation": {
        "schemaVersion": 1,
        "moduleCode": "foundation",
        "items": [
            {
                "id": "foundation.overview",
                "labelKey": "modules.foundation.nav.overview",
                "route": "/foundation/overview",
                "icon": "layout-dashboard",
                "order": 10,
                "permission": "foundation.module.read"
            },
            {
                "id": "foundation.organization",
                "labelKey": "modules.foundation.nav.organization",
                "route": "/foundation/organization",
                "icon": "sitemap",
                "order": 20,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.business-units",
                "labelKey": "modules.foundation.nav.businessUnits",
                "route": "/foundation/business-units",
                "icon": "briefcase",
                "order": 30,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.departments",
                "labelKey": "modules.foundation.nav.departments",
                "route": "/foundation/departments",
                "icon": "building-community",
                "order": 40,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.positions",
                "labelKey": "modules.foundation.nav.positions",
                "route": "/foundation/positions",
                "icon": "badge",
                "order": 50,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.locations",
                "labelKey": "modules.foundation.nav.locations",
                "route": "/foundation/locations",
                "icon": "map-pin",
                "order": 60,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.users",
                "labelKey": "modules.foundation.nav.users",
                "route": "/foundation/users",
                "icon": "users",
                "order": 70,
                "permission": "foundation.user.read"
            },
            {
                "id": "foundation.teams",
                "labelKey": "modules.foundation.nav.teams",
                "route": "/foundation/teams",
                "icon": "users-group",
                "order": 80,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.roles",
                "labelKey": "modules.foundation.nav.roles",
                "route": "/foundation/roles",
                "icon": "shield",
                "order": 90,
                "permission": "foundation.rbac.read"
            },
            {
                "id": "foundation.permissions",
                "labelKey": "modules.foundation.nav.permissions",
                "route": "/foundation/permissions",
                "icon": "key",
                "order": 100,
                "permission": "foundation.rbac.read"
            },
            {
                "id": "foundation.committees",
                "labelKey": "modules.foundation.nav.committees",
                "route": "/foundation/committees",
                "icon": "assembly",
                "order": 110,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.delegations",
                "labelKey": "modules.foundation.nav.delegations",
                "route": "/foundation/delegations",
                "icon": "share",
                "order": 120,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.access-review",
                "labelKey": "modules.foundation.nav.accessReview",
                "route": "/foundation/access-review",
                "icon": "checklist",
                "order": 130,
                "permission": "foundation.review.read"
            },
            {
                "id": "foundation.policies",
                "labelKey": "modules.foundation.nav.policies",
                "route": "/foundation/policies",
                "icon": "book",
                "order": 140,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.audit",
                "labelKey": "modules.foundation.nav.audit",
                "route": "/foundation/audit",
                "icon": "history",
                "order": 150,
                "permission": "foundation.audit.read"
            },
            {
                "id": "foundation.ownership",
                "labelKey": "modules.foundation.nav.ownership",
                "route": "/foundation/ownership",
                "icon": "chart-arcs",
                "order": 160,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.sod",
                "labelKey": "modules.foundation.nav.sod",
                "route": "/foundation/sod",
                "icon": "shield-lock",
                "order": 170,
                "permission": "foundation.sod.write"
            },
            {
                "id": "foundation.hierarchy-viz",
                "labelKey": "modules.foundation.nav.hierarchyViz",
                "route": "/foundation/hierarchy-viz",
                "icon": "binary-tree",
                "order": 180,
                "permission": "foundation.hierarchy.read"
            },
            {
                "id": "foundation.user-lifecycle",
                "labelKey": "modules.foundation.nav.userLifecycle",
                "route": "/foundation/user-lifecycle",
                "icon": "arrow-cycle",
                "order": 190,
                "permission": "foundation.user.write"
            },
            {
                "id": "foundation.reference-data",
                "labelKey": "modules.foundation.nav.referenceData",
                "route": "/foundation/reference-data",
                "icon": "database",
                "order": 200,
                "permission": "foundation.data.read"
            },
            {
                "id": "foundation.diagnostics",
                "labelKey": "modules.foundation.nav.diagnostics",
                "route": "/foundation/diagnostics",
                "icon": "stethoscope",
                "order": 210,
                "permission": "foundation.module.read"
            }
        ],
        "groups": [
            {
                "id": "foundation.group.organization",
                "labelKey": "modules.foundation.nav.group.organization",
                "items": [
                    "foundation.overview",
                    "foundation.organization",
                    "foundation.business-units",
                    "foundation.departments",
                    "foundation.positions",
                    "foundation.locations",
                    "foundation.hierarchy-viz"
                ],
                "order": 10
            },
            {
                "id": "foundation.group.identity",
                "labelKey": "modules.foundation.nav.group.identity",
                "items": [
                    "foundation.users",
                    "foundation.teams",
                    "foundation.roles",
                    "foundation.permissions",
                    "foundation.user-lifecycle"
                ],
                "order": 20
            },
            {
                "id": "foundation.group.governance",
                "labelKey": "modules.foundation.nav.group.governance",
                "items": [
                    "foundation.committees",
                    "foundation.delegations",
                    "foundation.access-review",
                    "foundation.policies",
                    "foundation.audit",
                    "foundation.ownership",
                    "foundation.sod",
                    "foundation.reference-data",
                    "foundation.diagnostics"
                ],
                "order": 30
            }
        ]
    },
});
export function getModuleNavContract(moduleCode) {
    return MODULE_NAVIGATION_REGISTRY[moduleCode];
}
export function listRegisteredModuleNav() {
    return Object.keys(MODULE_NAVIGATION_REGISTRY).sort();
}
//# sourceMappingURL=module-navigation.registry.js.map