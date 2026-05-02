// @ts-nocheck
// ============================================
// Shahin — Quick GRC Accelerator Service
// Orchestrates the top 10 quick actions to
// achieve GRC process coverage rapidly.
// Each action wraps existing services and
// tracks completion per tenant.
//
// Actions:
//  1. Run AI-guided onboarding wizard
//  2. Activate framework auto-mapping
//  3. Seed controls from registry
//  4. Generate RACI matrix
//  5. Enable nudge engine
//  6. Run gap assessment
//  7. Set up workflow automation
//  8. Activate journey/roadmap engine
//  9. Enable auto-eval continuous monitoring
// 10. Activate contextual AI assistant
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AcceleratorAction {
  id: string;
  order: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  completedAt: string | null;
  error: string | null;
  category: 'setup' | 'governance' | 'monitoring' | 'ai';
}

export interface AcceleratorProgress {
  tenantId: string;
  actions: AcceleratorAction[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  startedAt: string | null;
  lastUpdatedAt: string | null;
}

export interface ActionExecutionResult {
  actionId: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}


// ── Action Definitions ─────────────────────────────────────────────────────

const ACTION_DEFINITIONS: Omit<AcceleratorAction, 'status' | 'completedAt' | 'error'>[] = [
  {
    id: 'onboarding-wizard',
    order: 1,
    titleEn: 'Run AI-Guided Onboarding',
    titleAr: 'تشغيل الإعداد الموجه بالذكاء الاصطناعي',
    descriptionEn: 'Complete the setup wizard to seed your org profile, sector, and applicable frameworks automatically.',
    descriptionAr: 'أكمل معالج الإعداد لتعبئة ملف المنظمة والقطاع والأطر التنظيمية المطبقة تلقائياً.',
    icon: 'pi pi-bolt',
    category: 'setup',
  },
  {
    id: 'framework-mapping',
    order: 2,
    titleEn: 'Activate Framework Auto-Mapping',
    titleAr: 'تفعيل الربط التلقائي للأطر التنظيمية',
    descriptionEn: 'Map your sector to applicable KSA regulations (NCA, SAMA, SDAIA, etc.) with cross-framework mappings.',
    descriptionAr: 'ربط قطاعك بالأنظمة السعودية المطبقة (الهيئة الوطنية، ساما، سدايا، إلخ) مع الربط المتقاطع.',
    icon: 'pi pi-sitemap',
    category: 'setup',
  },
  {
    id: 'seed-controls',
    order: 3,
    titleEn: 'Seed Controls from Registry',
    titleAr: 'تعبئة الضوابط من السجل',
    descriptionEn: 'Populate your control library with sector-appropriate controls from the pre-built registry.',
    descriptionAr: 'تعبئة مكتبة الضوابط بالضوابط المناسبة لقطاعك من السجل المُعد مسبقاً.',
    icon: 'pi pi-shield',
    category: 'governance',
  },
  {
    id: 'generate-raci',
    order: 4,
    titleEn: 'Generate RACI Matrix',
    titleAr: 'إنشاء مصفوفة المسؤوليات',
    descriptionEn: 'Auto-assign Responsible, Accountable, Consulted, and Informed roles to controls and processes.',
    descriptionAr: 'تعيين تلقائي لأدوار المسؤول والمحاسب والمستشار والمُبلَّغ للضوابط والعمليات.',
    icon: 'pi pi-users',
    category: 'governance',
  },
  {
    id: 'enable-nudges',
    order: 5,
    titleEn: 'Enable Nudge Engine',
    titleAr: 'تفعيل محرك التنبيهات الذكية',
    descriptionEn: 'Activate contextual reminders for overdue tasks, upcoming assessments, and evidence deadlines.',
    descriptionAr: 'تفعيل التذكيرات السياقية للمهام المتأخرة والتقييمات القادمة ومواعيد الأدلة.',
    icon: 'pi pi-bell',
    category: 'monitoring',
  },
  {
    id: 'gap-assessment',
    order: 6,
    titleEn: 'Run Gap Assessment',
    titleAr: 'تشغيل تقييم الفجوات',
    descriptionEn: 'Launch a compliance gap assessment using pre-built templates for an instant compliance score.',
    descriptionAr: 'إطلاق تقييم فجوات الامتثال باستخدام القوالب المُعدة مسبقاً للحصول على درجة امتثال فورية.',
    icon: 'pi pi-chart-bar',
    category: 'governance',
  },
  {
    id: 'workflow-automation',
    order: 7,
    titleEn: 'Set Up Workflow Automation',
    titleAr: 'إعداد أتمتة سير العمل',
    descriptionEn: 'Activate ready-made approval and review workflows for policies, risks, and incidents.',
    descriptionAr: 'تفعيل سير عمل الموافقة والمراجعة الجاهزة للسياسات والمخاطر والحوادث.',
    icon: 'pi pi-cog',
    category: 'governance',
  },
  {
    id: 'journey-roadmap',
    order: 8,
    titleEn: 'Activate Journey & Roadmap',
    titleAr: 'تفعيل الرحلة وخارطة الطريق',
    descriptionEn: 'Generate a phased compliance roadmap with milestones based on your gap assessment results.',
    descriptionAr: 'إنشاء خارطة طريق امتثال مرحلية مع معالم بناءً على نتائج تقييم الفجوات.',
    icon: 'pi pi-map',
    category: 'setup',
  },
  {
    id: 'auto-eval',
    order: 9,
    titleEn: 'Enable Continuous Monitoring',
    titleAr: 'تفعيل المراقبة المستمرة',
    descriptionEn: 'Turn on auto-evaluation of evidence quality and risk score recomputation on a schedule.',
    descriptionAr: 'تشغيل التقييم التلقائي لجودة الأدلة وإعادة حساب درجات المخاطر وفق جدول زمني.',
    icon: 'pi pi-eye',
    category: 'monitoring',
  },
  {
    id: 'contextual-ai',
    order: 10,
    titleEn: 'Activate Contextual AI Assistant',
    titleAr: 'تفعيل مساعد الذكاء الاصطناعي السياقي',
    descriptionEn: 'Enable AI-powered recommendations, proactive assistance, and smart suggestions across all modules.',
    descriptionAr: 'تفعيل التوصيات المدعومة بالذكاء الاصطناعي والمساعدة الاستباقية والاقتراحات الذكية عبر جميع الوحدات.',
    icon: 'pi pi-sparkles',
    category: 'ai',
  },
];


// ── Progress Persistence ───────────────────────────────────────────────────

/**
 * Get or initialize accelerator progress for a tenant.
 * Stores progress in tenant_config JSON under key 'quick_accelerator'.
 */
export async function getAcceleratorProgress(tenantId: string): Promise<AcceleratorProgress> {
  const schema = tenantSchema(tenantId);

  try {
    const result = await safeQuery(
      `SELECT value FROM "${schema}".tenant_config WHERE key = 'quick_accelerator'`,
      [],
    );

    if (result.rows.length > 0 && getFirstRow(result)?.value) {
      const stored = typeof getFirstRow(result)?.value === 'string'
        ? JSON.parse(getFirstRow(result)?.value)
        : getFirstRow(result)?.value;
      // Merge with latest definitions (in case new actions were added)
      return mergeWithDefinitions(tenantId, stored);
    }
  } catch {
    // tenant_config table may not have the key yet — initialize
  }

  return initializeProgress(tenantId);
}

function initializeProgress(tenantId: string): AcceleratorProgress {
  const actions: AcceleratorAction[] = ACTION_DEFINITIONS.map(def => ({
    ...def,
    status: 'pending',
    completedAt: null,
    error: null,
  }));

  return {
    tenantId,
    actions,
    completedCount: 0,
    totalCount: actions.length,
    percentComplete: 0,
    startedAt: null,
    lastUpdatedAt: null,
  };
}

function mergeWithDefinitions(tenantId: string, stored: AcceleratorProgress): AcceleratorProgress {
  const existingMap = new Map(stored.actions.map(a => [a.id, a]));
  const actions: AcceleratorAction[] = ACTION_DEFINITIONS.map(def => {
    const existing = existingMap.get(def.id);
    if (existing) return { ...def, status: existing.status, completedAt: existing.completedAt, error: existing.error };
    return { ...def, status: 'pending' as const, completedAt: null, error: null };
  });

  const completedCount = actions.filter(a => a.status === 'completed').length;
  return {
    tenantId,
    actions,
    completedCount,
    totalCount: actions.length,
    percentComplete: Math.round((completedCount / actions.length) * 100),
    startedAt: stored.startedAt,
    lastUpdatedAt: stored.lastUpdatedAt,
  };
}

async function saveProgress(tenantId: string, progress: AcceleratorProgress): Promise<void> {
  const schema = tenantSchema(tenantId);
  progress.lastUpdatedAt = new Date().toISOString();
  progress.completedCount = progress.actions.filter(a => a.status === 'completed').length;
  progress.percentComplete = Math.round((progress.completedCount / progress.totalCount) * 100);

  await safeQuery(
    `INSERT INTO "${schema}".tenant_config (key, value)
     VALUES ('quick_accelerator', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(progress)],
  );
}


// ── Action Executors ───────────────────────────────────────────────────────

/**
 * Execute a single accelerator action by ID.
 * Each action delegates to existing platform services.
 */
export async function executeAction(
  tenantId: string,
  userId: string,
  actionId: string,
): Promise<ActionExecutionResult> {
  const progress = await getAcceleratorProgress(tenantId);
  if (!progress.startedAt) progress.startedAt = new Date().toISOString();

  const action = progress.actions.find(a => a.id === actionId);
  if (!action) return { actionId, success: false, message: 'Unknown action ID' };
  if (action.status === 'completed') return { actionId, success: true, message: 'Already completed' };

  action.status = 'in_progress';
  action.error = null;
  await saveProgress(tenantId, progress);

  try {
    const result = await runActionLogic(tenantId, userId, actionId);

    action.status = 'completed';
    action.completedAt = new Date().toISOString();
    action.error = null;
    await saveProgress(tenantId, progress);

    await recordAudit({
      tenantId,
      userId,
      module: 'quick-accelerator',
      action: 'execute',
      entityType: 'accelerator_action',
      entityId: actionId,
      afterState: { status: 'completed', ...result.details },
    });

    await eventBus.publish(({
          eventType: 'accelerator.action_completed',
          tenantId,
          sourceService: 'quick-accelerator',
          entityType: 'accelerator_action',
          entityId: actionId,
          severity: 'info',
          payload: { actionId, userId, percentComplete: progress.percentComplete + Math.round(100 / progress.totalCount) },
        } as any));

    return result;
  } catch (err: unknown) {
    action.status = 'failed';
    action.error = toErrorMessage(err) || 'Execution failed';
    await saveProgress(tenantId, progress);
    return { actionId, success: false, message: toErrorMessage(err) || 'Execution failed' };
  }
}

/**
 * Skip an action (mark as skipped without executing).
 */
export async function skipAction(tenantId: string, actionId: string): Promise<ActionExecutionResult> {
  const progress = await getAcceleratorProgress(tenantId);
  const action = progress.actions.find(a => a.id === actionId);
  if (!action) return { actionId, success: false, message: 'Unknown action ID' };

  action.status = 'skipped';
  action.completedAt = new Date().toISOString();
  await saveProgress(tenantId, progress);
  return { actionId, success: true, message: 'Action skipped' };
}

/**
 * Reset all actions to pending.
 */
export async function resetProgress(tenantId: string): Promise<AcceleratorProgress> {
  const progress = initializeProgress(tenantId);
  await saveProgress(tenantId, progress);
  return progress;
}


// ── Action Logic Dispatcher ────────────────────────────────────────────────

async function runActionLogic(
  tenantId: string,
  userId: string,
  actionId: string,
): Promise<ActionExecutionResult> {
  switch (actionId) {
    case 'onboarding-wizard':
      return executeOnboardingWizard(tenantId, userId);
    case 'framework-mapping':
      return executeFrameworkMapping(tenantId, userId);
    case 'seed-controls':
      return executeSeedControls(tenantId, userId);
    case 'generate-raci':
      return executeGenerateRaci(tenantId, userId);
    case 'enable-nudges':
      return executeEnableNudges(tenantId, userId);
    case 'gap-assessment':
      return executeGapAssessment(tenantId, userId);
    case 'workflow-automation':
      return executeWorkflowAutomation(tenantId, userId);
    case 'journey-roadmap':
      return executeJourneyRoadmap(tenantId, userId);
    case 'auto-eval':
      return executeAutoEval(tenantId, userId);
    case 'contextual-ai':
      return executeContextualAI(tenantId, userId);
    default:
      return { actionId, success: false, message: `No executor for action: ${actionId}` };
  }
}

// ── Individual Action Executors ────────────────────────────────────────────

async function executeOnboardingWizard(tenantId: string, _userId: string): Promise<ActionExecutionResult> {
  const { getCompanyProfile, createCompanyProfile } = await import('../../../platform/dos/provisioning/setup-wizard.service');
  const existing = await getCompanyProfile(tenantId);
  if (existing) {
    const existingObj = existing as Record<string, unknown>;
    return { actionId: 'onboarding-wizard', success: true, message: 'Company profile already exists', details: { profileId: existingObj.profile_id || existingObj.profileId || existingObj.id } };
  }
  // Create a default company profile to kickstart the process
  const profile = await createCompanyProfile(tenantId, {
    companyName: 'My Organization',
    industrySector: 'general',
    employeeCount: '50-249',
    ksaRegion: 'KSA',
    subsidiaries: [],
  } as Record<string, unknown>);
  const profileObj = (profile ?? {}) as Record<string, unknown>;
  return { actionId: 'onboarding-wizard', success: true, message: 'Company profile created — complete the setup wizard for full configuration', details: { profileId: profileObj.profile_id || profileObj.profileId } };
}

async function executeFrameworkMapping(tenantId: string, _userId: string): Promise<ActionExecutionResult> {

  const { getApplicableRegulations, getSectors } = await import('../../../platform/dos/config/registry/registry.service');
  const { getCompanyProfile } = await import('../../../platform/dos/provisioning/setup-wizard.service');

  const profile = await getCompanyProfile(tenantId);
  const profileObj = (profile ?? {}) as Record<string, unknown>;
  const sectors = await getSectors();
  const sectorIds = profileObj.industrySector
    ? sectors.filter((s: GenericRow) => (s.name_en as string)?.toLowerCase().includes(String(profileObj.industrySector).toLowerCase())).map((s: GenericRow) => s.sector_id)
    : sectors.slice(0, 3).map((s: GenericRow) => s.sector_id);

  if (sectorIds.length === 0 && sectors.length > 0) {
    sectorIds.push(sectors[0].sector_id);
  }

  const regulations = await getApplicableRegulations(sectorIds);
  const schema = tenantSchema(tenantId);

  // Persist mapped frameworks to tenant config
  await safeQuery(
    `INSERT INTO "${schema}".tenant_config (key, value)
     VALUES ('mapped_frameworks', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ sectorIds, regulations, mappedAt: new Date().toISOString() })],
  );

  return {
    actionId: 'framework-mapping',
    success: true,
    message: `Mapped ${((regulations as Record<string, any[]>).mandatory)?.length || 0} mandatory and ${((regulations as Record<string, any[]>).recommended)?.length || 0} recommended frameworks`,
    details: { sectorIds, mandatoryCount: ((regulations as Record<string, any[]>).mandatory)?.length || 0, recommendedCount: ((regulations as Record<string, any[]>).recommended)?.length || 0 },
  };
}

