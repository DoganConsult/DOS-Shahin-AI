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
                "permission": "foundation.read"
            },
            {
                "id": "foundation.organization",
                "labelKey": "modules.foundation.nav.organization",
                "route": "/foundation/organization",
                "icon": "sitemap",
                "order": 20,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.business-units",
                "labelKey": "modules.foundation.nav.businessUnits",
                "route": "/foundation/business-units",
                "icon": "building",
                "order": 30,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.departments",
                "labelKey": "modules.foundation.nav.departments",
                "route": "/foundation/departments",
                "icon": "users",
                "order": 40,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.users",
                "labelKey": "modules.foundation.nav.users",
                "route": "/foundation/users",
                "icon": "user",
                "order": 50,
                "permission": "foundation.user.read"
            },
            {
                "id": "foundation.roles",
                "labelKey": "modules.foundation.nav.roles",
                "route": "/foundation/roles",
                "icon": "key",
                "order": 60,
                "permission": "foundation.admin.read"
            },
            {
                "id": "foundation.teams",
                "labelKey": "modules.foundation.nav.teams",
                "route": "/foundation/teams",
                "icon": "users-group",
                "order": 70,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.locations",
                "labelKey": "modules.foundation.nav.locations",
                "route": "/foundation/locations",
                "icon": "map-pin",
                "order": 80,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.positions",
                "labelKey": "modules.foundation.nav.positions",
                "route": "/foundation/positions",
                "icon": "id-card",
                "order": 90,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.committees",
                "labelKey": "modules.foundation.nav.committees",
                "route": "/foundation/committees",
                "icon": "gavel",
                "order": 100,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.delegations",
                "labelKey": "modules.foundation.nav.delegations",
                "route": "/foundation/delegations",
                "icon": "share",
                "order": 110,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.ownership-mapping",
                "labelKey": "modules.foundation.nav.ownershipMapping",
                "route": "/foundation/ownership-mapping",
                "icon": "link",
                "order": 120,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.access-review",
                "labelKey": "modules.foundation.nav.accessReview",
                "route": "/foundation/access-review",
                "icon": "shield-check",
                "order": 130,
                "permission": "access_review:create"
            },
            {
                "id": "foundation.policies",
                "labelKey": "modules.foundation.nav.policies",
                "route": "/foundation/policies",
                "icon": "file-shield",
                "order": 140,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.data-processing",
                "labelKey": "modules.foundation.nav.dataProcessing",
                "route": "/foundation/data-processing",
                "icon": "database",
                "order": 150,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.reference-data",
                "labelKey": "modules.foundation.nav.referenceData",
                "route": "/foundation/reference-data",
                "icon": "list",
                "order": 160,
                "permission": "foundation.read"
            },
            {
                "id": "foundation.audit",
                "labelKey": "modules.foundation.nav.audit",
                "route": "/foundation/audit",
                "icon": "history",
                "order": 170,
                "permission": "audit_trail.read"
            },
            {
                "id": "foundation.settings",
                "labelKey": "modules.foundation.nav.settings",
                "route": "/foundation/settings",
                "icon": "settings",
                "order": 180,
                "permission": "foundation.admin.read"
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
                    "foundation.locations"
                ],
                "order": 10
            },
            {
                "id": "foundation.group.identity",
                "labelKey": "modules.foundation.nav.group.identity",
                "items": [
                    "foundation.users",
                    "foundation.teams",
                    "foundation.roles"
                ],
                "order": 20
            },
            {
                "id": "foundation.group.governance",
                "labelKey": "modules.foundation.nav.group.governance",
                "items": [
                    "foundation.committees",
                    "foundation.delegations",
                    "foundation.ownership-mapping",
                    "foundation.access-review",
                    "foundation.policies",
                    "foundation.data-processing",
                    "foundation.reference-data",
                    "foundation.audit",
                    "foundation.settings"
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