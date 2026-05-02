// ============================================================
// AGRC-OS — Workspace Home (Operational Cockpit)
// Layout: Header → KPI Band (6) → Next Actions (10) →
//         Module Progress → Recent Activity → Empty States
// ============================================================

import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GrcLiveService } from '@app/grc/services/grc-live.service';
import { FoundationDataService } from '@app/grc';
import { SessionService } from '@app/dauth/session/session.service';
import { AccessStore } from '@app/dauth/access/access.store';
import { isCapabilityActive } from '@app/core/platform/navigation/active-modules';
import {
  NotificationModule, ModalModule, TagModule, ButtonModule,
  TooltipModule, SkeletonModule, IconModule, ProgressBarModule,
} from 'carbon-components-angular';
import { FOUNDATION_I18N, type FoundationI18n, NoopFoundationI18n } from '../ports/i18n.port';
import { HubConnectionsStripComponent } from '@app/shared/hub-connections/hub-connections-strip.component';

import { PageHeaderComponent, PageHeaderAction } from '@app/shared/components/layouts/page-header.component';
import { FoundationKpiGridComponent } from '../components/foundation-kpi-grid.component';
import { RecentActivityTableComponent } from '@app/shared/components/messaging/recent-activity-table.component';
import { FoundationEmptyStateStubComponent as EmptyStateComponent } from '../shared/foundation-shared-components';
import { WorkspaceIgniteCardComponent } from './workspace-ignite-card.component';
import { ModuleGridComponent } from '@app/shared/components/module-chrome/module-grid.component';
import { KpiCardVM, HealthAlertVM, ActivityRowVM } from '@app/shared/models/module-overview.vm';
import { StorageService } from '@app/infrastructure';
import { AppDatePipe } from '../../../config-center/shared/pipes';
import { GrcRecord } from '../shared/foundation-types';
import { ProductsModulesConfigService } from '@app/runtime/config/products-modules-config.service';
import { COCKPIT_CONFIG, type CockpitRoleSectionConfig } from '@app/dos/contracts/cockpit-config.contract';
import { GrcOperationsService } from '@app/api';
import { ApiClientService } from "@app/core/services/api-client.service";

// ── Interfaces ──────────────────────────────────────────────

interface ActionItem {
  id: string;
  title: string;
  type: 'overdue_task' | 'pending_approval' | 'evidence_request' | 'audit_request' | 'upcoming_task' | 'failing_control' | 'unowned_control' | 'stale_evidence';
  priority: 'critical' | 'attention' | 'upcoming' | 'recommended';
  dueDate: string | null;
  entityType: string | null;
  entityId: string | null;
  status: string;
  route: string;
}

interface TenantContext {
  tenantId: string;
  orgName: string;
  industry: string;
  orgSize: string;
  country: string;
  regions: string[];
  workspaceId: string;
  workspaceName: string;
  frameworkCount: number;
  activeFrameworks: string[];
  maturityTier: string;
  maturityAggregate: number;
  auditMode: boolean;
  lastSync: string;
  roleView: string;
}

interface TopRiskItem {
  riskId: string;
  title: string;
  score: number;
  owner: string | null;
  status: string;
  treatmentStatus: string | null;
  likelihood: number;
  impact: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    : [];
}

// ── Role Section Config (product-driven via cockpit-config) ──

// ── Component ───────────────────────────────────────────────

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-workspace-home',
    imports: [
        CommonModule, FormsModule, RouterLink,
        HubConnectionsStripComponent,
        // Carbon Design System (DB-registered primitives from dos.dynamic_ui_component_registry)
        TagModule,          // carbon_key: 'tag'
        ButtonModule,       // carbon_key: 'button'
        TooltipModule,      // carbon_key: 'tooltip'
        SkeletonModule,     // carbon_key: 'skeleton'
        NotificationModule, // carbon_key: 'notification'
        ModalModule,        // carbon_key: 'modal'
        IconModule,         // carbon_key: 'icon'
        ProgressBarModule,  // carbon_key: 'progress-bar'
        PageHeaderComponent, FoundationKpiGridComponent,
        RecentActivityTableComponent, EmptyStateComponent,
        WorkspaceIgniteCardComponent, AppDatePipe,
        ModuleGridComponent,
    ],
    templateUrl: './workspace-home.component.html',
    styleUrls: ['./workspace-home.component.scss']
})
export class WorkspaceHomeComponent implements OnInit, OnDestroy {
    private apiclientSvc = inject(ApiClientService);
    private operationsSvc = inject(GrcOperationsService);
  private auth = inject(SessionService);
  private router = inject(Router);
  private live = inject(GrcLiveService);
  private shell: { setTopbarCtx: (ctx: unknown) => void } | null = null;
  private fds = inject(FoundationDataService);
  private _storage = inject(StorageService);
  private pmc = inject(ProductsModulesConfigService);
  private cockpitConfig = inject(COCKPIT_CONFIG);
  i18n: FoundationI18n = inject(FOUNDATION_I18N, { optional: true }) ?? new NoopFoundationI18n() as any;
  private destroyRef = inject(DestroyRef);
  private topbarRefreshHandler = () => this.refreshPage();
  private topbarHelpHandler = () => { this.showPlatformMap = true; };

  private foundationUsers = signal<unknown[]>([]);
  private foundationUsersLoaded = signal(false);

