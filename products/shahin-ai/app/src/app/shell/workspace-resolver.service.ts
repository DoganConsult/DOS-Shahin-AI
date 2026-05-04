/**
 * WorkspaceResolverService — F.3 STUB
 *
 * Implements `DynamicUiResolverPort` from @dos/ui-contracts. Today this
 * service returns a HARDCODED composed payload built from the same
 * AccessStore signals + i18n bundles that the workspace-home component
 * was reading directly. The FE refactor (F.4) consumes this port instead
 * of inline state — so when the platform-side dynamic-ui-service lands
 * (with real DB reads against the F.1+F.2 draft tables), only this
 * service's body changes.
 *
 * Stub policy:
 *   - i18n strings come from local EN/AR maps below (mirror what was
 *     in workspace-home / tenant-settings before F.4 cutover)
 *   - status pill labels come from a local label map (mirrors the
 *     dos.entity_status_labels migration row-set)
 *   - setup-step "done" evaluation runs in-process against AccessStore
 *   - quick-actions and AI tips are hardcoded but pre-shaped to match
 *     ResolvedQuickAction / ResolvedAiTip
 *
 * The instant the resolver moves backend-side, this file becomes a thin
 * `httpClient.get('/api/ui/resolve?route=...').pipe(...)` wrapper.
 */
import { Injectable, computed, inject, signal, untracked } from '@angular/core';

import {
  AccessStore,
  WorkspaceNavigationAdapter,
  type WorkspaceNavLabelResolver,
} from '@dos/access-store';
import type {
  DynamicUiResolverPort,
  ResolvedWorkspaceSurface,
  ResolvedTenantSettingsSurface,
  ResolvedTenantSettingsSection,
  ResolvedNavItem,
  ResolvedString,
  ResolvedKpi,
  ResolvedSetupStep,
  ResolvedAiTip,
  ResolvedQuickAction,
  ResolvedTrialBanner,
  ResolvedHealthProbe,
  ResolvedModuleRow,
  ResolvedGridColumn,
  ResolvedWidgetFrame,
  ResolvedStateContent,
  ResolvedStatusPill,
  ResolvedPageHeader,
  ResolvedRouteContract,
  ResolvedPageAction,
  ResolvedModuleStyleTokens,
  ResolvedRealtimeChannel,
  AiTrustLayer,
  DosPageType,
  DosLayoutKind,
  DosKpiScope,
  DosUiTone,
  DosLocale,
} from '@dos/ui-contracts';

import productManifest from '../../../../product.manifest.json';
// Foundation UI contract — single source for route page-experience fields.
// The cornerstone consumes this directly; eventually the resolver will
// fetch /api/dynamic-ui/contract/foundation and this static import goes
// away. Either way the contract shape is the contract.
import foundationUiContract from '../../../../../../platform/foundation/contracts/ui.contract.json';
// Note: this service intentionally does NOT inject WorkspaceShellConfigService
// to avoid the NG0200 circular DI loop (shell-config now consumes this
// resolver). Locale/direction are read inline from <html>.

interface ContractRouteEntry {
  route: string;
  pageType: 'overview' | 'list' | 'object' | 'workflow' | 'analytics' | 'audit' | 'settings' | 'report';
  layout: string;
  kpiScope: 'module-overview' | 'page-local' | 'none';
  userIntent?: string;
  titleKey: string;
  subtitleKey?: string;
  signatureWidget?: string;
  dataResourceKey?: string;
  auditEnabled?: boolean;
  realtimeEnabled?: boolean;
  emptyStateKey?: string;
  errorStateKey?: string;
  helpKey?: string;
  visibleWhenProfile?: string[];
  visibleWhenPerm?: string[];
  agentExperienceMode?: string;
  primaryAgentId?: string;
}

interface ManifestEnabledModule {
  moduleCode: string;
  displayName?: string;
  description?: string;
}

