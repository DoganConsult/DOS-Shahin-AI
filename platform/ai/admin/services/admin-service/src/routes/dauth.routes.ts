import { Router } from 'express';
import { q, one, exec } from '../db';
import { asyncHandler, paginate, audit, AdminRequest } from '../middleware';

const r = Router();

// ── password-policies ─────────────────────────────────
r.get('/password-policies', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.password_policies ORDER BY tenant_id') });
}));
r.get('/password-policies/:tenantId', asyncHandler(async (req, res) => {
  const row = await one('SELECT * FROM platform_dauth.password_policies WHERE tenant_id=$1', [req.params.tenantId]);
  res.json({ data: row });
}));
r.put('/password-policies/:tenantId', asyncHandler(async (req: AdminRequest, res) => {
  const p = req.body;
  await exec(
    `INSERT INTO platform_dauth.password_policies(tenant_id,min_length,require_upper,require_lower,require_digit,require_symbol,max_age_days,history_size,max_failed_attempts,lockout_seconds,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT(tenant_id) DO UPDATE SET min_length=EXCLUDED.min_length, require_upper=EXCLUDED.require_upper, require_lower=EXCLUDED.require_lower, require_digit=EXCLUDED.require_digit, require_symbol=EXCLUDED.require_symbol, max_age_days=EXCLUDED.max_age_days, history_size=EXCLUDED.history_size, max_failed_attempts=EXCLUDED.max_failed_attempts, lockout_seconds=EXCLUDED.lockout_seconds, updated_at=NOW()`,
    [req.params.tenantId, p.min_length ?? 12, p.require_upper ?? true, p.require_lower ?? true, p.require_digit ?? true, p.require_symbol ?? true, p.max_age_days ?? 90, p.history_size ?? 5, p.max_failed_attempts ?? 5, p.lockout_seconds ?? 900]
  );
  await audit('dauth', 'password_policy.update', req.actor, { type: 'password_policy', id: req.params.tenantId });
  res.json({ ok: true });
}));

// ── lockout-state ─────────────────────────────────────
r.get('/lockout-state', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.lockout_state WHERE locked_until IS NOT NULL AND locked_until > NOW() ORDER BY locked_until DESC LIMIT 200') });
}));
r.post('/lockout-state/:id/unlock', asyncHandler(async (req: AdminRequest, res) => {
  await exec('UPDATE platform_dauth.lockout_state SET locked_until=NULL, failed_count=0 WHERE id=$1', [req.params.id]);
  await audit('dauth', 'lockout.unlock', req.actor, { type: 'lockout', id: req.params.id });
  res.json({ ok: true });
}));

// ── api-keys ──────────────────────────────────────────
r.get('/api-keys', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1' : '';
  res.json({ data: await q(`SELECT key_id, tenant_id, user_id, display_name, scopes, status, last_used_at, created_at, expires_at FROM platform_dauth.api_keys ${where} ORDER BY created_at DESC`, tenant ? [tenant] : []) });
}));
r.delete('/api-keys/:id', asyncHandler(async (req: AdminRequest, res) => {
  await exec(`UPDATE platform_dauth.api_keys SET status='revoked' WHERE key_id=$1`, [req.params.id]);
  await audit('dauth', 'api_key.revoke', req.actor, { type: 'api_key', id: req.params.id });
  res.json({ ok: true });
}));

// ── oauth-clients ─────────────────────────────────────
r.get('/oauth-clients', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT client_id, tenant_id, client_name, redirect_uris, allowed_grants, allowed_scopes, status, created_at FROM platform_dauth.oauth_clients ORDER BY created_at DESC') });
}));
r.get('/oauth-grants', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  res.json({ data: await q('SELECT grant_id, client_id, user_id, tenant_id, grant_type, scopes, issued_at, expires_at, consumed_at FROM platform_dauth.oauth_grants ORDER BY issued_at DESC LIMIT $1 OFFSET $2', [limit, offset]) });
}));

// ── sessions ──────────────────────────────────────────
r.get('/sessions', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  res.json({ data: await q('SELECT * FROM platform_dauth.sessions ORDER BY COALESCE(created_at, NOW()) DESC LIMIT $1 OFFSET $2', [limit, offset]) });
}));
r.delete('/sessions/:id', asyncHandler(async (req: AdminRequest, res) => {
  await exec('DELETE FROM platform_dauth.sessions WHERE session_id=$1 OR id::text=$1', [req.params.id]);
  await audit('dauth', 'session.revoke', req.actor, { type: 'session', id: req.params.id });
  res.json({ ok: true });
}));

r.get('/active-sessions', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.active_sessions LIMIT 500') });
}));