  loading = signal(true);
  loadError = signal<string | null>(null);
  tenantContext = signal<TenantContext | null>(null);
  actionItems = signal<ActionItem[]>([]);
  complianceCoverage = signal<{ frameworkId: string; name: string; percentage: number }[]>([]);
  activityEntries = signal<ActivityRowVM[]>([]);
  activityCursor = signal<string | null>(null);
  maturityState = signal<'new' | 'active' | 'mature'>('new');
  activityFilterValue = '';
  showPlatformMap = false;
  cardIndicators = signal<Record<string, unknown>>({});

  kpis = signal<KpiCardVM[]>([]);
  healthAlerts = signal<HealthAlertVM[]>([]);

  // Integration Hub health summary
  connectorSummary = signal<{ total: number; healthy: number; degraded: number; offline: number; drafts: number }>({ total: 0, healthy: 0, degraded: 0, offline: 0, drafts: 0 });

  // AI OS R2: Next-Best-Action recommendations from AI
  aiNextBestActions = signal<{ id: string; type: string; title: string; description: string | null; priority: string; entityType: string | null; entityId: string | null; route: string; source: string; dueDate: string | null }[]>([]);

  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.isAr() ? 'rtl' : 'ltr');

  foundationHealthScore = computed<number>(() => {
    const users = this.foundationUsers();
    if (!this.foundationUsersLoaded() || users.length === 0) return 0;
    const withRoles = users.filter((u) => {
      const role = asString(asRecord(u)['role']);
      return !!role && role !== 'viewer';
    }).length;
    return Math.round((withRoles / users.length) * 100);
  });

  roleConfig = computed<CockpitRoleSectionConfig>(() => {
    const role = this.auth.currentRole();
    const aliases = this.cockpitConfig.getRoleAliases();
    const sections = this.cockpitConfig.getRoleSections();
    const normalized = aliases[role] ?? role;
    const base = sections[normalized] ?? this.cockpitConfig.getDefaultRoleSection();
    const visibleKpis = this.cockpitConfig.getKpiModuleMap()
      .filter(m => this.pmc.isModuleVisible(m.requiredModule))
      .map(m => m.kpiId);
    return {
      ...base,
      widgetPriority: base.widgetPriority.filter(id => visibleKpis.includes(id)),
    };
  });

  nextActions = computed<ActionItem[]>(() =>
    [...this.actionItems()]
      .sort((a, b) => {
        const order = { critical: 0, attention: 1, upcoming: 2, recommended: 3 };
        const diff = order[a.priority] - order[b.priority];
        if (diff !== 0) return diff;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      })
      .slice(0, 10)
  );

  allFrameworksAtZero = computed(() => {
    const cov = this.complianceCoverage();
    return cov.length > 0 && cov.every(fw => fw.percentage === 0);
  });

  private workspaceId = this._storage.get('grc_active_workspace') || '';
  dismissedGettingStarted = signal(this._storage.get('grc_workspace_home_getting_started_dismissed') === '1');
  showGettingStartedBanner = computed(() => this.maturityState() === 'new' && !this.dismissedGettingStarted());

  private access = inject(AccessStore);

  canIgniteWorkspace = computed(() => {
    return this.access.isAdmin();
  });

  headerActions: PageHeaderAction[] = [];

  // Carbon icon names (@carbon/icons-angular) — replaces all PrimeNG pi-* icons.
  platformMapSections = [
    {
      icon: 'home', labelEn: 'Home & Overview', labelAr: 'الرئيسية والنظرة العامة',
      links: [
        { route: '/workspace-home', icon: 'dashboard', labelEn: 'Workspace Home', labelAr: 'الرئيسية', descEn: 'Executive dashboard with KPIs, actions, and program health', descAr: 'لوحة تنفيذية بمؤشرات الأداء والإجراءات وصحة البرنامج' },
        { route: '/reports/executive', icon: 'report', labelEn: 'Executive Summary', labelAr: 'الملخص التنفيذي', descEn: 'Board-level compliance and risk summary', descAr: 'ملخص الالتزام والمخاطر على مستوى مجلس الإدارة' },
        { route: '/approval-center', icon: 'task--complete', labelEn: 'Approval Center', labelAr: 'مركز الموافقات', descEn: 'Pending approvals across all modules', descAr: 'الموافقات المعلقة عبر جميع الوحدات' },
      ]
    },
    {
      icon: 'data-base', labelEn: 'Foundation', labelAr: 'الأساسيات',
      links: [
        { route: '/foundation/overview', icon: 'home', labelEn: 'Foundation Overview', labelAr: 'نظرة عامة', descEn: 'Organization health and setup status', descAr: 'صحة المنظمة وحالة الإعداد' },
        { route: '/foundation/organization', icon: 'enterprise', labelEn: 'Organization', labelAr: 'المنظمة', descEn: 'Org structure, units, and departments', descAr: 'الهيكل التنظيمي والوحدات والأقسام' },
        { route: '/foundation/users', icon: 'group', labelEn: 'Users & Roles', labelAr: 'المستخدمون والأدوار', descEn: 'User management, roles, and permissions', descAr: 'إدارة المستخدمين والأدوار والصلاحيات' },
        { route: '/foundation/reference-data', icon: 'data-base', labelEn: 'Reference Data', labelAr: 'البيانات المرجعية', descEn: 'Categories, classifications, and lookups', descAr: 'التصنيفات والفئات والبيانات المرجعية' },
      ]
    },
    {
      icon: 'enterprise', labelEn: 'Governance', labelAr: 'الحوكمة',
      links: [
        { route: '/governance/overview', icon: 'enterprise', labelEn: 'Governance Overview', labelAr: 'نظرة عامة الحوكمة', descEn: 'Policies, decisions, and governance actions', descAr: 'السياسات والقرارات وإجراءات الحوكمة' },
        { route: '/governance/policies', icon: 'document', labelEn: 'Policies', labelAr: 'السياسات', descEn: 'Create, review, and approve organizational policies', descAr: 'إنشاء ومراجعة واعتماد سياسات المنظمة' },
        { route: '/governance/procedures', icon: 'list', labelEn: 'Procedures & Standards', labelAr: 'الإجراءات والمعايير', descEn: 'Standard operating procedures and guidelines', descAr: 'إجراءات التشغيل المعيارية والمبادئ التوجيهية' },
        { route: '/governance/committees', icon: 'group', labelEn: 'Committees', labelAr: 'اللجان', descEn: 'Committee register, minutes, and decisions', descAr: 'سجل اللجان والمحاضر والقرارات' },
        { route: '/governance/actions', icon: 'time', labelEn: 'Actions', labelAr: 'الإجراءات', descEn: 'Track and manage governance action items', descAr: 'تتبع وإدارة بنود الإجراءات' },
        { route: '/governance/exceptions', icon: 'warning--alt', labelEn: 'Exceptions', labelAr: 'الاستثناءات', descEn: 'Policy exceptions and waivers', descAr: 'استثناءات السياسات والإعفاءات' },
      ]
    },
    {
      icon: 'warning', labelEn: 'Risk Management', labelAr: 'إدارة المخاطر',
      links: [
        { route: '/risk/home', icon: 'warning', labelEn: 'Risk Overview', labelAr: 'نظرة عامة المخاطر', descEn: 'Risk register, assessments, and treatment plans', descAr: 'سجل المخاطر والتقييمات وخطط المعالجة' },
        { route: '/risk/register', icon: 'list', labelEn: 'Risk Register', labelAr: 'سجل المخاطر', descEn: 'Identify, assess, and track all organizational risks', descAr: 'تحديد وتقييم وتتبع جميع مخاطر المنظمة' },
        { route: '/risk/assessments', icon: 'checkmark--outline', labelEn: 'Assessments', labelAr: 'تقييمات المخاطر', descEn: 'Risk assessment campaigns and results', descAr: 'حملات تقييم المخاطر ونتائجها' },
        { route: '/risk/treatment', icon: 'tools', labelEn: 'Treatment Plans', labelAr: 'خطط المعالجة', descEn: 'Mitigation and treatment plans', descAr: 'خطط التخفيف والمعالجة' },
        { route: '/risk/heatmap', icon: 'chart--bar', labelEn: 'Heatmap', labelAr: 'الخريطة الحرارية', descEn: 'Visual risk analysis with heatmaps', descAr: 'تحليل بصري للمخاطر مع خرائط حرارية' },
        { route: '/risk/indicators', icon: 'chart--line', labelEn: 'KRIs', labelAr: 'مؤشرات المخاطر', descEn: 'Key risk indicators monitoring', descAr: 'مراقبة مؤشرات المخاطر الرئيسية' },
      ]
    },
    {
      icon: 'security', labelEn: 'Compliance', labelAr: 'الامتثال',
      links: [
        { route: '/compliance/overview', icon: 'security', labelEn: 'Compliance Overview', labelAr: 'نظرة عامة الامتثال', descEn: 'Framework mapping, assessments, and compliance posture', descAr: 'ربط الأطر والتقييمات ووضع الامتثال' },
        { route: '/compliance/frameworks', icon: 'catalog', labelEn: 'Frameworks', labelAr: 'الأطر', descEn: 'NCA-ECC, ISO 27001, NIST and other frameworks', descAr: 'الضوابط الأساسية للأمن السيبراني وأطر أخرى' },
        { route: '/compliance/controls', icon: 'checkmark--outline', labelEn: 'Controls', labelAr: 'الضوابط', descEn: 'Control library and implementation status', descAr: 'مكتبة الضوابط وحالة التنفيذ' },
        { route: '/compliance/assessments', icon: 'task', labelEn: 'Assessments', labelAr: 'التقييمات', descEn: 'Compliance assessments and scoring', descAr: 'تقييمات الامتثال والتصنيف' },
        { route: '/compliance/gaps', icon: 'search', labelEn: 'Gaps', labelAr: 'الفجوات', descEn: 'Compliance gap analysis', descAr: 'تحليل فجوات الامتثال' },
        { route: '/compliance/posture', icon: 'chart--line', labelEn: 'Posture Dashboard', labelAr: 'لوحة الوضع', descEn: 'Compliance posture and trends', descAr: 'وضع الامتثال والاتجاهات' },
      ]
    },
    {
      icon: 'folder', labelEn: 'Evidence', labelAr: 'الأدلة',
      links: [
        { route: '/evidence/overview', icon: 'folder--open', labelEn: 'Evidence Overview', labelAr: 'نظرة عامة الأدلة', descEn: 'Evidence collection status and coverage', descAr: 'حالة جمع الأدلة والتغطية' },
        { route: '/evidence/vault', icon: 'locked', labelEn: 'Evidence Vault', labelAr: 'خزينة الأدلة', descEn: 'Secure evidence storage and management', descAr: 'تخزين الأدلة الآمن وإدارتها' },
        { route: '/evidence/requests', icon: 'email', labelEn: 'Requests', labelAr: 'الطلبات', descEn: 'Evidence collection requests', descAr: 'طلبات جمع الأدلة' },
        { route: '/evidence/expiry', icon: 'time', labelEn: 'Expiry & Coverage', labelAr: 'الانتهاء والتغطية', descEn: 'Track evidence freshness and coverage', descAr: 'تتبع حداثة الأدلة والتغطية' },
      ]
    },
    {
      icon: 'search', labelEn: 'Audit', labelAr: 'التدقيق',
      links: [
        { route: '/audit/overview', icon: 'search', labelEn: 'Audit Overview', labelAr: 'نظرة عامة التدقيق', descEn: 'Plan and execute audit engagements', descAr: 'تخطيط وتنفيذ مهام التدقيق' },
        { route: '/audit/plan', icon: 'calendar', labelEn: 'Audit Plan', labelAr: 'خطة التدقيق', descEn: 'Annual audit plan and scheduling', descAr: 'خطة التدقيق السنوية والجدولة' },
        { route: '/audit/engagements', icon: 'report', labelEn: 'Audits', labelAr: 'عمليات التدقيق', descEn: 'Active and completed audit engagements', descAr: 'عمليات التدقيق النشطة والمكتملة' },
        { route: '/audit/findings', icon: 'warning--alt', labelEn: 'Findings', labelAr: 'النتائج', descEn: 'Audit findings and remediation tracking', descAr: 'نتائج التدقيق وتتبع المعالجة' },
        { route: '/audit/capa', icon: 'tools', labelEn: 'CAPA', labelAr: 'الإجراءات التصحيحية', descEn: 'Corrective and preventive actions', descAr: 'الإجراءات التصحيحية والوقائية' },
      ]
    },
    {
      icon: 'chart--bar', labelEn: 'Reports & Analytics', labelAr: 'التقارير والتحليلات',
      links: [
        { route: '/reports/overview', icon: 'chart--bar', labelEn: 'Reports Overview', labelAr: 'نظرة عامة للتقارير', descEn: 'All reports and analytics in one place', descAr: 'جميع التقارير والتحليلات في مكان واحد' },
        { route: '/reports/executive', icon: 'report', labelEn: 'Executive Dashboard', labelAr: 'لوحة تنفيذية', descEn: 'High-level GRC posture overview', descAr: 'نظرة عامة على وضع الحوكمة والمخاطر والامتثال' },
        { route: '/reports/risk', icon: 'warning', labelEn: 'Risk Analytics', labelAr: 'تحليلات المخاطر', descEn: 'Risk trends, scoring, and heatmaps', descAr: 'اتجاهات المخاطر والتصنيف والخرائط الحرارية' },
        { route: '/reports/compliance', icon: 'security', labelEn: 'Compliance Analytics', labelAr: 'تحليلات الامتثال', descEn: 'Compliance trends and posture', descAr: 'اتجاهات الامتثال والوضع' },
        { route: '/reports/builder', icon: 'edit', labelEn: 'Report Builder', labelAr: 'منشئ التقارير', descEn: 'Custom report builder', descAr: 'منشئ التقارير المخصصة' },
      ]
    },
    {
      icon: 'chart--line', labelEn: 'Qiyas (Maturity)', labelAr: 'قياس النضج',
      links: [
        { route: '/qiyas', icon: 'chart--line', labelEn: 'Qiyas Dashboard', labelAr: 'لوحة قياس', descEn: 'Maturity assessment dashboard', descAr: 'لوحة تقييم النضج' },
        { route: '/qiyas/assessments', icon: 'task', labelEn: 'Assessments', labelAr: 'التقييمات', descEn: 'Maturity assessment campaigns', descAr: 'حملات تقييم النضج' },
        { route: '/maturity', icon: 'settings--adjust', labelEn: 'Maturity Wizard', labelAr: 'معالج النضج', descEn: 'Guided maturity level wizard', descAr: 'معالج مستوى النضج الموجّه' },
      ]
    },
    {
      icon: 'machine-learning-model', labelEn: 'AI & Automation', labelAr: 'الذكاء الاصطناعي',
      links: [
        { route: '/ai-hub', icon: 'machine-learning-model', labelEn: 'AI Hub', labelAr: 'مركز الذكاء الاصطناعي', descEn: 'AI agents, copilot, and automation', descAr: 'وكلاء الذكاء الاصطناعي والمساعد والأتمتة' },
        { route: '/agrc-os', icon: 'screen', labelEn: 'AGRC-OS', labelAr: 'نظام التشغيل', descEn: 'Agent operating system console', descAr: 'وحدة تحكم نظام تشغيل الوكلاء' },
        { route: '/workflows', icon: 'flow', labelEn: 'Workflows', labelAr: 'سير العمل', descEn: 'Automated workflow builder', descAr: 'منشئ سير العمل الآلي' },
        { route: '/task-board', icon: 'list', labelEn: 'Task Board', labelAr: 'لوحة المهام', descEn: 'Track and manage remediation tasks', descAr: 'تتبع وإدارة مهام المعالجة' },
      ]
    },
    {
      icon: 'connect', labelEn: 'Integrations', labelAr: 'التكاملات',
      links: [
        { route: '/connector-hub', icon: 'connect', labelEn: 'Connector Hub', labelAr: 'مركز الموصلات', descEn: 'Connect external systems and data sources', descAr: 'ربط الأنظمة الخارجية ومصادر البيانات' },
        { route: '/integration-marketplace', icon: 'store', labelEn: 'Marketplace', labelAr: 'السوق', descEn: 'Browse and install integrations', descAr: 'تصفح وتثبيت التكاملات' },
      ]
    },
    {
      icon: 'settings', labelEn: 'Administration', labelAr: 'الإدارة',
      links: [
        { route: '/admin-hub', icon: 'settings', labelEn: 'Admin Hub', labelAr: 'مركز الإدارة', descEn: 'Platform configuration and tenant settings', descAr: 'تكوين المنصة وإعدادات المستأجر' },
        { route: '/team', icon: 'group', labelEn: 'Team', labelAr: 'الفريق', descEn: 'Team management and invitations', descAr: 'إدارة الفريق والدعوات' },
        { route: '/tenant-config', icon: 'settings--adjust', labelEn: 'Configuration', labelAr: 'التكوين', descEn: 'Tenant configuration and modules', descAr: 'تكوين المستأجر والوحدات' },
        { route: '/account-settings', icon: 'user--avatar', labelEn: 'Account Settings', labelAr: 'إعدادات الحساب', descEn: 'Personal profile, password, and security', descAr: 'الملف الشخصي وكلمة المرور والأمان' },
      ]
    },
  ];

  ngOnInit(): void {
    this.fds.getUsers().pipe(catchError(() => of([]))).subscribe((users) => {
      this.foundationUsers.set(users);
      this.foundationUsersLoaded.set(true);
    });
    this.loadOverview();
    this.live.debounced(600).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadOverview());
    window.addEventListener('topbar:refresh', this.topbarRefreshHandler);
    window.addEventListener('topbar:help', this.topbarHelpHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('topbar:refresh', this.topbarRefreshHandler);
    window.removeEventListener('topbar:help', this.topbarHelpHandler);
    this.shell?.setTopbarCtx({});
  }

  dismissGettingStarted(): void {
    this._storage.set('grc_workspace_home_getting_started_dismissed', '1');
    this.dismissedGettingStarted.set(true);
  }

  onHeaderAction(id: string): void {
    if (id === 'platform-map') this.showPlatformMap = true;
    if (id === 'refresh') this.refreshPage();
  }

  loadOverview(): void {
    this.loadError.set(null);
    this.operationsSvc.getHomeOverview(this.workspaceId).pipe(
      catchError(() => of(null))
    ).subscribe((res) => {
      // Optional overview API: when unavailable (e.g. tenant-home 404 / fresh
      // tenant), do NOT block the entire page. The module-grid + Foundation
      // shortcuts must still render from AccessStore truth so the workspace
      // is never blank for an authenticated tenant.
      if (!res) {
        this.buildTenantContext({});
        this.kpis.set([]);
        this.actionItems.set([]);
        this.activityEntries.set([]);
        this.complianceCoverage.set([]);
        this.maturityState.set('new');
        this.loading.set(false);
        return;
      }
      const overview = asRecord(res);
      const context = asRecord(overview['context']);
      const kpis = asRecord(overview['kpis']);
      const kpiTrends = asRecord(overview['kpiTrends']);
      const summary = asRecord(overview['summary']);
      const actionCenter = asRecord(overview['actionCenter']);
      const programHealth = asRecord(overview['programHealth']);
      const lifecycle = asRecord(overview['lifecycle']);
      const activity = asRecord(overview['activity']);

      const workspaceId = asString(context['workspaceId']);
      if (!this.workspaceId && workspaceId) {
        this.workspaceId = workspaceId;
        this._storage.set('grc_active_workspace', this.workspaceId);
      }
      this.buildTenantContext(context);
      this.buildKpis(kpis, kpiTrends, summary, actionCenter, programHealth, lifecycle);
      this.buildHealthAlerts();
      this.buildActionItems(actionCenter);
      this.buildActivity(activity);
      this.buildCoverage(programHealth);
      this.computeMaturity(summary, lifecycle);
      this.loading.set(false);
      // Foundation-only bring-up: optional capability calls are gated.
      // Each underlying module/capability is OFF until its hard-move/build
      // gate completes. Calls below are skipped to avoid 4xx/5xx noise.
      if (isCapabilityActive('kpi')) {
        this.operationsSvc.getKpiCardIndicators().pipe(catchError(() => of({}))).subscribe((ind) => {
          this.cardIndicators.set(asRecord(ind));
        });
      }
      if (isCapabilityActive('connectorHealth')) {
        this.apiclientSvc.get('/connector-health').pipe(catchError(() => of({ summary: {} }))).subscribe((ch) => {
          const connectorHealth = asRecord(ch);
          const s = asRecord(connectorHealth['summary']);
          const connectors = asArray(connectorHealth['connectors']);
          this.connectorSummary.set({
            total: asNumber(s['total']),
            healthy: asNumber(s['healthy']),
            degraded: asNumber(s['degraded']),
            offline: asNumber(s['offline']),
            drafts: connectors.filter((c) => asString(c['status']) === 'draft').length,
          });
        });
      }
      if (isCapabilityActive('aiOs')) {
        this.apiclientSvc.get('/ai-os/next-best-actions?limit=5').pipe(catchError(() => of({ items: [] }))).subscribe((nba) => {
          const items = asArray(asRecord(nba)['items']).map((item) => ({
            id: asString(item['id']),
            type: asString(item['type']),
            title: asString(item['title']),
            description: asString(item['description']) || null,
            priority: asString(item['priority'], 'recommended'),
            entityType: asString(item['entityType']) || null,
            entityId: asString(item['entityId']) || null,
            route: asString(item['route']),
            source: asString(item['source']),
            dueDate: asString(item['dueDate']) || null,
          }));
          this.aiNextBestActions.set(items);
        });
      }
    });
  }

  refreshPage(): void {
    this.loadError.set(null);
    this.loading.set(true);
    this.loadOverview();
  }

  navigateTo(route: string): void {
    if (route) this.router.navigate([route]);
  }

  onKpiClick(card: KpiCardVM): void {
    if (card.route) this.router.navigate([card.route]);
  }

  onAlertClick(alert: HealthAlertVM): void {
    if (alert.route) this.router.navigate([alert.route]);
  }

  coverageSeverity(percentage: number): 'success' | 'warning' | 'danger' | 'info' {
    if (percentage >= 70) return 'success';
    if (percentage >= 40) return 'warning';
    if (percentage > 0) return 'info';
    return 'danger';
  }

  actionIcon(type: string): string {
    // Carbon icon names (@carbon/icons-angular)
    const icons: Record<string, string> = {
      overdue_task: 'time',
      pending_approval: 'checkmark--outline',
      evidence_request: 'folder--open',
      audit_request: 'search',
      upcoming_task: 'calendar',
      failing_control: 'close--outline',
      unowned_control: 'user--admin',
      stale_evidence: 'warning--alt',
    };
    return icons[type] || 'circle-dash';
  }

  actionPriorityClass(priority: string): string {
    return { critical: 'na-critical', attention: 'na-attention', upcoming: 'na-upcoming', recommended: 'na-recommended' }[priority] || '';
  }

  actionTypeLabel(type: string): string {
    const map: Record<string, string> = {
      overdue_task: this.i18n.translate('home.overdueTask'),
      pending_approval: this.i18n.translate('home.pendingApproval'),
      evidence_request: this.i18n.translate('home.evidenceRequest'),
      audit_request: this.i18n.translate('home.auditRequest'),
      upcoming_task: this.i18n.translate('home.upcomingTask'),
      failing_control: this.i18n.translate('home.failingControl'),
      unowned_control: this.i18n.translate('home.unownedControl'),
      stale_evidence: this.i18n.translate('home.staleEvidence'),
    };
    return map[type] || type;
  }

  moduleIcon(module: string): string {
    // Carbon icon names (@carbon/icons-angular)
    const map: Record<string, string> = {
      risk: 'warning', compliance: 'security', policy: 'document', governance: 'enterprise',
      audit: 'search', evidence: 'folder--open', control: 'security', incident: 'connect', workflow: 'flow',
    };
    return map[module] || 'circle-dash';
  }

  loadMoreActivity(): void {
    const cursor = this.activityCursor();
    if (!cursor) return;
    this.apiclientSvc.get(`/activity-feed?cursor=${cursor}&module=${this.activityFilterValue || ''}`).pipe(
      catchError(() => of(null))
    ).subscribe((res) => {
      if (!res) return;
      const activity = asRecord(res);
      const more: ActivityRowVM[] = asArray(activity['entries']).map((e) => ({
        id: asString(e['entry_id']), timestamp: asString(e['timestamp']), actorLabel: asString(e['user_id']),
        action: asString(e['action']), entityType: asString(e['entity_type']), entityLabel: asString(e['entity_id']),
      }));
      this.activityEntries.update(prev => [...prev, ...more]);
      this.activityCursor.set(asString(activity['nextCursor']) || null);
    });
  }

  onActivityFilterChange(mod: string): void {
    this.apiclientSvc.get(`/activity-feed?module=${mod}`).pipe(catchError(() => of(null))).subscribe((res) => {
      if (!res) return;
      const activity = asRecord(res);
      this.activityEntries.set(asArray(activity['entries']).map((e) => ({
        id: asString(e['entry_id']), timestamp: asString(e['timestamp']), actorLabel: asString(e['user_id']),
        action: asString(e['action']), entityType: asString(e['entity_type']), entityLabel: asString(e['entity_id']),
      })));
      this.activityCursor.set(asString(activity['nextCursor']) || null);
    });
  }

  // ── Builders ──────────────────────────────────────────────

  private buildTenantContext(ctx: GrcRecord): void {
    if (!ctx) return;
    const tc: TenantContext = {
      tenantId: asString(ctx.tenantId),
      orgName: asString(ctx.orgName, '—'),
      industry: asString(ctx.industry, '—'),
      orgSize: asString(ctx.orgSize, '—'),
      country: asString(ctx.country, '—'),
      regions: asStringArray(ctx.regions),
      workspaceId: asString(ctx.workspaceId),
      workspaceName: asString(ctx.workspaceName, '—'),
      frameworkCount: asNumber(ctx.frameworkCount),
      activeFrameworks: asStringArray(ctx.activeFrameworks),
      maturityTier: asString(ctx.maturityTier, this.i18n.translate('home.maturityInitial')),
      maturityAggregate: asNumber(ctx.maturityAggregate),
      auditMode: asBoolean(ctx.auditMode),
      lastSync: ctx.lastSync ? new Date(asString(ctx.lastSync)).toLocaleString() : '—',
      roleView: asString(ctx.roleView, 'viewer'),
    };
    this.tenantContext.set(tc);
    this.shell?.setTopbarCtx({
      orgName: tc.orgName,
      workspaceName: tc.workspaceName,
      frameworkCount: tc.frameworkCount,
      maturityTier: tc.maturityTier,
      maturityState: this.maturityState(),
      lastSync: tc.lastSync,
      auditMode: tc.auditMode,
    });
  }

  private buildKpis(kpis: GrcRecord, trends: GrcRecord, summary: GrcRecord, actionCenter: GrcRecord, programHealth: GrcRecord, lifecycle: GrcRecord): void {
    const cs = Math.round(asNumber(kpis?.complianceScore));
    const rbl = asRecord(summary?.risksByLevel);
    const highRisks = asNumber(rbl['critical']) + asNumber(rbl['high']);
    const overdueCount = asArray(actionCenter?.overdueTasks).length;
    const openFindings = asNumber(asRecord(programHealth?.openFindings)['count']);
    const auditReadinessPercent = lifecycle?.auditReadinessPercent;
    const auditReady = Math.round(asNumber(auditReadinessPercent));
    const ctrlCov = Math.round(asNumber(asRecord(programHealth?.controlEffectiveness)['percentage']));
    const hasFrameworks = asNumber(summary?.totalFrameworks) > 0;
    const hasControls = asNumber(summary?.totalControls) > 0;
    const hasAuditData = auditReadinessPercent !== undefined && auditReadinessPercent !== null && hasControls;

    const pctSev = (v: number, hasData: boolean): 'default' | 'danger' | 'warning' | 'success' => {
      if (!hasData && v === 0) return 'default';
      return v >= 70 ? 'success' : v >= 40 ? 'warning' : 'danger';
    };

    const pctColor = (v: number, hasData: boolean): { color: string; bg: string } => {
      if (!hasData && v === 0) return { color: 'var(--shell-text-secondary)', bg: 'var(--cds-layer-01)' };
      if (v >= 70) return { color: 'var(--cds-support-success)', bg: 'var(--shell-status-success-bg)' };
      if (v >= 40) return { color: 'var(--cds-support-warning)', bg: 'var(--shell-status-warning-bg)' };
      return { color: 'var(--cds-support-error)', bg: 'var(--shell-status-danger-bg)' };
    };

    const cntSev = (v: number): 'default' | 'danger' | 'warning' | 'success' =>
      v === 0 ? 'success' : v <= 3 ? 'warning' : 'danger';

    const cntColor = (v: number): { color: string; bg: string } => {
      if (v === 0) return { color: 'var(--cds-support-success)', bg: 'var(--shell-status-success-bg)' };
      if (v <= 3) return { color: 'var(--cds-support-warning)', bg: 'var(--shell-status-warning-bg)' };
      return { color: 'var(--cds-support-error)', bg: 'var(--shell-status-danger-bg)' };
    };

    const csColors = pctColor(cs, hasFrameworks);
    const ctrlColors = pctColor(ctrlCov, hasControls);
    const auditColors = pctColor(auditReady, hasAuditData);
    const riskColors = cntColor(highRisks);
    const overdueColors = cntColor(overdueCount);
    const findingsColors = cntColor(openFindings);

    // Vendor health score (from KPI API)
    const vendorHealth = Math.round(asNumber(kpis?.vendorHealthScore, 100));
    const vendorExposure = Math.round(asNumber(kpis?.vendorRiskExposure));
    const hasVendors = vendorHealth < 100 || vendorExposure > 0;
    const vendorColors = pctColor(vendorHealth, hasVendors);

    const allCards: KpiCardVM[] = [
      {
        id: 'complianceScore',
        labelEn: hasFrameworks ? 'Compliance Score' : 'Compliance Score — Not started',
        labelAr: hasFrameworks ? 'نسبة الامتثال' : 'نسبة الامتثال — لم يبدأ',
        value: cs + '%', icon: 'verified',
        ...csColors, route: '/compliance/overview',
        severity: pctSev(cs, hasFrameworks),
      },
      {
        id: 'highRisks',
        labelEn: 'High & Critical Risks', labelAr: 'المخاطر العالية والحرجة',
        value: highRisks, icon: 'exclamation-triangle',
        ...riskColors, route: '/risk/register',
        severity: cntSev(highRisks),
      },
      {
        id: 'vendorHealth',
        labelEn: hasVendors ? 'Vendor Health' : 'Vendor Health — No vendors',
        labelAr: hasVendors ? 'صحة الموردين' : 'صحة الموردين — لا يوجد موردين',
        value: vendorHealth + '%', icon: 'truck',
        ...vendorColors, route: '/vendor-hub',
        severity: pctSev(vendorHealth, hasVendors),
      },
      {
        id: 'overdueActions',
        labelEn: 'Overdue Actions', labelAr: 'الإجراءات المتأخرة',
        value: overdueCount, icon: 'clock',
        ...overdueColors, route: '/governance/actions',
        severity: cntSev(overdueCount),
      },
      {
        id: 'openFindings',
        labelEn: 'Open Findings', labelAr: 'النتائج المفتوحة',
        value: openFindings, icon: 'search',
        ...findingsColors, route: '/audit/findings',
        severity: cntSev(openFindings),
      },
      {
        id: 'controlsCoverage',
        labelEn: hasControls ? 'Controls Coverage' : 'Controls Coverage — Not started',
        labelAr: hasControls ? 'تغطية الضوابط' : 'تغطية الضوابط — لم يبدأ',
        value: ctrlCov + '%', icon: 'shield',
        ...ctrlColors, route: '/compliance/controls',
        severity: pctSev(ctrlCov, hasControls),
      },
      {
        id: 'auditReadiness',
        labelEn: hasAuditData ? 'Audit Readiness' : 'Audit Readiness — Not started',
        labelAr: hasAuditData ? 'الجاهزية للتدقيق' : 'الجاهزية للتدقيق — لم يبدأ',
        value: auditReady + '%', icon: 'check-square',
        ...auditColors, route: '/audit/overview',
        severity: pctSev(auditReady, hasAuditData),
      },
    ];

    const priority = this.roleConfig().widgetPriority;
    const sorted = priority
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is KpiCardVM => !!c)
      .slice(0, 7);

    this.kpis.set(sorted);
  }

  private buildHealthAlerts(): void {
    const alerts: HealthAlertVM[] = this.kpis()
      .filter(k => k.severity === 'danger' || k.severity === 'warning')
      .map(k => ({
        id: k.id,
        labelEn: k.labelEn,
        labelAr: k.labelAr,
        count: typeof k.value === 'number' ? k.value : 0,
        icon: k.icon,
        color: k.color,
        severity: k.severity as 'danger' | 'warning',
        route: k.route || '',
      }));
    this.healthAlerts.set(alerts);
  }

  private buildActionItems(ac: GrcRecord): void {
    if (!ac) { this.actionItems.set([]); return; }
    const items: ActionItem[] = [];
    for (const t of asArray(ac.overdueTasks))
      items.push({ id: asString(t['task_id']), title: asString(t['title']), type: 'overdue_task', priority: 'critical', dueDate: asString(t['due_date']) || null, entityType: asString(t['linked_entity_type']) || null, entityId: asString(t['linked_entity_id']) || null, status: asString(t['status']), route: '/governance/actions' });
    for (const c of asArray(ac.failingControls))
      items.push({ id: asString(c['control_id']), title: asString(c['title'], `Control ${asString(c['control_id'])}`), type: 'failing_control', priority: 'critical', dueDate: null, entityType: 'control', entityId: asString(c['control_id']) || null, status: asString(c['test_status']), route: '/compliance/controls' });
    for (const a of asArray(ac.pendingApprovals))
      items.push({ id: asString(a['approval_id']), title: `Approval: ${asString(a['step_id'])}`, type: 'pending_approval', priority: 'attention', dueDate: asString(a['sla_deadline']) || null, entityType: 'approval', entityId: asString(a['approval_id']) || null, status: asString(a['status']), route: '/governance/decisions' });
    for (const e of asArray(ac.evidenceRequests))
      items.push({ id: asString(e['schedule_id']), title: asString(e['reminder_text'], `Evidence for ${asString(e['control_id'])}`), type: 'evidence_request', priority: 'attention', dueDate: null, entityType: 'control', entityId: asString(e['control_id']) || null, status: 'pending', route: '/evidence/requests' });
    for (const s of asArray(ac.staleEvidence))
      items.push({ id: asString(s['evidence_id']), title: `Stale: ${asString(s['control_title'])}`, type: 'stale_evidence', priority: 'attention', dueDate: asString(s['expiry_date']) || null, entityType: 'evidence', entityId: asString(s['evidence_id']) || null, status: 'expired', route: '/evidence/expiry' });
    for (const u of asArray(ac.unownedControls))
      items.push({ id: asString(u['control_id']), title: `Unassigned: ${asString(u['title'])}`, type: 'unowned_control', priority: 'recommended', dueDate: null, entityType: 'control', entityId: asString(u['control_id']) || null, status: 'unowned', route: '/compliance/controls' });
    for (const a of asArray(ac.auditRequests))
      items.push({ id: asString(a['item_id']), title: `Audit: ${asString(a['control_node_id'])}`, type: 'audit_request', priority: 'upcoming', dueDate: null, entityType: 'assessment', entityId: asString(a['assessment_id']) || null, status: asString(a['status']), route: '/audit/plan' });
    for (const t of asArray(ac.upcomingTasks))
      items.push({ id: asString(t['task_id']), title: asString(t['title']), type: 'upcoming_task', priority: 'upcoming', dueDate: asString(t['due_date']) || null, entityType: asString(t['linked_entity_type']) || null, entityId: asString(t['linked_entity_id']) || null, status: asString(t['status']), route: '/governance/actions' });
    this.actionItems.set(items);
  }

  private buildActivity(act: GrcRecord): void {
    this.activityEntries.set(asArray(act?.entries).map((e) => ({
      id: asString(e['entry_id']), timestamp: asString(e['timestamp']), actorLabel: asString(e['user_id']),
      action: asString(e['action']), entityType: asString(e['entity_type']), entityLabel: asString(e['entity_id']),
    })));
    this.activityCursor.set(asString(act?.nextCursor) || null);
  }

  private buildCoverage(ph: GrcRecord): void {
    const coverage = Array.isArray(ph?.complianceCoverage)
      ? ph.complianceCoverage
          .map((item) => {
            if (!item || typeof item !== 'object') {
              return null;
            }
            const record = item as Record<string, unknown>;
            const frameworkId = typeof record['frameworkId'] === 'string' ? record['frameworkId'] : '';
            const name = typeof record['name'] === 'string' ? record['name'] : '';
            const percentageValue = record['percentage'];
            const percentage = typeof percentageValue === 'number' ? percentageValue : Number(percentageValue ?? 0);
            return { frameworkId, name, percentage: Number.isFinite(percentage) ? percentage : 0 };
          })
          .filter((item): item is { frameworkId: string; name: string; percentage: number } => item !== null)
      : [];
    this.complianceCoverage.set(coverage);
  }

  private computeMaturity(summary: GrcRecord, lifecycle: GrcRecord): void {
    const fwCountRaw = summary?.totalFrameworks;
    const ctrlCountRaw = summary?.totalControls;
    const auditReadyRaw = lifecycle?.auditReadinessPercent;
    const fwCount = typeof fwCountRaw === 'number' ? fwCountRaw : Number(fwCountRaw ?? 0);
    const ctrlCount = typeof ctrlCountRaw === 'number' ? ctrlCountRaw : Number(ctrlCountRaw ?? 0);
    const auditReady = typeof auditReadyRaw === 'number' ? auditReadyRaw : Number(auditReadyRaw ?? 0);
    if (fwCount === 0 || ctrlCount < 5) this.maturityState.set('new');
    else if (auditReady > 50) this.maturityState.set('mature');
    else this.maturityState.set('active');
  }
}
