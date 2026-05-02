"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_DEFAULT_VIEWS = void 0;
exports.FOUNDATION_DEFAULT_VIEWS = {
    organization: [
        { key: 'all-active', labelKey: 'foundation.views.allActive', isDefault: true, filters: { status: 'active' } },
        { key: 'in-review', labelKey: 'foundation.views.inReview', filters: { status: 'in_review' } },
        { key: 'archived', labelKey: 'foundation.views.archived', filters: { status: 'archived' } },
    ],
    'business-units': [
        { key: 'all-active', labelKey: 'foundation.views.allActive', isDefault: true, filters: { status: 'active' } },
    ],
};
//# sourceMappingURL=views.config.js.map