async function executeSeedControls(tenantId: string, userId: string): Promise<ActionExecutionResult> {
  const schema = tenantSchema(tenantId);

  // Check if controls already exist
  const existing = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".controls`, []);
  if ((getFirstRow(existing)?.cnt || 0) > 0) {
    return { actionId: 'seed-controls', success: true, message: `${getFirstRow(existing)?.cnt} controls already exist`, details: { existingCount: getFirstRow(existing)?.cnt } };
  }

  // Seed controls from mapped frameworks' instrument_structure
  const configResult = await safeQuery(
    `SELECT value FROM "${schema}".tenant_config WHERE key = 'mapped_frameworks'`,
    [],
  );
  const mapped = getFirstRow(configResult)?.value;
  const frameworkData = typeof mapped === 'string' ? JSON.parse(mapped) : mapped;

  let seededCount = 0;
  if (frameworkData?.regulations?.mandatory) {
    for (const fw of frameworkData.regulations.mandatory) {
      const nodes = await safeQuery(
        `SELECT node_id, code, title_en, title_ar, level FROM instrument_structure
         WHERE instrument_id = $1 AND level = 4 LIMIT 50`,
        [fw.instrumentId || fw.instrument_id],
      );
      for (const node of nodes.rows) {
        try {
          await safeQuery(
            `INSERT INTO "${schema}".controls (control_id, title, description, framework_id, status, created_by)
             VALUES (gen_random_uuid(), $1, $2, $3, 'active', $4)
             ON CONFLICT (control_id) DO UPDATE SET
               title = EXCLUDED.title, description = EXCLUDED.description, framework_id = EXCLUDED.framework_id
             WHERE (controls.title, controls.description) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`,
            [node.title_en || node.code, `Control from ${node.code}`, fw.instrumentId || fw.instrument_id, userId],
          );
          seededCount++;
        } catch { /* skip duplicates */ }
      }
    }
  }

  return { actionId: 'seed-controls', success: true, message: `Seeded ${seededCount} controls from registry`, details: { seededCount } };
}

