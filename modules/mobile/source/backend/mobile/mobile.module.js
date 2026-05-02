"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOBILE_MANIFEST = void 0;
const module_sdk_1 = require("@dos/module-sdk");
exports.MOBILE_MANIFEST = {
    code: 'mobile',
    version: '1.0.0',
    aliases: [],
    nameEn: 'Mobile Platform',
    nameAr: 'منصة الجوال',
    descriptionEn: 'Mobile device registration, push notification management, offline sync, and biometric authentication bridge.',
    descriptionAr: 'تسجيل أجهزة الجوال وإدارة الإشعارات ومزامنة البيانات والمصادقة البيومترية.',
    tier: 'technical-support',
    category: 'platform',
    routeBase: '/api/mobile',
    eventNamespace: 'mobile',
    tablePrefix: 'mobile_',
    ownedTables: ['mobile_devices', 'mobile_push_tokens', 'mobile_sync_queue'],
    sharedTables: [],
    referencedTables: ['users'],
    aggregateRoots: ['mobile_devices'],
    publishedEvents: ['mobile.device_registered', 'mobile.device_deregistered', 'mobile.sync_completed'],
    consumedEvents: ['notification.push_requested'],
    hardDeps: ['foundation'],
    softDeps: ['notification', 'inbox'],
    navId: 'mobile',
    navChildCount: 2,
    workflowTemplateCode: null,
    workflowSlaHours: null,
    automationLevel: 'full',
    agentBinding: null,
    aiCapabilities: [],
    aiEnabled: false,
    featureFlags: ['mobile.offline_sync', 'mobile.biometric_auth'],
    installable: true,
    provisioningOrder: 92,
    licensingTier: 'professional',
    visibility: 'internal',
    adminSurfaces: ['mobile-config'],
    securityPermissions: [
        { permissionCode: 'mobile.read', resourceType: 'device', actionType: 'read', descriptionEn: 'View mobile devices', descriptionAr: 'عرض أجهزة الجوال', sensitive: false },
        { permissionCode: 'mobile.manage', resourceType: 'device', actionType: 'manage', descriptionEn: 'Manage devices and tokens', descriptionAr: 'إدارة الأجهزة والرموز', sensitive: false }
    ],
    securityRoles: [
        { roleCode: 'mobile.user', archetype: 'viewer', nameEn: 'Mobile User', nameAr: 'مستخدم الجوال', isDefault: true, isSystem: true, isGlobal: false, permissions: ['mobile.read'] },
        { roleCode: 'mobile.admin', archetype: 'module_lead', nameEn: 'Mobile Admin', nameAr: 'مسؤول الجوال', isDefault: false, isSystem: true, isGlobal: false, permissions: ['mobile.read', 'mobile.manage'] }
    ],
    securityActions: [],
    approvalRules: [],
    ownershipRules: [],
    sodRules: []
};
(0, module_sdk_1.registerModule)(exports.MOBILE_MANIFEST);
//# sourceMappingURL=mobile.module.js.map