/** Minimal HTML escape — only used inside `<bdi>` wrap of user name. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ────────────────────────────────────────────────────────────────────
// i18n bundles — backfill source for dos.i18n_translations seed
// ────────────────────────────────────────────────────────────────────
const I18N: Record<DosLocale, Record<string, string>> = {
  en: {
    // workspace.*
    'workspace.eyebrow':            'workspace',
    'workspace.title':              'Command center',
    'workspace.welcome':            'Welcome',
    'workspace.kpi.tenant':         'Tenant',
    'workspace.kpi.status':         'Status',
    'workspace.kpi.role':           'Your role',
    'workspace.kpi.modules':        'Modules entitled',
    'workspace.section.setup':      'Setup progress',
    'workspace.section.setup.sub':  'Activate your workspace step by step.',
    'workspace.section.tasks':      'My tasks',
    'workspace.section.approvals':  'My approvals',
    'workspace.section.activity':   'Recent activity',
    'workspace.section.modules':    'Module launcher',
    'workspace.section.modules.sub':'Open any entitled module.',
    'workspace.section.actions':    'Quick actions',
    'workspace.section.ai':         'AI recommendations',
    'workspace.section.ai.sub':     'What we suggest you do next.',
    'workspace.section.copilot':    'AI Copilot',
    'workspace.section.copilot.sub':'Ask, search, create, navigate. Hit ⌘K anywhere.',
    'workspace.section.health':     'System readiness',
    'workspace.health.adminonly':   'Admin-only readiness probe.',
    'workspace.health.online':      'online',
    'workspace.health.offline':     'pending',
    'workspace.health.dna':         'DNA modules',
    'workspace.health.entitled':    'Entitled modules',
    'workspace.health.openfga':     'Authorization seed',
    'workspace.health.trial':       'Trial status',
    'workspace.search.placeholder': 'Filter modules…',
    'workspace.col.module':         'Module',
    'workspace.col.code':           'Code',
    'workspace.col.description':    'Description',
    'workspace.col.status':         'Status',
    'workspace.empty.modules.title':       'No modules entitled yet',
    'workspace.empty.modules.description': 'Modules become visible here as their backends come online and entitlement is granted.',
    'workspace.empty.tasks.title':         'No tasks assigned to you yet.',
    'workspace.empty.approvals.title':     'No approvals waiting on you.',
    'workspace.empty.activity.title':      'No activity recorded yet.',
    'workspace.loading':            'Loading your workspace…',
    'workspace.no_session':         'Could not load your workspace identity. Sign in again.',
    'workspace.action.open':        'Open',
    'workspace.action.view_all':    'View all',
    'workspace.action.ask_ai':      'Ask AI',
    'workspace.action.account':       'Account',
    'workspace.action.account.title': 'Profile',
    'workspace.action.account.desc':  'Identity, role, permissions, sessions, MFA.',
    'workspace.action.workspace':       'Workspace',
    'workspace.action.workspace.title': 'Tenant profile',
    'workspace.action.workspace.desc':  'Tenant identity, modules and defaults.',
    'workspace.action.prefs':         'Preferences',
    'workspace.action.prefs.title':   'Settings',
    'workspace.action.prefs.desc':    'Language, timezone, notifications and session.',
    'workspace.action.admin':         'Administration',
    'workspace.action.admin.title':   'Tenant settings',
    'workspace.action.admin.desc':    'Workspace configuration, SSO, modules, billing.',
    'workspace.action.invite':        'Team',
    'workspace.action.invite.title':  'Invite users',
    'workspace.action.invite.desc':   'Add teammates and assign roles.',
    'workspace.action.copilot':       'Copilot',
    'workspace.action.copilot.title': 'Ask AI',
    'workspace.action.copilot.desc':  'Open the workspace assistant.',
    'workspace.setup.profile':      'Complete your profile',
    'workspace.setup.tenant':       'Confirm tenant identity',
    'workspace.setup.modules':      'Activate at least one module',
    'workspace.setup.team':         'Invite your team',
    'workspace.progress.complete':  'complete',
    'workspace.ai.setup.title':     'Finish setup first',
    'workspace.ai.setup.body':      'Complete the setup checklist to unlock activity, approvals, and AI insights.',
    'workspace.ai.module.title':    'Open Foundation',
    'workspace.ai.module.body':     'Foundation is platform DNA. Confirm org, identity and lifecycle to enable everything else.',
    'workspace.ai.invite.title':    'Invite teammates',
    'workspace.ai.invite.body':     'Approvals, RACI and SoD only become useful with at least 2 active members.',
    // status.tenant.*
    'status.tenant.active':         'Active',
    'status.tenant.platform_dna':   'Platform DNA',
    'status.tenant.trial_expired':  'Trial expired',
    'status.tenant.suspended':      'Suspended',
    // role.*
    'role.owner':                   'Owner',
    'role.tenant_owner':            'Tenant owner',
    'role.tenant_admin':            'Administrator',
    'role.member':                  'Member',
    // tenant-settings.*
    'tenant_settings.eyebrow':      'administration',
    'tenant_settings.title':        'Tenant Settings',
    'tenant_settings.subtitle':     'Workspace-wide configuration. Tenant owner / admin only.',
    'tenant_settings.service.title':   'Service status',
    'tenant_settings.service.message': 'Tenant configuration service is not yet wired. Section surface below is locked to admins; sections will activate as their APIs come online.',
    'tenant_settings.service.cta':     'View read-only tenant profile →',
    'tenant_settings.section.workspace':       'Workspace',
    'tenant_settings.section.workspace.desc':  'Display name, hosts, timezone, default locale, brand colors.',
    'tenant_settings.section.entitlements':      'Modules & Entitlements',
    'tenant_settings.section.entitlements.desc': 'Which modules are enabled for this tenant; plan tier; seat counts.',
    'tenant_settings.section.sso':           'SSO & Identity Provider',
    'tenant_settings.section.sso.desc':      'Keycloak realm binding, IdP claims mapping, MFA policy.',
    'tenant_settings.section.email':         'Email & Integrations',
    'tenant_settings.section.email.desc':    'Outbound SMTP, transactional sender, integration webhooks.',
    'tenant_settings.section.risk':          'Risk Model',
    'tenant_settings.section.risk.desc':     'Heatmap dimensions, scoring weights, treatment thresholds.',
    'tenant_settings.section.raci':          'RACI & Authority Matrix',
    'tenant_settings.section.raci.desc':     'Default RACI assignments, owner approvers, segregation-of-duty.',
    'tenant_settings.section.cadence':       'Cadence Overrides',
    'tenant_settings.section.cadence.desc':  'Review cycles, attestation calendars, evidence schedules.',
    'tenant_settings.section.history':       'Configuration History',
    'tenant_settings.section.history.desc':  'Audit trail of tenant-config changes (who, when, what).',
    'tenant_settings.eyebrow.placeholder':   'PLACEHOLDER',
    'tenant_settings.eyebrow.coming_soon':   'COMING SOON',
    'tenant_settings.eyebrow.live':          'LIVE',
    'tenant_settings.cta.open':              'Open',
    'tenant_settings.cta.locked':            'Locked',
    // common
    'common.action.retry':          'Retry',
    'common.action.dismiss':        'Dismiss',
    // ── Workspace shell chrome (header + account menu + nav aria) ────
    'shell.brand.fallback':         'Workspace',
    'shell.tenant.prefix':          'Tenant: ',
    'shell.account.aria':           'Account',
    'shell.account.fallback':       'Account',
    'shell.signout':                'Sign out',
    'shell.search.aria':            'Search',
    'shell.language.aria':          'Language',
    'shell.notifications.aria':     'Notifications',
    'shell.help.aria':              'Help',
    'shell.theme.aria':             'Theme',
    'shell.nav.aria':               'Workspace navigation',
    'shell.account.menu.profile':         'Profile',
    'shell.account.menu.settings':        'Settings',
    'shell.account.menu.tenant_profile':  'Tenant profile',
    'shell.account.menu.tenant_settings': 'Tenant settings',
    'shell.account.menu.logout':          'Sign out',
    // Carbon ShellHost cds-header / sidenav (keep copy out of platform/core shell)
    'shell.header.brand':                   'Shahin-AI+',
    'shell.header.workspace_title':        'Workspace',
    'shell.header.home_route':              '/workspace-home',
    'shell.header.account_action':          'Account',
    'shell.header.hide_navigation':         'Hide navigation',
    'shell.header.show_navigation':         'Show navigation',
    'shell.header.expand_sidebar':          'Expand sidebar',
    'shell.header.collapse_to_rail':        'Collapse to rail',
    'shell.breadcrumb.aria':                'Breadcrumb',
    'shell.skeleton.loading_page':          'Loading page',
    'shell.drawer.title':                   'Navigation',
    'shell.drawer.close':                   'Close',
    'shell.mobile_bottom_nav.aria':         'Bottom navigation',
    'shell.sidenav.aria_label':             'Workspace side navigation',
    'shell.account.initial_fallback':      'U',
    'shell.nav.disabled.coming_soon':       'Coming soon',
    'shell.nav.disabled.route_not_wired':   'Not yet available',
    'shell.nav.disabled.backend_offline':   'Service offline',
    'shell.nav.disabled.missing_permission':'Access restricted',
    'shell.nav.disabled.not_entitled':      'Not in your plan',
    'shell.nav.disabled.trial_expired':     'Trial expired',
    'shell.nav.disabled.trial_limit_reached':'Trial limit reached',
    // Group icons (token IDs consumed by dos-icon).
    'shell.group.icon.workspace':           'home',
    'shell.group.icon.core':                'layout-dashboard',
    'shell.group.icon.foundation':          'building',
    'shell.group.icon.config-center':       'settings',
    'shell.group.icon.compliance':          'shield-check',
    'shell.group.icon.risk':                'alert-triangle',
    'shell.group.icon.dauth':               'user-check',
    'shell.group.icon.access':              'key',
    'shell.group.icon.dnoc':                'globe',
    'shell.group.icon.dsoc':                'shield',
    'shell.group.icon.ai-platform':         'cpu',
    'shell.group.icon.dos-platform':        'layers',
    'shell.group.icon.runtime':             'play',
    'shell.group.icon.ui-system':           'grid',
    'shell.group.icon.tenant-management':   'users',
    'shell.group.icon.multi-tenant-mgmt':   'users',
    'shell.group.icon.foundation-admin':    'tool',
    'shell.group.icon.modules':             'package',
    'shell.group.icon.misc':                'more-horizontal',
    // Global action surfaces — command-search / inbox-center / quick-create
    'shell.command.aria':                   'Command search',
    'shell.command.placeholder':            'Search routes, records, actions…',
    'shell.command.empty':                  'Type to search.',
    'shell.inbox.title':                    'Inbox',
    'shell.inbox.aria':                     'Inbox center',
    'shell.inbox.empty':                    'No messages.',
    'shell.inbox.toggle':                   'Open inbox',
    'shell.quick.aria':                     'Quick create',
    'shell.quick.fab_glyph':                '+',
    // §B.9 — shell chrome keys for GAP items (#7/#8/#16/#25/#33/#36/#37/#38)
    'shell.a11y.skip_to_main':              'Skip to main content',
    'shell.header.help':                    'Help',
    'shell.error.dismiss':                  'Dismiss',
    'shell.sidebar.search_placeholder':     'Filter navigation…',
    'shell.account.menu.switch_to_english': 'English',
    'shell.account.menu.switch_to_arabic':  'العربية',
    'shell.account.menu.light_theme':       'Light Theme',
    'shell.account.menu.dark_theme':        'Dark Theme',
    'shell.banner.trial_expired.title':     'Trial Expired',
    'shell.banner.trial_expired.message':   'Modules expired: ',
    'shell.banner.trial_expired.action':    'Upgrade',
    'shell.banner.offline.title':           'Offline',
    'shell.banner.offline.message':         'You are offline. Some features may be unavailable.',
    'shell.banner.session_expiry.title':    'Session Expiring',
    'shell.banner.session_expiry.message':  'Your session expires in ',
    'shell.banner.impersonation.title':     'Impersonation Mode',
    'shell.banner.impersonation.message':   'You are viewing this workspace as another user.',
    'shell.action_queue.aria':              'Action queue',
    'shell.action_queue.title':             'Action queue',
    'shell.action_queue.empty':             'No pending actions.',
    'workspace.page.modules.title':         'Module launcher',
    'workspace.page.modules.description':   'Active, pending and locked modules for this tenant.',
    'workspace.stub.back':                   'Back to command center',
    'workspace.stub.wiring':                'This surface is wired and ready. Backend data feed is being connected.',
    'workspace.stub.empty':                 'No items yet.',
    // ── Sidebar nav GROUP labels ─────────────────────────────────────
    'nav.group.workspace':         'Workspace',
    'nav.group.core':              'Core',
    'nav.group.tenant':            'Tenant',
    'nav.group.foundation':        'Foundation',
    'nav.group.modules':           'Modules',
    'nav.group.primary':           'Primary',
    'nav.group.secondary':         'Secondary',
    'nav.group.platform':          'Platform',
    'nav.group.config-center':     'Config Center',
    'nav.group.misc':              'More',
    // ── Direct Dynamic-UI / module title keys surfaced by the shell ─────
    'cfg.overview.title':          'Config Center',
    'cfg.e1.title':                'Settings',
    'cfg.e2.title':                'Gateway',
    'cfg.e3.title':                'Workspace',
    'cfg.audit.title':             'Audit',
    'compliance.nav.controls':     'Controls',
    'compliance.nav.diagnostics':  'Diagnostics',
    'compliance.nav.evidence':     'Evidence',
    'compliance.nav.ksa':          'KSA',
    'compliance.nav.regulator':    'Regulator',
    // ── Sidebar nav ITEM labels (one key per known module / route) ──
    'nav.item.foundation':         'Foundation',
    'nav.item.risk':               'Risk',
    'nav.item.risks':              'Risk',
    'nav.item.compliance':         'Compliance',
    'nav.item.controls':           'Controls',
    'nav.item.evidence':           'Evidence',
    'nav.item.audit':              'Audit',
    'nav.item.knowledge':          'Knowledge',
    'nav.item.reporting':          'Reporting',
    'nav.item.analytics':          'Analytics',
    'nav.item.workflow':           'Workflow',
    'nav.item.workflows':          'Workflow',
    'nav.item.policy':             'Policy',
    'nav.item.policies':           'Policy',
    'nav.item.privacy':            'Privacy',
    'nav.item.vendor':             'Vendor',
    'nav.item.vendors':            'Vendor',
    'nav.item.asset':              'Asset',
    'nav.item.assets':             'Asset',
    'nav.item.bcp':                'BCP',
    'nav.item.training':           'Training',
    'nav.item.remediation':        'Remediation',
    'nav.item.action':             'Actions',
    'nav.item.actions':            'Actions',
    'nav.item.dora':               'DORA',
    'nav.item.journey':            'Qiyas Journey',
    'nav.item.qiyas':              'Qiyas',
    'nav.item.executive':          'Executive',
    'nav.item.executive-intelligence': 'Executive Intelligence',
    'nav.item.ai-governance':      'AI Governance',
    'nav.item.ai-engine':          'AI Engine',
    'nav.item.ai':                 'AI',
    'nav.item.dsoc':               'Security Ops',
    'nav.item.dnoc':               'Network Ops',
    'nav.item.dauth':              'Identity',
    'nav.item.tenant':             'Tenant',
    'nav.item.workspace':          'Workspace',
    'nav.item.config-center':      'Config Center',
    'nav.item.notifications':      'Notifications',
    'nav.item.inbox':              'Inbox',
    'nav.item.records':            'Records',
    'nav.item.integrations':       'Integrations',
    'nav.item.mcp':                'MCP',
    'nav.item.portals':            'Portals',
    'nav.item.widgets':            'Widgets',
    'nav.item.product':            'Product',
    'nav.item.agrc':               'AGRC',
    'nav.item.agrc-os':            'AGRC OS',
    'nav.item.platform-admin':     'Platform Admin',
    'nav.item.platform':           'Platform',
    'nav.item.user-profile':       'Profile',
    'nav.item.profile':            'Profile',
    'nav.item.settings':           'Settings',
    'nav.item.tenant-profile':     'Tenant profile',
    'nav.item.tenant-settings':    'Tenant settings',
    'nav.item.audit-trail':        'Audit Trail',
    'nav.item.incidents':          'Incidents',
    'nav.item.incident':           'Incidents',
    'nav.item.issues':             'Issues',
    'nav.item.tasks':              'Tasks',
    'nav.item.approvals':          'Approvals',
    'nav.item.activity':           'Activity',
    'nav.item.home':               'Home',
    'nav.item.overview':           'Overview',
    'nav.item.dashboard':          'Dashboard',
    // ── Workspace-home page chrome (consumed by WorkspaceHomeComponent) ──
    'workspace.home.eyebrow':                 'Workspace',
    'workspace.home.tenant.status_pending':   'Tenant status pending',
    'workspace.home.tenant.status_prefix':    'Tenant',
    'workspace.home.metric.active':           'active',
    'workspace.home.metric.entitled':         'entitled',
    'workspace.home.metric.visible':          'visible',
    'workspace.home.metric.permission':       'permission',
    'workspace.home.metric.permissions':      'permissions',
    'workspace.home.separator':               '·',
    'workspace.home.loading.title':           'Loading workspace…',
    'workspace.home.loading.subtitle':        'Resolving entitled modules.',
    'workspace.home.error.title':             'Could not load workspace',
    'workspace.home.empty.title':             'No modules activated for this tenant',
    'workspace.home.empty.body':              'Contact your workspace administrator to activate modules.',
    'workspace.home.empty.cta':               'Open tenant profile →',
    'workspace.home.attention.singular':      'module needs attention',
    'workspace.home.attention.plural':        'modules need attention',
    'workspace.home.card.platform_default':   'Platform default',
    'workspace.home.card.cta.open':           'Open module',
    'workspace.home.card.cta.trial_expired':  'Trial expired',
    'workspace.home.card.cta.limit_reached':  'Limit reached',
    'workspace.home.card.cta.registry_drift': 'Registry drift',
    'workspace.home.card.cta.not_configured': 'Not configured',
    'workspace.home.card.cta.route_missing':  'Route not wired',
    'workspace.home.card.permission':         'permission',
    'workspace.home.card.permissions':        'permissions',
    // Status pill labels
    'workspace.home.status.active':            'Active',
    'workspace.home.status.route_missing':     'Route missing',
    'workspace.home.status.metadata_missing':  'Metadata missing',
    'workspace.home.status.registry_drift':    'Registry drift',
    'workspace.home.status.trial_blocked':     'Trial blocked',
    // Status reason copy
    'workspace.home.reason.trial_expired':     'Trial period has expired for this module.',
    'workspace.home.reason.limit_reached':     'Trial usage limit reached for this module.',
    'workspace.home.reason.registry_drift':    "Module is entitled but has no entry in the platform module registry.",
    'workspace.home.reason.metadata_missing':  'Module is registered but has no display metadata configured.',
    'workspace.home.reason.route_missing':     'Module is entitled but has no route mounted in the application.',
    'workspace.home.subtitle.trial_expired':   'Trial expired — contact your administrator.',
    'workspace.home.subtitle.limit_reached':   'Usage limit reached — upgrade to continue.',
    'workspace.home.subtitle.registry_drift':  'Entitled module with no registry entry.',
    'workspace.home.subtitle.metadata_missing':'Entitled module — no metadata configured.',
  },
  ar: {
    // workspace.*
    'workspace.eyebrow':            'مساحة العمل',
    'workspace.title':              'مركز القيادة',
    'workspace.welcome':            'مرحبًا',
    'workspace.kpi.tenant':         'المستأجر',
    'workspace.kpi.status':         'الحالة',
    'workspace.kpi.role':           'دورك',
    'workspace.kpi.modules':        'الوحدات المخصصة',
    'workspace.section.setup':      'تقدم الإعداد',
    'workspace.section.setup.sub':  'فعّل مساحة عملك خطوة بخطوة.',
    'workspace.section.tasks':      'مهامي',
    'workspace.section.approvals':  'الموافقات الخاصة بي',
    'workspace.section.activity':   'النشاط الأخير',
    'workspace.section.modules':    'مشغل الوحدات',
    'workspace.section.modules.sub':'افتح أي وحدة مفعّلة.',
    'workspace.section.actions':    'إجراءات سريعة',
    'workspace.section.ai':         'توصيات الذكاء الاصطناعي',
    'workspace.section.ai.sub':     'ما نقترح فعله الآن.',
    'workspace.section.copilot':    'مساعد الذكاء الاصطناعي',
    'workspace.section.copilot.sub':'اسأل، ابحث، أنشئ، تنقّل. اضغط ⌘K في أي مكان.',
    'workspace.section.health':     'جاهزية النظام',
    'workspace.health.adminonly':   'فحص جاهزية للمسؤول فقط.',
    'workspace.health.online':      'متصل',
    'workspace.health.offline':     'قيد الانتظار',
    'workspace.health.dna':         'وحدات الحمض النووي',
    'workspace.health.entitled':    'الوحدات المخصصة',
    'workspace.health.openfga':     'بذور التفويض',
    'workspace.health.trial':       'حالة التجربة',
    'workspace.search.placeholder': 'تصفية الوحدات…',
    'workspace.col.module':         'الوحدة',
    'workspace.col.code':           'الرمز',
    'workspace.col.description':    'الوصف',
    'workspace.col.status':         'الحالة',
    'workspace.empty.modules.title':       'لا توجد وحدات مخصصة بعد',
    'workspace.empty.modules.description': 'تظهر الوحدات هنا عند تفعيل خدماتها.',
    'workspace.empty.tasks.title':         'لا توجد مهام مسندة إليك بعد.',
    'workspace.empty.approvals.title':     'لا توجد موافقات بانتظارك.',
    'workspace.empty.activity.title':      'لم يُسجّل أي نشاط بعد.',
    'workspace.loading':            'جارٍ تحميل مساحة العمل…',
    'workspace.no_session':         'تعذر تحميل هوية مساحة العمل. يرجى تسجيل الدخول مرة أخرى.',
    'workspace.action.open':        'فتح',
    'workspace.action.view_all':    'عرض الكل',
    'workspace.action.ask_ai':      'اسأل الذكاء',
    'workspace.action.account':       'الحساب',
    'workspace.action.account.title': 'الملف الشخصي',
    'workspace.action.account.desc':  'الهوية، الدور، الصلاحيات، الجلسات، المصادقة الثنائية.',
    'workspace.action.workspace':       'مساحة العمل',
    'workspace.action.workspace.title': 'ملف المستأجر',
    'workspace.action.workspace.desc':  'هوية المستأجر، الوحدات والإعدادات الافتراضية.',
    'workspace.action.prefs':         'التفضيلات',
    'workspace.action.prefs.title':   'الإعدادات',
    'workspace.action.prefs.desc':    'اللغة، المنطقة الزمنية، الإشعارات والجلسة.',
    'workspace.action.admin':         'الإدارة',
    'workspace.action.admin.title':   'إعدادات المستأجر',
    'workspace.action.admin.desc':    'تكوين مساحة العمل، الدخول الموحد، الوحدات، الفوترة.',
    'workspace.action.invite':        'الفريق',
    'workspace.action.invite.title':  'دعوة المستخدمين',
    'workspace.action.invite.desc':   'أضف أعضاء الفريق وعيّن أدوارهم.',
    'workspace.action.copilot':       'المساعد',
    'workspace.action.copilot.title': 'اسأل الذكاء',
    'workspace.action.copilot.desc':  'افتح مساعد مساحة العمل.',
    'workspace.setup.profile':      'أكمل ملفك الشخصي',
    'workspace.setup.tenant':       'تأكيد هوية المستأجر',
    'workspace.setup.modules':      'فعّل وحدة واحدة على الأقل',
    'workspace.setup.team':         'ادعُ فريقك',
    'workspace.progress.complete':  'مكتمل',
    'workspace.ai.setup.title':     'أكمل الإعداد أولاً',
    'workspace.ai.setup.body':      'أكمل قائمة الإعداد لفتح النشاط والموافقات ورؤى الذكاء الاصطناعي.',
    'workspace.ai.module.title':    'افتح الأساس',
    'workspace.ai.module.body':     'الأساس هو الحمض النووي للمنصة. أكّد الهوية والمؤسسة لتفعيل كل شيء.',
    'workspace.ai.invite.title':    'ادعُ الزملاء',
    'workspace.ai.invite.body':     'الموافقات وRACI تصبح مفيدة مع عضوين نشطين على الأقل.',
    'status.tenant.active':         'نشط',
    'status.tenant.platform_dna':   'منصة أساسية',
    'status.tenant.trial_expired':  'انتهت الفترة التجريبية',
    'status.tenant.suspended':      'موقوف',
    'role.owner':                   'مالك',
    'role.tenant_owner':            'مالك المستأجر',
    'role.tenant_admin':            'مسؤول',
    'role.member':                  'عضو',
    'tenant_settings.eyebrow':      'الإدارة',
    'tenant_settings.title':        'إعدادات المستأجر',
    'tenant_settings.subtitle':     'تكوين شامل لمساحة العمل. لمالك / مسؤول المستأجر فقط.',
    'tenant_settings.service.title':   'حالة الخدمة',
    'tenant_settings.service.message': 'لم يتم ربط خدمة تكوين المستأجر بعد. الأقسام أدناه مقفلة للمسؤولين؛ ستفعّل عند توفر واجهات برمجتها.',
    'tenant_settings.service.cta':     'عرض ملف المستأجر للقراءة فقط ←',
    'tenant_settings.section.workspace':       'مساحة العمل',
    'tenant_settings.section.workspace.desc':  'الاسم المعروض، المضيفون، المنطقة الزمنية، اللغة الافتراضية، ألوان العلامة التجارية.',
    'tenant_settings.section.entitlements':      'الوحدات والصلاحيات',
    'tenant_settings.section.entitlements.desc': 'الوحدات المفعّلة لهذا المستأجر؛ مستوى الخطة؛ عدد المقاعد.',
    'tenant_settings.section.sso':           'الدخول الموحد ومزود الهوية',
    'tenant_settings.section.sso.desc':      'ربط واقع Keycloak، تعيين مطالبات IdP، سياسة المصادقة الثنائية.',
    'tenant_settings.section.email':         'البريد الإلكتروني والتكاملات',
    'tenant_settings.section.email.desc':    'SMTP الصادر، المرسل المعاملي، خطافات تكامل الويب.',
    'tenant_settings.section.risk':          'نموذج المخاطر',
    'tenant_settings.section.risk.desc':     'أبعاد الخريطة الحرارية، أوزان التقييم، عتبات المعالجة.',
    'tenant_settings.section.raci':          'مصفوفة RACI والصلاحيات',
    'tenant_settings.section.raci.desc':     'تعيينات RACI الافتراضية، معتمدو المالكين، الفصل بين الواجبات.',
    'tenant_settings.section.cadence':       'تجاوزات الإيقاع',
    'tenant_settings.section.cadence.desc':  'دورات المراجعة، تقاويم الإقرار، جداول الأدلة.',
    'tenant_settings.section.history':       'تاريخ التكوين',
    'tenant_settings.section.history.desc':  'سجل تدقيق لتغييرات تكوين المستأجر (من، متى، ماذا).',
    'tenant_settings.eyebrow.placeholder':   'مرحلة أولية',
    'tenant_settings.eyebrow.coming_soon':   'قريباً',
    'tenant_settings.eyebrow.live':          'مفعل',
    'tenant_settings.cta.open':              'فتح',
    'tenant_settings.cta.locked':            'مقفل',
    'common.action.retry':          'إعادة المحاولة',
    'common.action.dismiss':        'إغلاق',
    // ── Workspace shell chrome (Arabic) ───────────────────────────────
    'shell.brand.fallback':         'مساحة العمل',
    'shell.tenant.prefix':          'المستأجر: ',
    'shell.account.aria':           'الحساب',
    'shell.account.fallback':       'الحساب',
    'shell.signout':                'تسجيل الخروج',
    'shell.search.aria':            'بحث',
    'shell.language.aria':          'اللغة',
    'shell.notifications.aria':     'الإشعارات',
    'shell.help.aria':              'المساعدة',
    'shell.theme.aria':             'السمة',
    'shell.nav.aria':               'التنقل في مساحة العمل',
    'shell.account.menu.profile':         'الملف الشخصي',
    'shell.account.menu.settings':        'الإعدادات',
    'shell.account.menu.tenant_profile':  'ملف المستأجر',
    'shell.account.menu.tenant_settings': 'إعدادات المستأجر',
    'shell.account.menu.logout':          'تسجيل الخروج',
    'shell.header.brand':                   'شاهين AI+',
    'shell.header.workspace_title':        'مساحة العمل',
    'shell.header.home_route':              '/workspace-home',
    'shell.header.account_action':          'الحساب',
    'shell.header.hide_navigation':         'إخفاء التنقل',
    'shell.header.show_navigation':         'عرض التنقل',
    'shell.header.expand_sidebar':          'توسيع الشريط الجانبي',
    'shell.header.collapse_to_rail':        'طي إلى الشريط',
    'shell.breadcrumb.aria':                'مسار التنقل',
    'shell.skeleton.loading_page':          'جارٍ تحميل الصفحة',
    'shell.drawer.title':                   'التنقل',
    'shell.drawer.close':                   'إغلاق',
    'shell.mobile_bottom_nav.aria':         'التنقل السفلي',
    'shell.sidenav.aria_label':             'التنقل الجانبي لمساحة العمل',
    'shell.account.initial_fallback':       'U',
    'shell.nav.disabled.coming_soon':        'قريباً',
    'shell.nav.disabled.route_not_wired':    'غير متوفر بعد',
    'shell.nav.disabled.backend_offline':    'الخدمة غير متصلة',
    'shell.nav.disabled.missing_permission': 'الوصول مقيّد',
    'shell.nav.disabled.not_entitled':       'غير متاح في خطتك',
    'shell.nav.disabled.trial_expired':      'انتهت الفترة التجريبية',
    'shell.nav.disabled.trial_limit_reached':'تم بلوغ حد التجربة',
    'shell.group.icon.workspace':           'home',
    'shell.group.icon.core':                'layout-dashboard',
    'shell.group.icon.foundation':          'building',
    'shell.group.icon.config-center':       'settings',
    'shell.group.icon.compliance':          'shield-check',
    'shell.group.icon.risk':                'alert-triangle',
    'shell.group.icon.dauth':               'user-check',
    'shell.group.icon.access':              'key',
    'shell.group.icon.dnoc':                'globe',
    'shell.group.icon.dsoc':                'shield',
    'shell.group.icon.ai-platform':         'cpu',
    'shell.group.icon.dos-platform':        'layers',
    'shell.group.icon.runtime':             'play',
    'shell.group.icon.ui-system':           'grid',
    'shell.group.icon.tenant-management':   'users',
    'shell.group.icon.multi-tenant-mgmt':   'users',
    'shell.group.icon.foundation-admin':    'tool',
    'shell.group.icon.modules':             'package',
    'shell.group.icon.misc':                'more-horizontal',
    'shell.command.aria':                   'بحث الأوامر',
    'shell.command.placeholder':            'ابحث في المسارات والسجلات والإجراءات…',
    'shell.command.empty':                  'اكتب للبحث.',
    'shell.inbox.title':                    'صندوق الوارد',
    'shell.inbox.aria':                     'مركز الوارد',
    'shell.inbox.empty':                    'لا توجد رسائل.',
    'shell.inbox.toggle':                   'فتح الوارد',
    'shell.quick.aria':                     'إنشاء سريع',
    'shell.quick.fab_glyph':                '+',
    // §B.9 — shell chrome keys for GAP items (#7/#8/#16/#25/#33/#36/#37/#38)
    'shell.a11y.skip_to_main':              'تخطي إلى المحتوى الرئيسي',
    'shell.header.help':                    'المساعدة',
    'shell.error.dismiss':                  'إغلاق',
    'shell.sidebar.search_placeholder':     'تصفية التنقل…',
    'shell.account.menu.switch_to_english': 'English',
    'shell.account.menu.switch_to_arabic':  'العربية',
    'shell.account.menu.light_theme':       'السمة الفاتحة',
    'shell.account.menu.dark_theme':        'السمة الداكنة',
    'shell.banner.trial_expired.title':     'انتهت الفترة التجريبية',
    'shell.banner.trial_expired.message':   'وحدات منتهية: ',
    'shell.banner.trial_expired.action':    'ترقية',
    'shell.banner.offline.title':           'غير متصل',
    'shell.banner.offline.message':         'أنت غير متصل. قد لا تتوفر بعض الميزات.',
    'shell.banner.session_expiry.title':    'انتهاء الجلسة',
    'shell.banner.session_expiry.message':  'تنتهي جلسة العمل خلال ',
    'shell.banner.impersonation.title':     'وضع انتحال الهوية',
    'shell.banner.impersonation.message':   'أنت تعرض مساحة العمل كمستخدم آخر.',
    'shell.action_queue.aria':              'قائمة الإجراءات',
    'shell.action_queue.title':             'قائمة الإجراءات',
    'shell.action_queue.empty':             'لا توجد إجراءات معلقة.',
    'workspace.page.modules.title':         'مشغّل الوحدات',
    'workspace.page.modules.description':   'الوحدات النشطة والمعلّقة والمقفلة لهذا المستأجر.',
    'workspace.stub.back':                   'العودة إلى مركز القيادة',
    'workspace.stub.wiring':                'هذا السطح جاهز. يجري ربط مصدر البيانات.',
    'workspace.stub.empty':                 'لا توجد عناصر بعد.',
    // ── Sidebar nav GROUP labels (Arabic) ─────────────────────────────
    'nav.group.workspace':          'مساحة العمل',
    'nav.group.core':               'الأساسيات',
    'nav.group.tenant':             'المستأجر',
    'nav.group.foundation':         'الأساس',
    'nav.group.modules':            'الوحدات',
    'nav.group.primary':            'الرئيسية',
    'nav.group.secondary':          'الثانوية',
    'nav.group.platform':           'المنصة',
    'nav.group.config-center':      'مركز الإعدادات',
    'nav.group.misc':               'المزيد',
    // ── Direct Dynamic-UI / module title keys surfaced by the shell ─────
    'cfg.overview.title':           'مركز الإعدادات',
    'cfg.e1.title':                 'الإعدادات',
    'cfg.e2.title':                 'البوابة',
    'cfg.e3.title':                 'مساحة العمل',
    'cfg.audit.title':              'التدقيق',
    'compliance.nav.controls':      'الضوابط',
    'compliance.nav.diagnostics':   'التشخيص',
    'compliance.nav.evidence':      'الأدلة',
    'compliance.nav.ksa':           'السعودية',
    'compliance.nav.regulator':     'الجهة التنظيمية',
    // ── Sidebar nav ITEM labels (Arabic) ──────────────────────────────
    'nav.item.foundation':          'الأساس',
    'nav.item.risk':                'المخاطر',
    'nav.item.risks':               'المخاطر',
    'nav.item.compliance':          'الامتثال',
    'nav.item.controls':            'الضوابط',
    'nav.item.evidence':            'الأدلة',
    'nav.item.audit':               'التدقيق',
    'nav.item.knowledge':           'المعرفة',
    'nav.item.reporting':           'التقارير',
    'nav.item.analytics':           'التحليلات',
    'nav.item.workflow':            'سير العمل',
    'nav.item.workflows':           'سير العمل',
    'nav.item.policy':              'السياسات',
    'nav.item.policies':            'السياسات',
    'nav.item.privacy':             'الخصوصية',
    'nav.item.vendor':              'الموردين',
    'nav.item.vendors':             'الموردين',
    'nav.item.asset':               'الأصول',
    'nav.item.assets':              'الأصول',
    'nav.item.bcp':                 'استمرارية الأعمال',
    'nav.item.training':            'التدريب',
    'nav.item.remediation':         'المعالجة',
    'nav.item.action':              'الإجراءات',
    'nav.item.actions':             'الإجراءات',
    'nav.item.dora':                'DORA',
    'nav.item.journey':             'رحلة قياس',
    'nav.item.qiyas':               'قياس',
    'nav.item.executive':           'القيادة التنفيذية',
    'nav.item.executive-intelligence': 'استخبارات تنفيذية',
    'nav.item.ai-governance':       'حوكمة الذكاء الاصطناعي',
    'nav.item.ai-engine':           'محرك الذكاء الاصطناعي',
    'nav.item.ai':                  'الذكاء الاصطناعي',
    'nav.item.dsoc':                'العمليات الأمنية',
    'nav.item.dnoc':                'عمليات الشبكة',
    'nav.item.dauth':               'الهوية والتفويض',
    'nav.item.tenant':              'المستأجر',
    'nav.item.workspace':           'مساحة العمل',
    'nav.item.config-center':       'مركز الإعدادات',
    'nav.item.notifications':       'الإشعارات',
    'nav.item.inbox':               'البريد الوارد',
    'nav.item.records':             'السجلات',
    'nav.item.integrations':        'التكاملات',
    'nav.item.mcp':                 'بوابة الأدوات',
    'nav.item.portals':             'البوابات',
    'nav.item.widgets':             'الأدوات الذكية',
    'nav.item.product':             'المنتج',
    'nav.item.agrc':                'AGRC',
    'nav.item.agrc-os':             'AGRC OS',
    'nav.item.platform-admin':      'إدارة المنصة',
    'nav.item.platform':            'المنصة',
    'nav.item.user-profile':        'الملف الشخصي',
    'nav.item.profile':             'الملف الشخصي',
    'nav.item.settings':            'الإعدادات',
    'nav.item.tenant-profile':      'ملف المستأجر',
    'nav.item.tenant-settings':     'إعدادات المستأجر',
    'nav.item.audit-trail':         'سجل التدقيق',
    'nav.item.incidents':           'الحوادث',
    'nav.item.incident':            'الحوادث',
    'nav.item.issues':              'المسائل',
    'nav.item.tasks':               'المهام',
    'nav.item.approvals':           'الموافقات',
    'nav.item.activity':            'النشاط',
    'nav.item.home':                'الرئيسية',
    'nav.item.overview':            'نظرة عامة',
    'nav.item.dashboard':           'لوحة التحكم',
    // ── Workspace-home page chrome (Arabic) ───────────────────────────
    'workspace.home.eyebrow':                 'مساحة العمل',
    'workspace.home.tenant.status_pending':   'حالة المستأجر قيد الانتظار',
    'workspace.home.tenant.status_prefix':    'المستأجر',
    'workspace.home.metric.active':           'نشطة',
    'workspace.home.metric.entitled':         'مخصصة',
    'workspace.home.metric.visible':          'ظاهرة',
    'workspace.home.metric.permission':       'صلاحية',
    'workspace.home.metric.permissions':      'صلاحيات',
    'workspace.home.separator':               '·',
    'workspace.home.loading.title':           'جارٍ تحميل مساحة العمل…',
    'workspace.home.loading.subtitle':        'يجري حصر الوحدات المخصصة.',
    'workspace.home.error.title':             'تعذر تحميل مساحة العمل',
    'workspace.home.empty.title':             'لم يتم تفعيل أي وحدات لهذا المستأجر',
    'workspace.home.empty.body':              'يرجى التواصل مع مسؤول مساحة العمل لتفعيل الوحدات.',
    'workspace.home.empty.cta':               'فتح ملف المستأجر ←',
    'workspace.home.attention.singular':      'وحدة تحتاج إلى انتباه',
    'workspace.home.attention.plural':        'وحدات تحتاج إلى انتباه',
    'workspace.home.card.platform_default':   'افتراضي للمنصة',
    'workspace.home.card.cta.open':           'فتح الوحدة',
    'workspace.home.card.cta.trial_expired':  'انتهت التجربة',
    'workspace.home.card.cta.limit_reached':  'تم بلوغ الحد',
    'workspace.home.card.cta.registry_drift': 'انحراف السجل',
    'workspace.home.card.cta.not_configured': 'غير مهيأة',
    'workspace.home.card.cta.route_missing':  'لم يُربط المسار',
    'workspace.home.card.permission':         'صلاحية',
    'workspace.home.card.permissions':        'صلاحيات',
    'workspace.home.status.active':            'نشطة',
    'workspace.home.status.route_missing':     'المسار مفقود',
    'workspace.home.status.metadata_missing':  'البيانات الوصفية مفقودة',
    'workspace.home.status.registry_drift':    'انحراف السجل',
    'workspace.home.status.trial_blocked':     'محظورة بالتجربة',
    'workspace.home.reason.trial_expired':     'انتهت الفترة التجريبية لهذه الوحدة.',
    'workspace.home.reason.limit_reached':     'تم بلوغ حد الاستخدام التجريبي لهذه الوحدة.',
    'workspace.home.reason.registry_drift':    'هذه الوحدة مخصصة لكن لا توجد لها مدخلة في سجل وحدات المنصة.',
    'workspace.home.reason.metadata_missing':  'هذه الوحدة مسجلة لكن لا توجد لها بيانات وصفية للعرض.',
    'workspace.home.reason.route_missing':     'هذه الوحدة مخصصة لكن لا يوجد لها مسار مثبت في التطبيق.',
    'workspace.home.subtitle.trial_expired':   'انتهت التجربة — تواصل مع المسؤول.',
    'workspace.home.subtitle.limit_reached':   'تم بلوغ حد الاستخدام — قم بالترقية للمتابعة.',
    'workspace.home.subtitle.registry_drift':  'وحدة مخصصة بلا مدخلة في السجل.',
    'workspace.home.subtitle.metadata_missing':'وحدة مخصصة — لا توجد بيانات وصفية مهيأة.',
  },
};

// ────────────────────────────────────────────────────────────────────
// Status pill catalog (mirrors dos.entity_status_labels seed)
// ────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, Record<string, { labelKey: string; tone: DosUiTone; icon?: string }>> = {
  tenant: {
    active:        { labelKey: 'status.tenant.active',        tone: 'success' },
    platform_dna:  { labelKey: 'status.tenant.platform_dna',  tone: 'info' },
    trial_expired: { labelKey: 'status.tenant.trial_expired', tone: 'danger' },
    suspended:     { labelKey: 'status.tenant.suspended',     tone: 'warning' },
  },
};

const ROLE_LABELS: Record<string, string> = {
  owner:        'role.owner',
  tenant_owner: 'role.tenant_owner',
  tenant_admin: 'role.tenant_admin',
  member:       'role.member',
};

@Injectable({ providedIn: 'root' })
export class WorkspaceResolverService implements DynamicUiResolverPort, WorkspaceNavLabelResolver {
  readonly access = inject(AccessStore);
  readonly nav = inject(WorkspaceNavigationAdapter);

  // ────────────────────────────────────────────────────────────────
  // Reactive locale + direction (PILLAR 1.A).
  //
  // Reads are driven by signals that mutate when bootstrap (or a
  // language switcher) flips `<html lang>` / `<html dir>`. We attach
  // a MutationObserver once at construction so a runtime AR/EN switch
  // re-renders the entire workspace surface without a page reload.
  // ────────────────────────────────────────────────────────────────
  private readonly _localeSig    = signal<DosLocale>(this.readLocaleFromDom());
  private readonly _directionSig = signal<'ltr' | 'rtl'>(this.readDirectionFromDom());

  readonly locale    = computed<DosLocale>(() => this._localeSig());
  readonly direction = computed<'ltr' | 'rtl'>(() => this._directionSig());

  // ────────────────────────────────────────────────────────────────
  // Loaded / error state (PILLAR 1.C).
  // ────────────────────────────────────────────────────────────────
  private readonly _error  = signal<Error | null>(null);
  readonly error  = computed(() => this._error());
  readonly loaded = computed(() => this.access.loaded() && !this._error());

  // ────────────────────────────────────────────────────────────────
  // Telemetry (PILLAR 1.D) — observability of misses + composition cost.
  // ────────────────────────────────────────────────────────────────
  private readonly _missingKeys = new Set<string>();
  private _composeCount = 0;
  /** Diagnostic snapshot of resolver health. */
  diagnostics(): { composeCount: number; missingKeys: string[]; locale: DosLocale; loaded: boolean } {
    return {
      composeCount: this._composeCount,
      missingKeys:  Array.from(this._missingKeys),
      locale:       this._localeSig(),
      loaded:       this.loaded(),
    };
  }

  constructor() {
    // Wire MutationObserver once. Skipped in SSR.
    if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(() => {
        const nextLocale = this.readLocaleFromDom();
        const nextDir    = this.readDirectionFromDom();
        if (nextLocale !== this._localeSig())    this._localeSig.set(nextLocale);
        if (nextDir    !== this._directionSig()) this._directionSig.set(nextDir);
      });
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    }
  }

  private readLocaleFromDom(): DosLocale {
    if (typeof document === 'undefined') return 'en';
    const l = (document.documentElement.lang || 'en').toLowerCase();
    return (l.startsWith('ar') ? 'ar' : 'en') as DosLocale;
  }
  private readDirectionFromDom(): 'ltr' | 'rtl' {
    if (typeof document === 'undefined') return 'ltr';
    return (document.documentElement.dir as 'ltr' | 'rtl') || 'ltr';
  }

  /** Force a recompose (clears the missing-key telemetry buffer). */
  refresh(): void {
    this._missingKeys.clear();
    this._error.set(null);
    // Trigger downstream computed by toggling a hidden signal.
    this._refreshBeacon.update(n => n + 1);
  }
  private readonly _refreshBeacon = signal(0);

  // ────────────────────────────────────────────────────────────────
  // Public port methods
  // ────────────────────────────────────────────────────────────────
  async resolveString(key: string): Promise<ResolvedString> {
    return this.t(key);
  }

  /**
   * Synchronous resolved-string accessor. Use from Angular templates and
   * computed signals where the Promise variant adds friction. Mirrors
   * the future `/api/i18n/lookup?key=…` endpoint shape.
   */
  string(key: string): string {
    return this.t(key).value;
  }

  /**
   * Localize a sidebar nav GROUP label. Tries `nav.group.<id-or-label>`
   * first (case-insensitive); falls back to verbatim input.
   */
  navGroupLabel(idOrLabel: string | undefined | null): string {
    const seg = (idOrLabel || '').trim().toLowerCase();
    if (!seg) return idOrLabel || '';
    const r = this.t(`nav.group.${seg}`);
    return r.value === `nav.group.${seg}` ? (idOrLabel || '') : r.value;
  }

  /**
   * Localize a sidebar nav ITEM label. Tries `nav.item.<id-or-label>` for
   * each candidate. Falls back to humanizing the LAST segment of the
   * dotted id (so siblings like `identity.users` and `identity.roles`
   * render as "Users" / "Roles", not collapsed to a single "Identity").
   *
   * The legacy first-segment fallback was removed because it caused
   * every sibling within a group to render the same parent label — see
   * workspace-audit.md §4 (5× "Identity", 7× "Marketing" duplicate-label
   * regression).
   */
  navItemLabel(idOrLabel: string | undefined | null, fallbackId?: string): string {
    const loc = this.locale();
    const lookup = (k: string): string | null => {
      const v = I18N[loc]?.[k];
      if (v !== undefined) return v;
      const en = I18N.en?.[k];
      return en !== undefined ? en : null;
    };
    const candidates = [idOrLabel ?? '', fallbackId ?? '']
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    for (const c of candidates) {
      // Only treat the candidate as a *direct* i18n key when it is dot-free —
      // dotted keys go through the `nav.item.*` namespace below to avoid the
      // humanize() fallback synthesizing the last-segment ('Title' leak).
      if (!c.includes('.')) {
        const direct = lookup(c);
        if (direct) return direct;
      }
      const r = lookup(`nav.item.${c}`);
      if (r) return r;
      // NOTE: no first-segment fallback. Siblings sharing a prefix must
      // resolve through their FULL id (or the humanized leaf below) so
      // each renders a distinct label.
    }
    // Last resort: humanize the LAST meaningful segment of the original
    // input. For dotted keys this surfaces the leaf (e.g. `identity.users`
    // → "Users"), guaranteeing siblings render distinct labels even when
    // no i18n key exists for them.
    const raw = (idOrLabel || fallbackId || '').toString().trim();
    if (!raw) return '';
    if (raw.includes('.')) {
      const segs = raw.split('.').filter(Boolean);
      // Skip generic suffixes that would otherwise leak as the display
      // text (`module.foundation.title` → "Foundation", not "Title").
      const GENERIC_SUFFIXES = new Set(['title', 'label', 'name', 'caption']);
      let leaf = segs[segs.length - 1] ?? raw;
      for (let i = segs.length - 1; i >= 0; i--) {
        if (!GENERIC_SUFFIXES.has(segs[i].toLowerCase())) {
          leaf = segs[i];
          break;
        }
      }
      return this.humanize(leaf);
    }
    if (!/^[a-z0-9_-]+$/i.test(raw)) return raw;
    return this.humanize(raw);
  }

  /**
   * Shell chrome lookups for platform `ShellHostComponent`. Returns `null` when
   * the key is missing so the Carbon shell applies its baked-in English defaults.
   */
  shellChromeString(key: string): string | null {
    const loc = this.locale();
    const direct = I18N[loc]?.[key];
    if (direct !== undefined) return direct;
    const en = I18N.en?.[key];
    if (en !== undefined) return en;
    return null;
  }

  async resolveWorkspace(): Promise<ResolvedWorkspaceSurface> {
    await this.nav.refresh();
    return this.composeWorkspace();
  }

  async resolveTenantSettings(): Promise<ResolvedTenantSettingsSurface> {
    return this.composeTenantSettings();
  }

  /**
   * F.5 — DB-driven sidebar nav via GET /api/ui-os/module-nav.
   *
   * Reads the current module from the URL (first segment after '/'),
   * fetches nav groups + items from dos.ui_module_nav_group/item,
   * and maps to WorkspaceNavItem[]. Falls back to [] on any error so
   * the shell never crashes. Locale (en|ar) is read from the DOM signal.
   */
  async resolveSidebarNav(moduleCode?: string): Promise<ResolvedNavItem[]> {
    try {
      const code = moduleCode ?? this.moduleCodeFromUrl();
      if (!code) return [];
      const locale = this._localeSig();
      const me = this.access.me();
      const tenantId = me?.tenant?.id;
      const userId   = me?.user?.id;

      const params = new URLSearchParams({ module: code });
      if (tenantId) params.set('tenantId', String(tenantId));
      if (userId)   params.set('userId',   String(userId));

      const resp = await fetch(`/api/ui-os/module-nav?${params}`, { credentials: 'include' });
      if (!resp.ok) return [];

      const body = await resp.json() as {
        groups?: Array<{
          id: string;
          label_en: string | null;
          label_ar: string | null;
          items: Array<{
            id: string;
            route: string | null;
            icon:  string | null;
            label_en: string | null;
            label_ar: string | null;
            badge: string | null;
            pinned: boolean;
          }>;
        }>;
      };

      const navItems: ResolvedNavItem[] = [];
      let sortIdx = 0;
      for (const group of body.groups ?? []) {
        if (group.id === '_root') {
          // Ungrouped items — emit directly at primary level
          for (const item of group.items) {
            navItems.push(this.mapNavItem(item, locale, 'primary', undefined, sortIdx++));
          }
        } else {
          // Group items: emit each item with parentId = group.id so the
          // sidebar can render grouped sections. The group header itself
          // is emitted with an empty route (or skipped by the sidebar renderer).
          const groupLabel = (locale === 'ar' ? group.label_ar : group.label_en) ?? this.humanize(group.id);
          navItems.push({
            id:        group.id,
            label:     { key: group.id, value: groupLabel, locale, bidi: 'plain' },
            route:     `/${group.id.replace('.', '/')}`,
            icon:      this.string(`shell.group.icon.${group.id.split('.')[0]}`),
            sortOrder: sortIdx++,
            group:     'primary',
            permitted: true,
          });
          for (const item of group.items) {
            navItems.push(this.mapNavItem(item, locale, 'secondary', group.id, sortIdx++));
          }
        }
      }
      return navItems;
    } catch {
      return [];
    }
  }

  /** Extract module code from the current URL's first segment. */
  private moduleCodeFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const segs = window.location.pathname.replace(/^\//, '').split('/');
    return segs[0] || null;
  }

  /** Map a raw module-nav item row to a ResolvedNavItem. */
  private mapNavItem(
    item: { id: string; route: string | null; icon: string | null; label_en: string | null; label_ar: string | null; badge?: string | null },
    locale: DosLocale,
    group: 'primary' | 'secondary' | 'tertiary' = 'primary',
    parentId?: string,
    sortOrder = 0,
  ): ResolvedNavItem {
    const rawLabel = (locale === 'ar' ? item.label_ar : item.label_en) ?? this.humanize(item.id);
    return {
      id:        item.id,
      label:     { key: item.id, value: rawLabel, locale, bidi: 'plain' },
      route:     item.route ?? `/${item.id.replace(/\./g, '/')}`,
      icon:      item.icon  ?? undefined,
      parentId,
      sortOrder,
      group,
      permitted: true,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Synchronous accessors (used by Angular signals; cheaper than Promise)
  // ────────────────────────────────────────────────────────────────
  /**
   * The composed workspace payload, recomputed when locale, AccessStore
   * state, or a manual refresh fires. Wrapped in an error boundary so a
   * runtime composition failure surfaces a degraded payload instead of
   * crashing the whole page (§3.5 #7 — empty/error/loading must always
   * render localized).
   */
  readonly workspace = computed<ResolvedWorkspaceSurface>(() => {
    // Touch reactive inputs.
    void this._refreshBeacon();
    void this._localeSig();
    try {
      const out = this.composeWorkspace();
      this._composeCount++;
      // Clear stale error outside the computed to avoid NG0600
      // (writing to a signal inside computed() is forbidden because
      // `loaded`/`error` computeds depend on `_error`).
      if (untracked(() => this._error()) !== null) {
        queueMicrotask(() => this._error.set(null));
      }
      return out;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      if (untracked(() => this._error()) !== e) {
        queueMicrotask(() => this._error.set(e));
      }
      // Degraded payload — every required field present, but with safe
      // fallback values so the page renders something useful.
      return this.degradedWorkspace();
    }
  });
  readonly tenantSettings = computed<ResolvedTenantSettingsSurface>(() => this.composeTenantSettings());

  // ────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────
  /**
   * §11.1 — never render raw i18n keys. The lookup chain is:
   *   1. user-locale match    (I18N[locale][key])
   *   2. EN fallback          (I18N.en[key])
   *   3. humanized last segment as last-resort visible string
   *      (e.g. 'workspace.tasks.empty.title' → "Empty title")
   *
   * Every miss is recorded in `_missingKeys` so `diagnostics()` can
   * be shipped to the platform telemetry sink for auto-creation of
   * missing rows in `dos.i18n_translations` once that ships.
   */
  private t(key: string): ResolvedString {
    const loc = this.locale();
    const directHit = I18N[loc]?.[key];
    if (directHit !== undefined) {
      return { key, value: directHit, locale: loc, bidi: 'plain' };
    }
    const enHit = I18N.en?.[key];
    if (enHit !== undefined) {
      // Locale-specific miss (e.g. AR fallback to EN). Track separately
      // so a translator can backfill without thinking the EN row is
      // also missing.
      this._missingKeys.add(`${loc}:${key}`);
      return { key, value: enHit, locale: 'en', bidi: 'plain' };
    }
    // Total miss — synthesize a humanized fallback so the surface
    // never renders a raw dotted key.
    this._missingKeys.add(key);
    return { key, value: this.humanize(key), locale: loc, bidi: 'plain' };
  }

  /** Convert a dotted i18n key into a humanized last-resort label. */
  private humanize(key: string): string {
    const last = key.split('.').pop() || key;
    const spaced = last.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  private statusPill(entityType: string, statusCode: string): ResolvedStatusPill {
    const def = STATUS_LABELS[entityType]?.[statusCode];
    if (!def) {
      return {
        entityType,
        statusCode,
        label: { key: `status.${entityType}.${statusCode}`, value: statusCode, locale: this.locale(), bidi: 'plain' },
        tone: 'neutral',
      };
    }
    return {
      entityType,
      statusCode,
      label: this.t(def.labelKey),
      tone: def.tone,
      icon: def.icon,
    };
  }

  private roleLabel(roleCode: string | undefined, isOwner: boolean): ResolvedString {
    const code = isOwner ? 'tenant_owner' : (roleCode ?? 'member');
    const key = ROLE_LABELS[code] ?? `role.${code}`;
    const resolved = this.t(key);
    if (resolved.value === key) {
      return { key, value: code, locale: this.locale(), bidi: 'plain' };
    }
    return resolved;
  }

  private moduleMeta(code: string): { title: string; description: string } {
    const list = (productManifest as { enabledModules?: ManifestEnabledModule[] }).enabledModules ?? [];
    const found = list.find((m) => m.moduleCode === code);
    return {
      title:       found?.displayName  || code,
      description: found?.description  || code,
    };
  }

  private moduleDefaultRoute(
    moduleCode: string,
    navConfig = this.nav.navConfig(),
  ): string {
    const direct = this.findModuleRoute(navConfig?.groups ?? [], moduleCode);
    return direct ?? `/${moduleCode}`;
  }

  private findModuleRoute(
    groups: ReadonlyArray<{
      items?: ReadonlyArray<{
        id?: string;
        route?: string;
        moduleCode?: string;
        children?: ReadonlyArray<unknown>;
      }>;
    }>,
    moduleCode: string,
  ): string | null {
    const visit = (
      items: ReadonlyArray<{
        id?: string;
        route?: string;
        moduleCode?: string;
        children?: ReadonlyArray<unknown>;
      }>,
    ): string | null => {
      for (const item of items) {
        const route = typeof item.route === 'string' ? item.route.trim() : '';
        const itemModuleCode = typeof item.moduleCode === 'string' ? item.moduleCode.trim() : '';
        const itemId = typeof item.id === 'string' ? item.id.trim() : '';
        if (
          route && (
            itemModuleCode === moduleCode
            || route === `/${moduleCode}`
            || route.startsWith(`/${moduleCode}/`)
            || itemId === moduleCode
            || itemId.startsWith(`${moduleCode}.`)
          )
        ) {
          return route;
        }
        if (Array.isArray(item.children)) {
          const childRoute = visit(
            item.children.filter(
              (child): child is {
                id?: string;
                route?: string;
                moduleCode?: string;
                children?: ReadonlyArray<unknown>;
              } => !!child && typeof child === 'object',
            ),
          );
          if (childRoute) return childRoute;
        }
      }
      return null;
    };

    for (const group of groups) {
      const route = visit(group.items ?? []);
      if (route) return route;
    }
    return null;
  }

  private pageHeader(routeKey: string, eyebrow: string, title: string, subtitleValue?: string): ResolvedPageHeader {
    return {
      routeKey,
      variant:         'signature',
      density:         'comfortable',
      eyebrow:         this.t(eyebrow),
      title:           this.t(title),
      subtitle:        subtitleValue !== undefined
        ? { key: '@inline', value: subtitleValue, locale: this.locale(), bidi: 'isolate' }
        : undefined,
      gradientToken:   '--dos-gradient-brand-soft',
      meshLayers:      ['--dos-gradient-mesh-1', '--dos-gradient-mesh-2', '--dos-gradient-mesh-3'],
      hairlineVisible: true,
      hairlineToken:   '--dos-gradient-kpi-line',
    };
  }

  /**
   * Look up the route contract for a given route from the Foundation
   * UI contract file. Returns the ResolvedRouteContract shape per
   * @dos/ui-contracts. Throws (loudly) if the route is not enrolled —
   * a workspace surface CANNOT render without a contract entry, that's
   * a §10 hard gate failure.
   */
  private resolveRouteContract(route: string): ResolvedRouteContract {
    const moduleCode = (foundationUiContract as { moduleCode?: string }).moduleCode || 'foundation';
    const routes: ContractRouteEntry[] =
      (foundationUiContract as { routes?: ContractRouteEntry[] }).routes ?? [];
    const entry = routes.find(r => r.route === route);
    if (!entry) {
      // Surface a clear error contract so the validator can grep it
      // and the page can still render (degraded), but the gate fails.
      return {
        route,
        moduleCode,
        pageType:  'overview' as DosPageType,
        layout:    'dashboard' as DosLayoutKind,
        kpiScope:  'none' as DosKpiScope,
        titleKey:  '@missing-contract',
        signatureWidget: undefined,
        emptyStateKey: undefined,
        errorStateKey: undefined,
      };
    }
    return {
      route:            entry.route,
      moduleCode,
      pageType:         entry.pageType as DosPageType,
      layout:           entry.layout   as DosLayoutKind,
      kpiScope:         entry.kpiScope as DosKpiScope,
      userIntent:       entry.userIntent as ResolvedRouteContract['userIntent'],
      titleKey:         entry.titleKey,
      subtitleKey:      entry.subtitleKey,
      signatureWidget:  entry.signatureWidget,
      dataResourceKey:  entry.dataResourceKey,
      emptyStateKey:    entry.emptyStateKey,
      errorStateKey:    entry.errorStateKey,
      helpKey:          entry.helpKey,
      auditEnabled:     entry.auditEnabled,
      realtimeEnabled:  entry.realtimeEnabled,
      visibleWhenProfile: entry.visibleWhenProfile,
      visibleWhenPerm:    entry.visibleWhenPerm,
      agentExperienceMode: entry.agentExperienceMode as ResolvedRouteContract['agentExperienceMode'],
      primaryAgentId:   entry.primaryAgentId,
    };
  }

  /**
   * Last-resort safe payload — used when composeWorkspace throws.
   * Surfaces the route contract + an explicit error notification key
   * so the page can render the §3.5 #7 error state without losing
   * navigation chrome.
   */
  private degradedWorkspace(): ResolvedWorkspaceSurface {
    const routeContract = this.resolveRouteContract('/workspace-home');
    const errorMsg = this._error()?.message ?? 'workspace.no_session';
    return {
      routeContract,
      routeKey:    '/workspace-home',
      locale:      this._localeSig(),
      direction:   this._directionSig(),
      density:     'comfortable',
      moduleStyleTokens: {
        moduleCode:        'workspace',
        accent:            'navy',
        icon:              'home',
        mood:              'recovery',
        pageDensity:       'comfortable',
        surfaceStyle:      'standard',
        signatureWidgets:  [],
        agentTone:         'governance',
        defaultPageLayout: 'command-center',
        mobileVariant:     'card-list',
      },
      readonly:    true,
      profile:     'viewer',
      scopeMode:   'self',
      realtimeChannels: [],
      primaryActions:   [],
      secondaryActions: [],
      pageHeader: this.pageHeader('/workspace-home', 'workspace.eyebrow', 'workspace.title', errorMsg),
      trialBanner: {
        visible: false, severity: 'info',
        title: this.t('workspace.no_session'),
        message: this.t('workspace.no_session'),
        dismissible: false,
      },
      kpis:           [],
      setupSteps:     [],
      setupPercent:   0,
      aiTips:         [],
      quickActions:   [],
      healthProbes:   [],
      modules:        [],
      moduleColumns:  [],
      widgets:        [],
      emptyStates:    {},
      whyVisible:     this.t('workspace.no_session'),
      resolvedAt:     new Date().toISOString(),
      cacheTtlSec:    0,
    };
  }

  private composeWorkspace(): ResolvedWorkspaceSurface {
    const navConfig = this.nav.navConfig();
    const routeContract = this.resolveRouteContract('/workspace-home');
    const me = this.access.me();
    const tenantCode    = me?.tenant?.code   ?? '—';
    const tenantName    = me?.tenant?.name   ?? tenantCode;
    const tenantStatus  = me?.tenant?.status ?? 'active';
    const moduleCount   = (this.access.modules() || []).length;
    const isOwner       = !!me?.membership?.isOwner;

    const userName = me?.user?.name || me?.user?.email || '';
    const welcomeBase = this.t('workspace.welcome').value;
    // Wrap the (possibly Latin) name in <bdi> so punctuation in either
    // direction renders correctly without leaking codepoints into
    // accessible text. The hero subtitle template uses [innerHTML].
    const subtitle = userName
      ? `${welcomeBase}, <bdi dir="auto">${escapeHtml(userName)}</bdi>.`
      : welcomeBase;

    // KPIs ─────────────────────────────────────────────────────────
    const kpis: ResolvedKpi[] = [
      {
        kpiKey: 'tenant',
        label:  this.t('workspace.kpi.tenant'),
        value:  tenantName,
        meta:   { key: '@inline', value: tenantCode, locale: this.locale(), bidi: 'isolate' },
        variant: 'solid',
        tone:    'neutral',
        isSignature: true,
        hairlineToken: '--dos-gradient-kpi-line',
        whyVisible: this.t('workspace.section.modules.sub'),
      },
      {
        kpiKey: 'status',
        label:  this.t('workspace.kpi.status'),
        value:  '',
        status: this.statusPill('tenant', tenantStatus),
        variant: 'solid',
        tone:    'neutral',
        isSignature: true,
        hairlineToken: '--dos-gradient-kpi-line',
        whyVisible: this.t('workspace.section.modules.sub'),
      },
      {
        kpiKey: 'role',
        label:  this.t('workspace.kpi.role'),
        value:  this.roleLabel(me?.membership?.roleCode, isOwner).value,
        variant: 'solid',
        tone:    'neutral',
        isSignature: true,
        hairlineToken: '--dos-gradient-kpi-line',
        whyVisible: this.t('workspace.section.modules.sub'),
      },
      {
        kpiKey: 'modules',
        label:  this.t('workspace.kpi.modules'),
        value:  moduleCount,
        variant: 'solid',
        tone:    'neutral',
        isSignature: true,
        hairlineToken: '--dos-gradient-kpi-line',
        whyVisible: this.t('workspace.section.modules.sub'),
      },
    ];

    // Setup steps ─────────────────────────────────────────────────
    const steps: ResolvedSetupStep[] = [
      { stepKey: 'profile', label: this.t('workspace.setup.profile'), route: '/profile',           done: !!me?.user?.name,    permitted: true, sortOrder: 0 },
      { stepKey: 'tenant',  label: this.t('workspace.setup.tenant'),  route: '/tenant-profile',    done: !!me?.tenant?.id,    permitted: true, sortOrder: 1 },
      { stepKey: 'modules', label: this.t('workspace.setup.modules'), route: '/workspace/modules', done: moduleCount > 0,     permitted: true, sortOrder: 2 },
      { stepKey: 'team',    label: this.t('workspace.setup.team'),    route: '/tenant-settings',   done: false,               permitted: this.access.isTenantAdmin(), sortOrder: 3 },
    ];
    const setupPercent = Math.round(steps.filter(s => s.done).length / steps.length * 100);

    // AI tips ── §19.1 AI Trust Layer required on every AI output ────
    const trust = (
      source: string,
      reasonKey: string,
      confidence: number,
      risk: 'low'|'medium'|'high'|'critical' = 'low',
      data: string[] = [],
    ): AiTrustLayer => ({
      source,
      confidence,
      reasoningSummary: this.t(reasonKey),
      dataUsed: data,
      lastUpdated: new Date().toISOString(),
      permissionScope: 'tenant',
      riskLevel: risk,
      humanApprovalRequired: false,
    });

    const tips: ResolvedAiTip[] = [];
    if (setupPercent < 100) tips.push({
      tipKey: 'setup-incomplete',
      title:  this.t('workspace.ai.setup.title'),
      body:   this.t('workspace.ai.setup.body'),
      ctaLabel: this.t('workspace.action.open'),
      ctaRoute: '/workspace/setup',
      icon: 'sparkle',
      priority: 10,
      trust: trust('foundation-org-agent', 'workspace.ai.setup.body', 0.95, 'low',
                   ['foundation.overview', 'foundation.users.list']),
      whyVisible: this.t('workspace.ai.setup.body'),
    });
    if (moduleCount > 0) tips.push({
      tipKey: 'open-foundation',
      title:  this.t('workspace.ai.module.title'),
      body:   this.t('workspace.ai.module.body'),
      ctaLabel: this.t('workspace.action.open'),
      ctaRoute: this.moduleDefaultRoute('foundation', navConfig),
      icon: 'sparkle',
      priority: 30,
      trust: trust('foundation-org-agent', 'workspace.ai.module.body', 0.88, 'low',
                   ['foundation.overview']),
      whyVisible: this.t('workspace.ai.module.body'),
    });
    if (this.access.isTenantAdmin()) tips.push({
      tipKey: 'invite-team',
      title:  this.t('workspace.ai.invite.title'),
      body:   this.t('workspace.ai.invite.body'),
      ctaLabel: this.t('workspace.action.open'),
      ctaRoute: '/tenant-settings',
      icon: 'sparkle',
      priority: 50,
      trust: trust('foundation-org-agent', 'workspace.ai.invite.body', 0.92, 'medium',
                   ['foundation.users.list']),
      whyVisible: this.t('workspace.ai.invite.body'),
    });

    // Quick actions ───────────────────────────────────────────────
    const actions: ResolvedQuickAction[] = [
      { actionKey: 'profile',        eyebrow: this.t('workspace.action.account'),   label: this.t('workspace.action.account.title'),   description: this.t('workspace.action.account.desc'),   route: '/profile',         variant: 'solid', tone: 'neutral', permitted: true, sortOrder: 10 },
      { actionKey: 'tenant-profile', eyebrow: this.t('workspace.action.workspace'), label: this.t('workspace.action.workspace.title'), description: this.t('workspace.action.workspace.desc'), route: '/tenant-profile',  variant: 'solid', tone: 'neutral', permitted: true, sortOrder: 20 },
      { actionKey: 'settings',       eyebrow: this.t('workspace.action.prefs'),     label: this.t('workspace.action.prefs.title'),     description: this.t('workspace.action.prefs.desc'),     route: '/settings',        variant: 'solid', tone: 'neutral', permitted: true, sortOrder: 30 },
      { actionKey: 'ask-ai',         eyebrow: this.t('workspace.action.copilot'),   label: this.t('workspace.action.copilot.title'),   description: this.t('workspace.action.copilot.desc'),   route: '/workspace/ai',    variant: 'gradient', tone: 'accent',   permitted: true, sortOrder: 40 },
    ];
    if (this.access.isTenantAdmin()) {
      actions.push({ actionKey: 'invite',          eyebrow: this.t('workspace.action.invite'), label: this.t('workspace.action.invite.title'), description: this.t('workspace.action.invite.desc'), route: '/tenant-settings', variant: 'solid', tone: 'neutral', permitted: true, sortOrder: 50 });
      actions.push({ actionKey: 'tenant-settings', eyebrow: this.t('workspace.action.admin'),  label: this.t('workspace.action.admin.title'),  description: this.t('workspace.action.admin.desc'),  route: '/tenant-settings', variant: 'solid', tone: 'neutral', permitted: true, sortOrder: 60 });
    }

    // Health probes (admin only) ───────────────────────────────────
    const probes: ResolvedHealthProbe[] = this.access.isTenantAdmin() ? [
      { probeKey: 'dna-modules',    label: this.t('workspace.health.dna'),       state: 'ok',      stateLabel: this.t('workspace.health.online'),  tone: 'success', sortOrder: 0 },
      { probeKey: 'entitled-count', label: this.t('workspace.health.entitled'),  state: moduleCount > 0 ? 'ok' : 'unknown', stateLabel: this.t(moduleCount > 0 ? 'workspace.health.online' : 'workspace.health.offline'), tone: moduleCount > 0 ? 'success' : 'warning', sortOrder: 10 },
      { probeKey: 'openfga-seed',   label: this.t('workspace.health.openfga'),   state: 'ok',      stateLabel: this.t('workspace.health.online'),  tone: 'success', sortOrder: 20 },
      { probeKey: 'trial-status',   label: this.t('workspace.health.trial'),     state: 'ok',      stateLabel: this.statusPill('tenant', tenantStatus).label, tone: 'info',    sortOrder: 30 },
    ] : [];

    // Modules table ────────────────────────────────────────────────
    const expired = new Set(this.access.trialExpiredModules() || []);
    const modules: ResolvedModuleRow[] = (this.access.modules() || []).map((code) => {
      const meta = this.moduleMeta(code);
      const isExpired = expired.has(code);
      const isFoundation = code === 'foundation';
      const statusCode = isExpired ? 'trial_expired' : (isFoundation ? 'platform_dna' : 'active');
      return {
        moduleCode: code,
        title:       { key: `module.${code}.title`,       value: meta.title,       locale: this.locale(), bidi: 'isolate' },
        description: { key: `module.${code}.description`, value: meta.description, locale: this.locale(), bidi: 'isolate' },
        status:      this.statusPill('tenant', statusCode),
        route:       this.moduleDefaultRoute(code, navConfig),
        iconGlyph:   (meta.title || '·').slice(0, 1).toUpperCase(),
      };
    });

    // Module-launcher columns ─────────────────────────────────────
    const moduleColumns: ResolvedGridColumn[] = [
      { colKey: 'title',       label: this.t('workspace.col.module'),      dataField: 'title.value',       dataKind: 'text',        formatPayload: {}, isSortable: true,  isFilterable: true,  defaultSort: 'asc', sortPriority: 1, align: 'start',  isVisible: true, sortOrder: 10 },
      { colKey: 'code',        label: this.t('workspace.col.code'),        dataField: 'moduleCode',        dataKind: 'code',        formatPayload: {}, isSortable: true,  isFilterable: true,                                          align: 'start',  isVisible: true, sortOrder: 20 },
      { colKey: 'description', label: this.t('workspace.col.description'), dataField: 'description.value', dataKind: 'text',        formatPayload: {}, isSortable: false, isFilterable: false,                                         align: 'start',  isVisible: true, sortOrder: 30 },
      { colKey: 'status',      label: this.t('workspace.col.status'),      dataField: 'status',            dataKind: 'status_pill', formatPayload: {}, isSortable: true,  isFilterable: false,                                         align: 'start',  isVisible: true, sortOrder: 40 },
    ];

    // Empty states catalog ─────────────────────────────────────────
    const emptyStates: Record<string, ResolvedStateContent> = {
      'workspace.tasks.empty': {
        stateKey: 'workspace.tasks.empty',
        title:    this.t('workspace.empty.tasks.title'),
        tone:     'info',
        primaryLabel: this.t('workspace.action.view_all'),
        primaryRoute: '/workspace/tasks',
      },
      'workspace.approvals.empty': {
        stateKey: 'workspace.approvals.empty',
        title:    this.t('workspace.empty.approvals.title'),
        tone:     'warning',
        primaryLabel: this.t('workspace.action.view_all'),
        primaryRoute: '/workspace/approvals',
      },
      'workspace.activity.empty': {
        stateKey: 'workspace.activity.empty',
        title:    this.t('workspace.empty.activity.title'),
        tone:     'success',
        primaryLabel: this.t('workspace.action.view_all'),
        primaryRoute: '/workspace/activity',
      },
      'workspace.modules.empty': {
        stateKey: 'workspace.modules.empty',
        title:    this.t('workspace.empty.modules.title'),
        description: this.t('workspace.empty.modules.description'),
        tone:     'brand',
        primaryLabel: this.t('workspace.action.ask_ai'),
        primaryRoute: '/workspace/ai',
      },
    };

    // §3.5 #4-#5 — profile-aware visibility. Auditor renders read-only;
    // department manager scope-locked to their org branch; admin/owner
    // can manage. Profile resolved from AccessStore membership claims.
    const profile: string = this.access.isTenantAdmin()
      ? (me?.membership?.isOwner ? 'tenant_owner' : 'platform_admin')
      : 'viewer';
    const isAuditor = profile === 'auditor';
    const readonly  = isAuditor;
    const scopeMode: ResolvedWorkspaceSurface['scopeMode'] =
      isAuditor ? 'tenant'
      : this.access.isTenantAdmin() ? 'tenant'
      : 'self';

    // §31 module style tokens — workspace surface inherits Foundation's
    // governance tone but with its own signature widget set.
    const moduleStyleTokens: ResolvedModuleStyleTokens = {
      moduleCode:        'workspace',
      accent:            'navy',
      accentSecondary:   'gold',
      icon:              'home',
      mood:              'calm, command-center, executive-clarity',
      pageDensity:       'comfortable',
      surfaceStyle:      'operational',
      signatureWidgets:  ['workspace-command-center', 'work-queue', 'kpi-strip', 'ai-recommendations'],
      agentTone:         'governance',
      defaultPageLayout: 'command-center',
      mobileVariant:     'card-list',
    };

    // §13 / §21 #25 — realtime channels declared by this surface.
    const realtimeChannels: ResolvedRealtimeChannel[] = [
      { channel: 'workspace.approvals',     topic: 'workspace.approvals.*',     permission: 'workflow.read' },
      { channel: 'workspace.tasks',         topic: 'workspace.tasks.*',         permission: 'tasks.read' },
      { channel: 'workspace.activity',      topic: 'workspace.activity.*',      permission: 'audit_trail.read' },
      { channel: 'workspace.ai-pulse',      topic: 'ai.recommendations.*',      permission: 'ai.read' },
    ];

    // §3.2 primaryActions / secondaryActions — derived from contract +
    // permissions. Components render this list and never embed role
    // checks for visibility.
    const primaryActions: ResolvedPageAction[] = [
      {
        actionKey:  'open-copilot',
        label:      this.t('workspace.action.ask_ai'),
        kind:       'primary',
        icon:       'sparkle',
        route:      '/workspace/ai',
        intent:     'agent',
        riskLevel:  'low',
        requiresApproval: false,
      },
    ];
    const secondaryActions: ResolvedPageAction[] = [];
    if (this.access.isTenantAdmin()) {
      secondaryActions.push({
        actionKey:  'invite-team',
        label:      this.t('workspace.action.invite'),
        kind:       'secondary',
        icon:       'user-plus',
        route:      '/tenant-settings',
        intent:     'navigate',
        permission: 'tenant.admin.write',
        riskLevel:  'medium',
        requiresApproval: false,
      });
    }
    if (readonly) {
      // §3.5 #4 — Auditor profile: hide every primary action and
      // surface a "why hidden" note on each.
      const blockedReason = this.t('workspace.health.adminonly');
      primaryActions.forEach(a => { a.whyHidden = blockedReason; });
      secondaryActions.forEach(a => { a.whyHidden = blockedReason; });
    }

    return {
      routeContract,
      routeKey:      '/workspace-home',
      locale:        this.locale(),
      direction:     this.direction(),
      density:       'comfortable',
      moduleStyleTokens,
      readonly,
      profile,
      scopeMode,
      realtimeChannels,
      primaryActions,
      secondaryActions,
      pageHeader:    this.pageHeader('/workspace-home', 'workspace.eyebrow', 'workspace.title', subtitle),
      trialBanner:   { visible: false, severity: 'info', title: this.t('workspace.kpi.status'), message: this.t('workspace.kpi.status'), dismissible: false },
      kpis,
      setupSteps:    steps,
      setupPercent,
      aiTips:        tips.sort((a, b) => a.priority - b.priority),
      quickActions:  actions.sort((a, b) => a.sortOrder - b.sortOrder),
      healthProbes:  probes,
      modules,
      moduleColumns,
      widgets:       [] as ResolvedWidgetFrame[],
      emptyStates,
      whyVisible:    this.t('workspace.welcome'),
      resolvedAt:    new Date().toISOString(),
      cacheTtlSec:   60,
    };
  }

  private composeTenantSettings(): ResolvedTenantSettingsSurface {
    const sections: ResolvedTenantSettingsSection[] = [
      { sectionKey: 'workspace',    eyebrow: this.t('tenant_settings.eyebrow.placeholder'), title: this.t('tenant_settings.section.workspace'),    description: this.t('tenant_settings.section.workspace.desc'),    icon: '◈', tone: 'brand',   status: 'placeholder', permitted: true, sortOrder: 10 },
      { sectionKey: 'entitlements', eyebrow: this.t('tenant_settings.eyebrow.placeholder'), title: this.t('tenant_settings.section.entitlements'), description: this.t('tenant_settings.section.entitlements.desc'), icon: '⊞', tone: 'info',    status: 'placeholder', permitted: true, sortOrder: 20 },
      { sectionKey: 'sso',          eyebrow: this.t('tenant_settings.eyebrow.placeholder'), title: this.t('tenant_settings.section.sso'),          description: this.t('tenant_settings.section.sso.desc'),          icon: '⌬', tone: 'accent',  status: 'placeholder', permitted: true, sortOrder: 30 },
      { sectionKey: 'email',        eyebrow: this.t('tenant_settings.eyebrow.placeholder'), title: this.t('tenant_settings.section.email'),        description: this.t('tenant_settings.section.email.desc'),        icon: '✉', tone: 'info',    status: 'placeholder', permitted: true, sortOrder: 40 },
      { sectionKey: 'risk',         eyebrow: this.t('tenant_settings.eyebrow.coming_soon'), title: this.t('tenant_settings.section.risk'),         description: this.t('tenant_settings.section.risk.desc'),         icon: '⚠', tone: 'warning', status: 'coming_soon', permitted: true, sortOrder: 50 },
      { sectionKey: 'raci',         eyebrow: this.t('tenant_settings.eyebrow.coming_soon'), title: this.t('tenant_settings.section.raci'),         description: this.t('tenant_settings.section.raci.desc'),         icon: '◉', tone: 'success', status: 'coming_soon', permitted: true, sortOrder: 60 },
      { sectionKey: 'cadence',      eyebrow: this.t('tenant_settings.eyebrow.coming_soon'), title: this.t('tenant_settings.section.cadence'),      description: this.t('tenant_settings.section.cadence.desc'),      icon: '◷', tone: 'neutral', status: 'coming_soon', permitted: true, sortOrder: 70 },
      { sectionKey: 'history',      eyebrow: this.t('tenant_settings.eyebrow.coming_soon'), title: this.t('tenant_settings.section.history'),      description: this.t('tenant_settings.section.history.desc'),      icon: '↺', tone: 'neutral', status: 'coming_soon', permitted: true, sortOrder: 80 },
    ];

    return {
      routeKey:        '/tenant-settings',
      locale:          this.locale(),
      direction:       this.direction(),
      density:         'comfortable',
      pageHeader:      this.pageHeader('/tenant-settings', 'tenant_settings.eyebrow', 'tenant_settings.title', this.t('tenant_settings.subtitle').value),
      serviceStatus:   {
        stateKey: 'tenant_settings.service',
        title:    this.t('tenant_settings.service.title'),
        description: this.t('tenant_settings.service.message'),
        tone:     'info',
        primaryLabel: this.t('tenant_settings.service.cta'),
        primaryRoute: '/tenant-profile',
      },
      sections,
      resolvedAt:      new Date().toISOString(),
      cacheTtlSec:     60,
    };
  }
}