// ── signing-keys ──────────────────────────────────────
r.get('/jwt-signing-keys', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.jwt_signing_keys ORDER BY created_at DESC') });
}));

// ── scim-api-tokens ───────────────────────────────────
r.get('/scim-api-tokens', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.scim_api_tokens ORDER BY created_at DESC') });
}));

// ── functional-roles + role-permissions ───────────────
r.get('/functional-roles', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.functional_roles ORDER BY role_code') });
}));
r.get('/permissions', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.permissions ORDER BY permission_code') });
}));
r.get('/role-permissions', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.role_permissions ORDER BY role_code, permission_code') });
}));

// ── sod-rules ─────────────────────────────────────────
r.get('/sod-rules', asyncHandler(async (_req, res) => {
  res.json({ data: await q('SELECT * FROM platform_dauth.sod_rules ORDER BY rule_code') });
}));

// ── mfa-recovery-codes ────────────────────────────────
r.get('/mfa-recovery-codes', asyncHandler(async (req, res) => {
  const tenant = req.query.tenant_id as string | undefined;
  const where = tenant ? 'WHERE tenant_id=$1 AND used_at IS NULL' : 'WHERE used_at IS NULL';
  res.json({ data: await q(`SELECT id, user_id, tenant_id, created_at FROM platform_dauth.mfa_recovery_codes ${where} ORDER BY created_at DESC LIMIT 500`, tenant ? [tenant] : []) });
}));

// ── authz-decision-log ───────────────────────────────
r.get('/authz-decision-log', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  res.json({ data: await q('SELECT * FROM platform_dauth.authz_decision_log ORDER BY COALESCE(decided_at, occurred_at, NOW()) DESC LIMIT $1 OFFSET $2', [limit, offset]) });
}));

// ── login-attempts ────────────────────────────────────
r.get('/login-attempts', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  res.json({ data: await q('SELECT * FROM platform_dauth.login_attempts ORDER BY attempted_at DESC NULLS LAST LIMIT $1 OFFSET $2', [limit, offset]) });
}));

// ── security-events ──────────────────────────────────
r.get('/security-events', asyncHandler(async (req, res) => {
  const { limit, offset } = paginate(req);
  res.json({ data: await q('SELECT * FROM platform_dauth.security_events ORDER BY occurred_at DESC NULLS LAST LIMIT $1 OFFSET $2', [limit, offset]) });
}));

// ── my-permissions (the FE contract /api/access/my-permissions) ─
r.get('/my-permissions', asyncHandler(async (req: AdminRequest, res) => {
  const userId = req.actor?.userId;
  const tenantId = req.actor?.tenantId || 'platform';
  const rows = await q(
    `SELECT DISTINCT p.permission_code, mp.module_code, mp.resource_type, mp.action_type
       FROM platform_dauth.user_role_assignments ura
       JOIN platform_dauth.role_permissions rp ON ura.role_code = rp.role_code
       JOIN platform_dauth.permissions p ON rp.permission_code = p.permission_code
       LEFT JOIN platform_dos.module_permissions mp ON mp.permission_code = p.permission_code
      WHERE ura.user_id = $1 AND (ura.tenant_id = $2 OR ura.tenant_id IS NULL)`,
    [userId, tenantId]
  ).catch(() => []);
  res.json({ data: { user_id: userId, tenant_id: tenantId, permissions: rows, roles: req.actor?.roles ?? [] } });
}));

// ── overview ──────────────────────────────────────────
r.get('/overview', asyncHandler(async (_req, res) => {
  const [sessions, apiKeys, oauthClients, sodRules, activeLockouts, authz24h] = await Promise.all([
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dauth.sessions`).catch(() => ({ c: '0' })),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dauth.api_keys WHERE status='active'`).catch(() => ({ c: '0' })),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dauth.oauth_clients WHERE status='active'`).catch(() => ({ c: '0' })),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dauth.sod_rules`).catch(() => ({ c: '0' })),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dauth.lockout_state WHERE locked_until > NOW()`).catch(() => ({ c: '0' })),
    one<{ c: string }>(`SELECT COUNT(*)::text c FROM platform_dauth.authz_decision_log WHERE COALESCE(decided_at, NOW()) > NOW() - INTERVAL '24 hours'`).catch(() => ({ c: '0' })),
  ]);
  res.json({
    data: {
      sessions: +sessions!.c, api_keys: +apiKeys!.c, oauth_clients: +oauthClients!.c,
      sod_rules: +sodRules!.c, active_lockouts: +activeLockouts!.c, authz_decisions_24h: +authz24h!.c,
    },
  });
}));

export default r;
