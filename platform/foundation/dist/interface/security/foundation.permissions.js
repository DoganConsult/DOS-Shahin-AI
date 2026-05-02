"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_MODULE_PERMISSIONS = void 0;
exports.FOUNDATION_MODULE_PERMISSIONS = [
    { permissionCode: 'foundation.read', resourceType: 'record', actionType: 'read', descriptionEn: 'Read foundation records', descriptionAr: 'قراءة سجلات الأساس', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'foundation.record.write', resourceType: 'record', actionType: 'write', descriptionEn: 'Write foundation records', descriptionAr: 'كتابة سجلات الأساس', sensitive: false, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'foundation.record.delete', resourceType: 'record', actionType: 'delete', descriptionEn: 'Delete foundation records', descriptionAr: 'حذف سجلات الأساس', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'foundation.record.approve', resourceType: 'record', actionType: 'approve', descriptionEn: 'Approve foundation changes', descriptionAr: 'اعتماد تغييرات الأساس', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
    { permissionCode: 'foundation.manage', resourceType: 'system', actionType: 'manage', descriptionEn: 'Manage foundation configuration', descriptionAr: 'إدارة تكوين الأساس', sensitive: true, fieldLevel: false, aiOnly: false, externalParty: false, deprecated: false, legacyAliases: [] },
];
//# sourceMappingURL=foundation.permissions.js.map