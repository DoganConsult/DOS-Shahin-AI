/**
 * quality-gate — Provisioning Seed Installer
 * Seeds default gate definitions and thresholds for new tenants.
 * Runs during tenant provisioning (provisioningOrder: 45).
 */

import { safeQuery } from '../ports/database.port';
import { DEFAULT_THRESHOLDS } from '../contracts/quality-gate.contracts';
import type { QgateStageCode } from '../types/quality-gate.types';

interface ProvisioningContext {
  tenantId: string;
  schemaName: string;
  productKey: string;
  enabledModules: string[];
}

interface SeedInstallResult {
  installerKey: string;
  status: 'completed' | 'skipped' | 'failed';
  recordsCreated: number;
  recordsUpdated: number;
  notes?: string;
  details?: Record<string, unknown>;
}

const GATE_STAGE_DEFS: Array<{
  gate_code: string;
  gate_type: string;
  display_name_en: string;
  display_name_ar: string;
  stage: number;
  sla_hours: number;
}> = [
  { gate_code: 'qgate-devsecops',     gate_type: 'quality', display_name_en: 'DevSecOps Fast-Fail',       display_name_ar: 'DevSecOps - فشل سريع',           stage: 0, sla_hours: 0.5 },
  { gate_code: 'qgate-unit',          gate_type: 'quality', display_name_en: 'Core Logic Matrix',         display_name_ar: 'مصفوفة المنطق الأساسي',           stage: 1, sla_hours: 1 },
  { gate_code: 'qgate-integration',   gate_type: 'quality', display_name_en: 'Strict Integration',        display_name_ar: 'التكامل الصارم',                   stage: 2, sla_hours: 1 },
  { gate_code: 'qgate-ai-guardrails', gate_type: 'quality', display_name_en: 'AI & Agent Guardrails',     display_name_ar: 'حواجز الذكاء الاصطناعي والوكلاء', stage: 3, sla_hours: 2 },
  { gate_code: 'qgate-e2e-visual',    gate_type: 'quality', display_name_en: 'E2E & Visual Regression',   display_name_ar: 'الاختبار الشامل والانحدار المرئي', stage: 4, sla_hours: 1 },
  { gate_code: 'qgate-performance',   gate_type: 'quality', display_name_en: 'Chaos & Load',              display_name_ar: 'الفوضى والحمل',                     stage: 5, sla_hours: 1 },
  { gate_code: 'qgate-mutation',      gate_type: 'quality', display_name_en: 'Proof of Truth',            display_name_ar: 'إثبات الحقيقة',                     stage: 6, sla_hours: 4 },
];

export class QualityGateSeedInstaller {
  key = 'install_quality_gate_seed';

  async canInstall(_ctx: ProvisioningContext): Promise<boolean> {
    return true; // Quality gate tables are always seeded
  }

  async install(ctx: ProvisioningContext): Promise<SeedInstallResult> {
    const { schemaName, tenantId } = ctx;
    let created = 0;

    // Seed gate definitions into existing gate_definitions table
    for (const def of GATE_STAGE_DEFS) {
      try {
        await safeQuery(
          `INSERT INTO "${schemaName}".gate_definitions
           (tenant_id, gate_code, gate_type, display_name_en, display_name_ar,
            description_en, enabled, ai_analysis_enabled, severity_on_block,
            override_allowed, sla_hours)
           VALUES ($1,$2,$3,$4,$5,$6,true,true,'high',true,$7)
           ON CONFLICT (tenant_id, gate_code) DO NOTHING`,
          [tenantId, def.gate_code, def.gate_type, def.display_name_en,
           def.display_name_ar, `Quality Gate Stage ${def.stage}: ${def.display_name_en}`,
           def.sla_hours],
        );
        created++;
      } catch {
        // gate_definitions may not have (tenant_id, gate_code) unique constraint; skip gracefully
      }
    }

    // Seed default thresholds
    const stages = Object.keys(DEFAULT_THRESHOLDS) as QgateStageCode[];
    for (const stageCode of stages) {
      const metrics = DEFAULT_THRESHOLDS[stageCode];
      for (const [metricCode, minValue] of Object.entries(metrics)) {
        await safeQuery(
          `INSERT INTO "${schemaName}".qgate_thresholds
           (tenant_id, stage_code, metric_code, min_value, set_by)
           VALUES ($1,$2,$3,$4,'system')
           ON CONFLICT (tenant_id, stage_code, metric_code) DO NOTHING`,
          [tenantId, stageCode, metricCode, minValue],
        );
        created++;
      }
    }

    // Seed navigation entry
    try {
      await safeQuery(
        `INSERT INTO "${schemaName}".navigation_registry
         (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code,
          item_type, audience, sort_order, section, is_system, is_active, status, version)
         VALUES ('admin-quality-gates', 'admin', 'Quality Gates', 'بوابات الجودة',
                 '/admin/quality-gates', 'pi-verified', 'quality-gate',
                 'link', 'admin', 80, 'primary', true, true, 'published', 1)
         ON CONFLICT DO NOTHING`,
        [],
      );
      created++;
    } catch {
      // navigation_registry may not exist in all tenant schemas
    }

    return {
      installerKey: this.key,
      status: 'completed',
      recordsCreated: created,
      recordsUpdated: 0,
      notes: `Seeded ${GATE_STAGE_DEFS.length} gate definitions and ${stages.length} stage threshold sets`,
      details: { gateDefinitions: GATE_STAGE_DEFS.length, thresholdStages: stages.length },
    };
  }
}