async function executeGenerateRaci(tenantId: string, _userId: string): Promise<ActionExecutionResult> {
  const { generateRaciMatrix, recommendTeamStructure } = await import('../../governance/services/misc/raci-generator.service');
  const { getCompanyProfile } = await import('../../../platform/dos/provisioning/setup-wizard.service');

  const profile = await getCompanyProfile(tenantId);
  const profileRaci = (profile ?? {}) as Record<string, unknown>;
  const companyProfile = {
    companySize: profileRaci.employee_count || profileRaci.employeeCount || '50-249',
    industry: profileRaci.industrySector || 'general',
    applicableFrameworks: [],
    hasPrivacyObligations: false,
  };

  const team = recommendTeamStructure(companyProfile as any);
  const teamObj = (team ?? {}) as Record<string, unknown>;
  const roles = Array.isArray(teamObj.roles) ? teamObj.roles : [];
  const raci = generateRaciMatrix(companyProfile as any, roles);

  // Persist RACI to tenant config
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".tenant_config (key, value)
     VALUES ('raci_matrix', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ matrix: raci, team, generatedAt: new Date().toISOString() })],
  );

  const raciArr = Array.isArray(raci) ? raci : [];
  return {
    actionId: 'generate-raci',
    success: true,
    message: `Generated RACI matrix with ${raciArr.length} entries and ${roles.length} roles`,
    details: { raciEntries: raciArr.length, roles: roles.length },
  };
}

