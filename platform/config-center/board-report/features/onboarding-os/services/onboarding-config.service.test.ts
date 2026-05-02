import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, 'onboarding-config.service.ts'), 'utf-8');

describe('OnboardingConfigService — fallback stages', () => {
  it('includes pain_profile stage', () => {
    expect(src).toContain("stageCode: 'pain_profile'");
  });

  it('has 18 fallback stages total', () => {
    const matches = src.match(/stageCode: '/g);
    expect(matches?.length).toBe(18);
  });

  it('fallback stage order matches backend canonical order', () => {
    const stageOrder = [
      'welcome', 'use_case', 'pack_selection', 'organization_identity',
      'regulatory_scope', 'org_structure', 'technology_landscape',
      'governance_model', 'risk_compliance_maturity', 'operating_model',
      'people_ownership', 'data_start_mode', 'ai_setup', 'personalization',
      'readiness_check', 'pain_profile', 'review_confirmation', 'provision_workspace',
    ];
    let lastIndex = -1;
    for (const code of stageOrder) {
      const idx = src.indexOf(`stageCode: '${code}'`);
      expect(idx).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });
});

describe('OnboardingConfigService — fallback provisioning steps', () => {
  it('includes product_key field in ProvisioningStepDefinition interface', () => {
    expect(src).toContain('product_key?: string');
  });

  it('has product_key on product-specific steps', () => {
    expect(src).toContain("code: 'seed_org_structure', product_key:");
    expect(src).toContain("code: 'seed_frameworks', product_key:");
    expect(src).toContain("code: 'seed_controls', product_key:");
    expect(src).toContain("code: 'seed_workflows', product_key:");
    expect(src).toContain("code: 'install_product_packs', product_key:");
  });

  it('does NOT have product_key on universal steps', () => {
    const createTenantLine = src.slice(
      src.indexOf("code: 'create_tenant_master'"),
      src.indexOf("code: 'create_workspace'")
    );
    expect(createTenantLine).not.toContain('product_key');
  });

  it('includes all 47 backend provisioning steps', () => {
    const stepCodes = [
      'create_tenant_master', 'create_workspace', 'allocate_tenant_schema',
      'run_tenant_migrations', 'seed_tenant_preferences', 'seed_integration_config',
      'seed_org_structure', 'apply_module_seed_mappings', 'seed_frameworks',
      'seed_controls', 'seed_risks', 'seed_policies', 'seed_evidence_plan',
      'seed_workflows', 'seed_dashboard_profile', 'seed_navigation',
      'seed_qiyas_starter', 'create_default_roles', 'seed_person_profiles',
      'seed_module_assignments', 'seed_teams_from_graph', 'seed_teams_and_raci',
      'seed_escalation_and_sla', 'wire_ownership_to_entities', 'seed_ninety_day_plan',
      'seed_sla_config', 'seed_initial_assessment', 'seed_audit_plan',
      'create_user_invitations', 'seed_governance_constitution', 'seed_governance_baseline',
      'seed_risk_baseline', 'run_post_seed_validations', 'activate_workspace',
      'start_ccm_engine', 'create_subscription', 'seed_automation_rules',
      'seed_initial_tasks', 'seed_feature_flags', 'generate_startup_checklist',
      'seed_enterprise_roles', 'seed_module_security', 'seed_department_managers',
      'seed_workflow_chains', 'install_product_packs', 'materialize_governance_context',
      'handover_complete',
    ];
    for (const code of stepCodes) {
      expect(src).toContain(`'${code}'`);
    }
  });
});
