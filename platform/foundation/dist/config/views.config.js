"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_DEFAULT_VIEWS = void 0;
exports.FOUNDATION_DEFAULT_VIEWS = {
    organization: [
        { key: 'all-active', i18nKey: 'foundation.views.allActive', isDefault: true, filters: { status: 'active' } },
        { key: 'in-review', i18nKey: 'foundation.views.inReview', filters: { status: 'in_review' } },
        { key: 'archived', i18nKey: 'foundation.views.archived', filters: { status: 'archived' } },
    ],
    'business-units': [
        { key: 'all-active', i18nKey: 'foundation.views.allActive', isDefault: true, filters: { status: 'active' } },
    ],
};
//# sourceMappingURL=views.config.js.map