async function executeEnableNudges(tenantId: string, userId: string): Promise<ActionExecutionResult> {
  const schema = tenantSchema(tenantId);

  // Enable nudge engine in tenant config
  await safeQuery(
    `INSERT INTO "${schema}".tenant_config (key, value)
     VALUES ('nudge_engine', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ enabled: true, enabledBy: userId, enabledAt: new Date().toISOString(), channels: ['in_app', 'email'] })],
  );

  // Generate initial nudges based on current state
  try {

    const { generateNudges, saveNudges } = await import('../../../platform/dos/notifications/nudge/nudge-engine.service');

    const { getRoadmap } = await import('../../platform/services/misc/roadmap-builder.service');
    const roadmap = await getRoadmap(tenantId);
    if (roadmap) {
      const nudges = generateNudges(roadmap as Record<string, unknown>, { currentModule: 'dashboard', userId, isFirstVisit: true } as Record<string, unknown>, new Date());
      if (nudges.length > 0) {
        await saveNudges(tenantId, nudges);
      }
    }
  } catch { /* nudge generation is best-effort */ }

  return { actionId: 'enable-nudges', success: true, message: 'Nudge engine enabled with in-app and email channels' };
}

async function executeGapAssessment(tenantId: string, userId: string): Promise<ActionExecutionResult> {

  const { createAssessment, getAssessments } = await import('../../platform/services/assessment/assessment.service');

  // Check for existing assessments
  const existing = await getAssessments(tenantId);
  if (existing.length > 0) {
    return { actionId: 'gap-assessment', success: true, message: `${existing.length} assessment(s) already exist`, details: { existingCount: existing.length } };
  }

  // Get first mapped framework to create assessment against
  const schema = tenantSchema(tenantId);
  const configResult = await safeQuery(
    `SELECT value FROM "${schema}".tenant_config WHERE key = 'mapped_frameworks'`,
    [],
  );
  const mapped = getFirstRow(configResult)?.value;
  const frameworkData = typeof mapped === 'string' ? JSON.parse(mapped) : mapped;

  const firstFramework = frameworkData?.regulations?.mandatory?.[0];
  if (!firstFramework) {
    return { actionId: 'gap-assessment', success: true, message: 'No mapped frameworks found — run framework mapping first', details: { hint: 'Execute framework-mapping action first' } };
  }

  const assessment = await createAssessment(tenantId, {
    frameworkId: firstFramework.instrumentId || firstFramework.instrument_id,
    title: `Initial Gap Assessment — ${firstFramework.name || firstFramework.title || 'Primary Framework'}`,
    createdBy: userId,
  });

  return {
    actionId: 'gap-assessment',
    success: true,
    message: `Gap assessment created with auto-generated items from framework controls`,
    details: { assessmentId: assessment.assessment_id, title: assessment.title },
  };
}

async function executeWorkflowAutomation(tenantId: string, userId: string): Promise<ActionExecutionResult> {
  const { executeWorkflowAutomation: runWorkflowAutomation } = await import('../../workflow/services/ops/workflow-automation.service');
  return runWorkflowAutomation(tenantId, userId);
}

async function executeJourneyRoadmap(tenantId: string, userId: string): Promise<ActionExecutionResult> {

  const { getRoadmap, createRoadmap } = await import('../../platform/services/misc/roadmap-builder.service');
  const { getCompanyProfile } = await import('../../../platform/dos/provisioning/setup-wizard.service');

  const existing = await getRoadmap(tenantId);
  if (existing) {
    return { actionId: 'journey-roadmap', success: true, message: 'Roadmap already exists', details: { phases: existing.phases?.length || 0 } };
  }

  const profile = await getCompanyProfile(tenantId);
  if (!profile) {
    return { actionId: 'journey-roadmap', success: true, message: 'No company profile found — run onboarding wizard first', details: { hint: 'Execute onboarding-wizard action first' } };
  }

  const { generateRoadmap } = await import('../../platform/services/misc/roadmap-builder.service');
  const roadmap = generateRoadmap(profile as Record<string, unknown>);
  await createRoadmap(tenantId, roadmap);

  // Initialize the guided journey
  try {

    const { initializeJourney } = await import('../../onboarding/services/journey/guided-journey-engine.service');
    await initializeJourney(tenantId, userId, roadmap.roadmapId || '');
  } catch { /* best-effort */ }

  const phases = Array.isArray(roadmap.phases) ? roadmap.phases : [];
  return {
    actionId: 'journey-roadmap',
    success: true,
    message: `Generated ${phases.length}-phase compliance roadmap`,
    details: { phases: phases.length, totalTasks: phases.reduce((sum: number, p: Record<string, unknown>) => sum + (Array.isArray(p.tasks) ? p.tasks.length : 0), 0) },
  };
}

async function executeAutoEval(tenantId: string, userId: string): Promise<ActionExecutionResult> {
  const schema = tenantSchema(tenantId);

  // Enable auto-eval in tenant config
  await safeQuery(
    `INSERT INTO "${schema}".tenant_config (key, value)
     VALUES ('auto_eval', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({ enabled: true, enabledBy: userId, enabledAt: new Date().toISOString(), intervalHours: 2 })],
  );

  // Enable auto-task generation

  const { updateAutoTaskConfig } = await import('../../platform/services/auto/auto-task.service');
  await updateAutoTaskConfig(tenantId, { enabled: true, evidenceDaysAhead: 7, riskDaysAhead: 7, vendorDaysAhead: 14, autoAssign: true });

  return { actionId: 'auto-eval', success: true, message: 'Continuous monitoring enabled — auto-eval every 2 hours, auto-task generation active' };
}

async function executeContextualAI(tenantId: string, userId: string): Promise<ActionExecutionResult> {
  const schema = tenantSchema(tenantId);

  // Enable contextual AI in tenant config
  await safeQuery(
    `INSERT INTO "${schema}".tenant_config (key, value)
     VALUES ('contextual_ai', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify({
      enabled: true,
      enabledBy: userId,
      enabledAt: new Date().toISOString(),
      features: ['proactive_assistance', 'smart_suggestions', 'risk_insights', 'compliance_tips'],
    })],
  );

  return { actionId: 'contextual-ai', success: true, message: 'Contextual AI assistant activated with proactive assistance, smart suggestions, risk insights, and compliance tips' };
}
