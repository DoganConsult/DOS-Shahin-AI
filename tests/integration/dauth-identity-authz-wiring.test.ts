import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

function abs(rel: string): string {
  return path.join(ROOT, rel);
}

function readText(rel: string): string {
  return fs.readFileSync(abs(rel), 'utf-8');
}

describe('DAuth identity + authz wiring (Keycloak ↔ DAuth ↔ OpenFGA ↔ Cerbos)', () => {
  describe('@dos/authz-ids canonical contract', () => {
    it('exposes CANONICAL_CLAIM_KEYS with all required dos_* keys', async () => {
      const mod: typeof import('@dos/authz-ids/claims') = await import(
        path.join(ROOT, 'packages/dos-authz-ids/dist/claims.js')
      );
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_user_id');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_tenant_id');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_workspace_id');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_product_code');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_role_profile');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_acr_required');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_risk_score');
      expect(mod.CANONICAL_CLAIM_KEYS).toContain('dos_bootstrap_status');
    });

    it('URN build/parse is round-trip safe', async () => {
      const mod: typeof import('@dos/authz-ids/urn') = await import(
        path.join(ROOT, 'packages/dos-authz-ids/dist/urn.js')
      );
      const t = '11111111-1111-7111-8111-111111111111';
      const urn = mod.buildResourceUrn({
        moduleCode: 'evidence' as any,
        tenantId: t as any,
        resourceId: 'abc',
      });
      expect(urn).toBe(`urn:dos:evidence:${t}:abc`);
      const parsed = mod.parseResourceUrn(urn);
      expect(parsed.moduleCode).toBe('evidence');
      expect(parsed.tenantId).toBe(t);
      expect(parsed.resourceId).toBe('abc');
    });

    it('FGA object builders match the committed model types', async () => {
      const mod: typeof import('@dos/authz-ids/fga') = await import(
        path.join(ROOT, 'packages/dos-authz-ids/dist/fga.js')
      );
      expect(mod.fgaUser('u-1' as any)).toBe('user:u-1');
      expect(mod.fgaTenant('t-1' as any)).toBe('tenant:t-1');
      expect(mod.fgaProduct('shahin-ai' as any)).toBe('product:shahin-ai');
      expect(mod.fgaModule('evidence' as any)).toBe('module:evidence');
      expect(mod.FGA_MODEL_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}\./);
    });

    it('reason-codes enum is closed and contains the SoD + RLS + RBAC denies', async () => {
      const mod: typeof import('@dos/authz-ids/reason-codes') = await import(
        path.join(ROOT, 'packages/dos-authz-ids/dist/reason-codes.js')
      );
      expect(mod.AUTHZ_REASON_CODES.DENY_SOD_VIOLATION).toBe('deny.sod_violation');
      expect(mod.AUTHZ_REASON_CODES.DENY_RLS_MISMATCH).toBe('deny.rls_mismatch');
      expect(mod.AUTHZ_REASON_CODES.DENY_TOKEN_ACR_LOW).toBe('deny.token_acr_low');
      expect(mod.AUTHZ_REASON_CODES.PERMIT_REBAC).toBe('permit.rebac');
    });
  });

  describe('Keycloak realm provisioning', () => {
    it('user-profile declares every dos_* attribute', () => {
      const raw = JSON.parse(readText('ops/keycloak/realm-config/dogan-user-profile.json')) as {
        attributes: { name: string }[];
      };
      const names = new Set(raw.attributes.map((a) => a.name));
      for (const k of [
        'dos_user_id',
        'dos_tenant_id',
        'dos_workspace_id',
        'dos_role_profile',
        'dos_bootstrap_status',
        'dos_product_code',
        'dos_acr_required',
        'dos_risk_score',
      ]) {
        expect(names, `user-profile must declare ${k}`).toContain(k);
      }
    });

    it('provision-dogan-realm.sh applies hardening, mappers, events, roles', () => {
      const s = readText('ops/keycloak/provision-dogan-realm.sh');
      expect(s).toMatch(/passwordPolicy=length\(12\)/);
      expect(s).toMatch(/revokeRefreshToken=true/);
      expect(s).toMatch(/refreshTokenMaxReuse=0/);
      // Mapper names are generated via the bash loop `mapper_name="map-$attr"`.
      // Validate the attribute list the loop iterates, not the expanded names.
      expect(s).toMatch(/dos_user_id dos_tenant_id dos_workspace_id dos_role_profile dos_product_code dos_acr_required dos_risk_score/);
      expect(s).toMatch(/mapper_name="map-\$attr"/);
      expect(s).toMatch(/eventsEnabled=true/);
      expect(s).toMatch(/incident_responder/);
      expect(s).toMatch(/compliance_officer/);
      expect(s).toMatch(/legal_hold_manager/);
    });

    it('bash provision script has valid syntax', () => {
      const r = spawnSync('bash', ['-n', abs('ops/keycloak/provision-dogan-realm.sh')]);
      expect(r.status, r.stderr?.toString()).toBe(0);
    });
  });

  describe('OpenFGA v2 model', () => {
    it('declares the enterprise spine: platform, product, module, tenant, resource', () => {
      const dsl = readText('platform/dauth/packages/core/adapters/openfga/model.v2.fga');
      for (const type of ['user', 'platform', 'product', 'module', 'tenant', 'team', 'department', 'project', 'folder', 'resource', 'evidence', 'control', 'policy', 'risk', 'report', 'incident', 'audit', 'delegation', 'breakglass']) {
        expect(dsl).toMatch(new RegExp(`\\btype ${type}\\b`));
      }
    });

    it('encodes SoD via `but not` on can_approve / can_sign_off', () => {
      const dsl = readText('platform/dauth/packages/core/adapters/openfga/model.v2.fga');
      expect(dsl).toMatch(/define can_approve: approver but not owner/);
      expect(dsl).toMatch(/define can_sign_off: reviewer but not tester/);
    });

    it('time-boxes conditioned_active grants', () => {
      const dsl = readText('platform/dauth/packages/core/adapters/openfga/model.v2.fga');
      // OpenFGA 1.5+ requires the current_time context parameter to be
      // declared explicitly in the condition signature.
      expect(dsl).toMatch(/condition conditioned_active\(current_time: timestamp, valid_from: timestamp, valid_to: timestamp\)/);
      expect(dsl).toMatch(/valid_from <= current_time && current_time < valid_to/);
    });

    it('assertions file exercises SoD self-approval denial', () => {
      const y = readText('platform/dauth/packages/core/adapters/openfga/model.v2.assertions.yaml');
      expect(y).toMatch(/approver cannot approve own evidence/);
      expect(y).toMatch(/can_approve: false/);
    });

    it('v2 metadata pins model version + contract source', () => {
      const meta = JSON.parse(readText('platform/dauth/packages/core/adapters/openfga/model.v2.meta.json'));
      expect(meta.modelVersion).toBe('2026.04.23.0');
      expect(meta.contract).toBe('@dos/authz-ids/fga');
    });
  });

  describe('Cerbos v2 policies', () => {
    it('dogan_enterprise derived roles define step-up, break-glass, legal-hold', () => {
      const y = readText('platform/dauth/packages/core/adapters/cerbos/policies/derived_roles.dogan.v2.yaml');
      expect(y).toMatch(/name: dogan_enterprise/);
      expect(y).toMatch(/- name: step_up_satisfied/);
      expect(y).toMatch(/- name: break_glass/);
      expect(y).toMatch(/- name: legal_hold_manager/);
      expect(y).toMatch(/- name: on_call/);
      expect(y).toMatch(/- name: high_assurance/);
    });

    it('incident/risk/audit/policy policies exist and enforce SoD', () => {
      for (const f of ['incident.yaml', 'risk.yaml', 'audit.yaml', 'policy.yaml']) {
        const y = readText(`platform/dauth/packages/core/adapters/cerbos/policies/${f}`);
        expect(y, f).toMatch(/DAUTH_DENY_SOD_SELF_APPROVAL|importDerivedRoles/);
        expect(y, f).toMatch(/importDerivedRoles:\s+- dogan_enterprise/);
      }
    });

    it('audit.yaml requires aal3 (high_assurance) on sign', () => {
      const y = readText('platform/dauth/packages/core/adapters/cerbos/policies/audit.yaml');
      expect(y).toMatch(/acr == "aal3"/);
    });
  });

  describe('Provisioning scripts (KC + FGA sync)', () => {
    it.each([
      'scripts/provision-keycloak-product.mjs',
      'scripts/provision-keycloak-tenant.mjs',
      'scripts/provision-keycloak-module-roles.mjs',
      'scripts/sync-registry-to-keycloak.mjs',
      'scripts/deploy-openfga-model-v2.mjs',
      'scripts/compile-cerbos-bundle.mjs',
    ])('%s parses as valid ES module', (rel) => {
      const r = spawnSync(process.execPath, ['--check', abs(rel)]);
      expect(r.status, r.stderr?.toString()).toBe(0);
    });

    it('sync-registry-to-keycloak handles registry.* event types', () => {
      const s = readText('scripts/sync-registry-to-keycloak.mjs');
      for (const t of [
        'registry.product.enabled',
        'registry.module.enabled',
        'registry.tenant.enabled',
        'registry.entitlement.granted',
      ]) expect(s).toContain(t);
    });

    it('provision-keycloak-product emits all dos_* protocol mappers', () => {
      const s = readText('scripts/provision-keycloak-product.mjs');
      for (const k of ['dos_user_id', 'dos_tenant_id', 'dos_product_code', 'dos_acr_required', 'dos_risk_score']) {
        expect(s).toContain(`'${k}'`);
      }
    });
  });

  describe('KC → DAuth webhook', () => {
    it('auth-service mounts /api/keycloak webhook router', () => {
      const s = readText('platform/dauth/services/auth-service/src/server.ts');
      expect(s).toMatch(/keycloakEventsRouter/);
      expect(s).toMatch(/path: '\/api\/keycloak'/);
    });

    it('keycloak_event_log migration exists with dedup index', () => {
      const s = readText('platform/dauth/migrations/public/20260423_0002_keycloak_event_log.sql');
      expect(s).toMatch(/CREATE TABLE IF NOT EXISTS platform_dauth\.keycloak_event_log/);
      expect(s).toMatch(/ux_keycloak_event_log_dedup/);
    });

    it('webhook route requires timing-safe secret comparison', () => {
      const s = readText('platform/dauth/services/auth-service/src/routes/keycloak-events.routes.ts');
      expect(s).toMatch(/X-DOS-Webhook-Secret/);
      expect(s).toMatch(/charCodeAt/);
      expect(s).toMatch(/ON CONFLICT \(realm_id, event_type, event_time/);
    });
  });

  describe('pm2 registry-sync worker', () => {
    it('ecosystem file spawns the sync script with interval + batch', () => {
      const s = readText('ops/ecosystem.registry-sync.config.js');
      expect(s).toMatch(/name: 'registry-sync'/);
      expect(s).toMatch(/sync-registry-to-keycloak\.mjs/);
      expect(s).toMatch(/--interval/);
      expect(s).toMatch(/--batch/);
    });
  });
});
